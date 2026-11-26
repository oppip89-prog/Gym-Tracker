package it.omcr.gymtracker.wear

import android.app.*
import android.content.Intent
import android.os.*
import androidx.health.services.client.HealthServices
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.data.*
import kotlinx.coroutines.*
import kotlinx.coroutines.guava.await
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.math.roundToInt

/** Native Wear OS exercise recording, independent of the screen. */
class WorkoutHealthService : Service() {
    companion object {
        @JvmField @Volatile var running = false
        @JvmField @Volatile var status = "Rilevazione non attiva"
        @JvmField @Volatile var bpm = 0
        @JvmField @Volatile var kcal = -1.0
        @JvmField @Volatile var lastBpmAt = 0L
        @JvmField @Volatile var avgBpm = 0
        @JvmField @Volatile var maxBpm = 0
        @JvmField @Volatile var minBpm = 0
        @JvmField @Volatile var steps = -1L
        @JvmField @Volatile var activeMs = 0L
        @JvmField @Volatile var activeAnchor = 0L
        @JvmField @Volatile var tracking = false
        @JvmField @Volatile var savingSession = ""
        @JvmField @Volatile var exerciseLabel = ""
        @JvmStatic fun durationMs(): Long = activeMs + if (tracking && activeAnchor > 0) (SystemClock.elapsedRealtime()-activeAnchor).coerceAtLeast(0) else 0L
    }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val client by lazy { HealthServices.getClient(this).exerciseClient }
    private var session = ""
    private var segment = ""
    private var startedAt = 0L
    private var owned = false
    private var ending = false
    private var registered = false
    private var beginJob: Job? = null
    private var finishCommand: JSONObject? = null
    private val samples = java.util.TreeMap<Long, Int>()
    private var lastSentKcal = -1.0
    private var metricEnd = 0L
    private var metricStart = 0L
    private var statsEnd = 0L
    private var stepsEnd = 0L
    private var durationEnd = 0L
    private var totalHeart = 0L
    private var heartCount = 0L
    private var lastCountedAt = 0L
    private var lastMetricsSignature = ""
    private var cutoff = Long.MAX_VALUE
    private var finalSent = false
    private val bootTime = System.currentTimeMillis() - SystemClock.elapsedRealtime()
    private val callback = object : ExerciseUpdateCallback {
        override fun onRegistered() { }
        override fun onRegistrationFailed(throwable: Throwable) { status = "Health Services non disponibile"; scope.launch { finish() } }
        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) { }
        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) { }
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            if (!running) return
            for (point in update.latestMetrics.getData(DataType.HEART_RATE_BPM)) {
                val t = bootTime + point.timeDurationFromBoot.toMillis(); val v = point.value.roundToInt()
                if (v in 30..240 && t >= startedAt && t <= cutoff && t <= System.currentTimeMillis() + 60000) {
                    // At most one sample per 15-second interval; preserve the most recent point.
                    val bucket = t / 15000
                    // Retain the actual reading time, not a synthesized time bucket.
                    val previous = samples.floorKey(t)
                    if (previous != null && previous / 15000 == bucket) samples.remove(previous)
                    if (samples.ceilingKey(t)?.let { it / 15000 == bucket } != true) samples[t] = v
                    if (t > lastCountedAt) {
                        totalHeart += v; heartCount++; lastCountedAt = t
                        if (statsEnd == 0L) {
                            avgBpm = (totalHeart.toDouble()/heartCount).roundToInt()
                            maxBpm = maxOf(maxBpm,v); minBpm = if (minBpm == 0) v else minOf(minBpm,v)
                        }
                    }
                    if (t >= lastBpmAt) { bpm = v; lastBpmAt = t }
                }
            }
            val endNow = System.currentTimeMillis()
            val calories = update.latestMetrics.getData(DataType.CALORIES_TOTAL)
            if (calories != null && calories.total.isFinite() && calories.total in 0.0..10000.0) {
                val t = calories.end.toEpochMilli()
                if (t >= metricEnd && t >= startedAt && t <= endNow + 60000) { kcal = calories.total; metricEnd = t; metricStart=calories.start.toEpochMilli() }
            }
            val hr = update.latestMetrics.getData(DataType.HEART_RATE_BPM_STATS)
            if (hr != null && hr.min.isFinite() && hr.average.isFinite() && hr.max.isFinite() && hr.min in 30.0..240.0 && hr.max in hr.min..240.0 && hr.average in hr.min..hr.max) {
                val t = hr.end.toEpochMilli()
                if (t >= statsEnd && t >= startedAt && t <= endNow + 60000) { avgBpm=hr.average.roundToInt(); minBpm=hr.min.roundToInt(); maxBpm=hr.max.roundToInt(); statsEnd=t }
            }
            val stepData = update.latestMetrics.getData(DataType.STEPS_TOTAL)
