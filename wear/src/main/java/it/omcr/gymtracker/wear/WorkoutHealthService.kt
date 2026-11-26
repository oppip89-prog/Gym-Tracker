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
            if (stepData != null && stepData.total in 0L..100000L) {
                val t = stepData.end.toEpochMilli()
                if (t >= stepsEnd && t >= startedAt && t <= endNow + 60000) { steps=stepData.total; stepsEnd=t }
            }
            val state = update.exerciseStateInfo.state
            val checkpoint = update.activeDurationCheckpoint
            // Health Services 1.0.0 exposes the active duration through the checkpoint.
            // A missing checkpoint does not establish a new native duration.
            if (checkpoint != null) {
                val duration = checkpoint.activeDuration.toMillis() +
                    (if (state == ExerciseState.ACTIVE) (endNow - checkpoint.time.toEpochMilli()).coerceAtLeast(0L) else 0L)
                if (duration in 0L..21660000L) {
                    activeMs = duration
                    activeAnchor = SystemClock.elapsedRealtime()
                    durationEnd = endNow
                }
            } else if (tracking && state != ExerciseState.ACTIVE) {
                // Freeze the last local clock estimate; do not mark it as a fresh native reading.
                activeMs = durationMs()
            }
            tracking = state == ExerciseState.ACTIVE && durationEnd > 0L

            if (update.exerciseStateInfo.state.isEnded && owned) {
                owned = false; ending = true; tracking = false
                flush(true); completeSave(); status = "Rilevazione terminata"; stopSelf()
            }
        }
    }
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "SAVE") {
            val id=intent.getStringExtra("sessionId") ?: ""
            if (id.isEmpty() || id != session || !running || ending) { savingSession=""; return START_NOT_STICKY }
            finishCommand=JSONObject().put("kind","finish").put("sessionId",id).put("allowIncomplete",intent.getBooleanExtra("allowIncomplete",false))
            savingSession=id
            getSharedPreferences("WatchActivity", MODE_PRIVATE).edit().putString("manualHealthStop",id).apply()
            if (owned) scope.launch { finish() } // Otherwise the start coroutine will handle it before/after native start.
            return START_NOT_STICKY
        }
        if (intent?.action == "STOP") {
            getSharedPreferences("WatchActivity", MODE_PRIVATE).edit().putString("manualHealthStop",session).apply()
            scope.launch { finish() }; return START_NOT_STICKY
        }
        if (running) return START_NOT_STICKY
        session = intent?.getStringExtra("sessionId") ?: ""
        if (session.isBlank() || WatchStore.displaySnapshot(this).optString("sessionId") != session) { stopSelf(); return START_NOT_STICKY }
        segment = UUID.randomUUID().toString(); startedAt = System.currentTimeMillis()
        running = true; bpm = 0; kcal = -1.0; lastBpmAt = 0; avgBpm=0; minBpm=0; maxBpm=0; steps=-1L; activeMs=0; activeAnchor=0; tracking=false; exerciseLabel=""; status = "Avvio sessione sportiva..."
        try {
            val manager = getSystemService(NotificationManager::class.java) ?: error("Notifiche non disponibili")
            manager.createNotificationChannel(NotificationChannel("gym_health", "Allenamento GymTracker", NotificationManager.IMPORTANCE_LOW))
            val open = PendingIntent.getActivity(this, 0, Intent(this, WatchActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val stop = PendingIntent.getService(this, 1, Intent(this, WorkoutHealthService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            startForeground(980, Notification.Builder(this, "gym_health").setSmallIcon(android.R.drawable.ic_media_play).setContentTitle("GymTracker - Allenamento").setContentText("Rilevazione battito e calorie").setContentIntent(open).addAction(Notification.Action.Builder(null, "Ferma sensori", stop).build()).setOngoing(true).build())
        } catch (e: Exception) { status = "Permessi rilevazione non disponibili"; running = false; stopSelf(); return START_NOT_STICKY }
        beginJob = scope.launch {
            try {
                val info = withTimeout(12000) { client.getCurrentExerciseInfoAsync().await() }
                // UNKNOWN means there is no active exercise. Do not interrupt Samsung Health or another workout.
                if (info.exerciseType != ExerciseType.UNKNOWN) { status = "Altro allenamento attivo: terminalo prima"; completeSave(); stopSelf(); return@launch }
                val capabilities = withTimeout(12000) { client.getCapabilitiesAsync().await() }
                val type = listOf(ExerciseType.STRENGTH_TRAINING, ExerciseType.WEIGHTLIFTING, ExerciseType.WORKOUT).firstOrNull { it in capabilities.supportedExerciseTypes } ?: error("Allenamento non supportato")
                val supported = capabilities.getExerciseTypeCapabilities(type).supportedDataTypes
                val metrics: Set<DataType<*, *>> = setOf<DataType<*, *>>(DataType.HEART_RATE_BPM, DataType.HEART_RATE_BPM_STATS, DataType.CALORIES_TOTAL, DataType.STEPS_TOTAL).filter { it in supported }.toSet()
                if (metrics.isEmpty()) error("Nessun dato supportato")
                exerciseLabel = if (type == ExerciseType.STRENGTH_TRAINING || type == ExerciseType.WEIGHTLIFTING) "Allenamento forza" else "Allenamento generico"
                // Recheck before the start: do not supersede another app's active workout.
                if (client.getCurrentExerciseInfoAsync().await().exerciseType != ExerciseType.UNKNOWN) { status="Altro allenamento attivo: terminalo prima"; stopSelf(); return@launch }
                if (finishCommand != null) { finish(); return@launch }
                client.setUpdateCallback(callback); registered = true
                client.startExerciseAsync(ExerciseConfig(exerciseType = type, dataTypes = metrics, isAutoPauseAndResumeEnabled = false, isGpsEnabled = false)).await()
                owned = true; status = "Sessione sportiva attiva"
                if (finishCommand != null) { finish(); return@launch }
                var lastFlush = System.currentTimeMillis()
                while (isActive && !ending) {
                    delay(3000)
                    if (WatchStore.displaySnapshot(this@WorkoutHealthService).optString("sessionId") != session || WatchStore.finishPending(this@WorkoutHealthService,session) || System.currentTimeMillis() - startedAt > 6 * 3600000L) { finish(); break }
                    WatchStore.retryPending(this@WorkoutHealthService)
                    if (System.currentTimeMillis() - lastFlush >= 60000) { flush(false); lastFlush = System.currentTimeMillis() }
                }
            } catch (e: TimeoutCancellationException) { status="Health Services non risponde"; finish(false) }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) { status = "Rilevazione non riuscita: " + e.javaClass.simpleName; finish(false) }
        }
        return START_NOT_STICKY
    }
    private fun flush(final: Boolean) {
        if (session.isEmpty() || (final && finalSent)) return
        // Keep batches below the existing 4 KiB wire limit. Ack/replay use existing offline queue.
        do {
            val batch = samples.entries.take(80).map { it.key to it.value }
            val hasCalories = kcal >= 0 && metricEnd > 0 && (kcal != lastSentKcal || final)
            val signature = "$statsEnd/$avgBpm/$minBpm/$maxBpm/$stepsEnd/$steps/$durationEnd/$activeMs"
            if (batch.isEmpty() && !hasCalories && !final && signature == lastMetricsSignature) return
            val payload = JSONObject().put("kind", "health_batch").put("sessionId", session).put("segment", segment).put("segmentStart", startedAt).put("samples", JSONArray(batch.map { JSONArray(listOf(it.first, it.second)) })).put("recordedUntil", minOf(System.currentTimeMillis(), cutoff)).put("final", final && samples.size <= 80)
            if (hasCalories) payload.put("totalKcal", kcal).put("caloriesUntil",metricEnd).put("caloriesFrom",metricStart)
            if (statsEnd > 0) payload.put("heartStats",JSONObject().put("until",statsEnd).put("avg",avgBpm).put("min",minBpm).put("max",maxBpm))
            if (stepsEnd > 0 && steps >= 0) payload.put("steps",steps).put("stepsUntil",stepsEnd)
            if (durationEnd > 0) payload.put("activeMs",activeMs).put("durationUntil",durationEnd)
            payload.put("exerciseLabel",exerciseLabel)
            if (!WatchStore.postCommand(this, payload)) { status = "Coda Watch piena: collega il telefono"; return }
            batch.forEach { samples.remove(it.first) }; lastSentKcal = kcal; lastMetricsSignature=signature
        } while (samples.isNotEmpty())
        if (final) finalSent = true
    }
    private suspend fun finish(normal: Boolean = true) {
        if (ending) return
        ending = true; cutoff = System.currentTimeMillis()
        if (owned) {
            try { withTimeout(12000) { client.endExerciseAsync().await() } } catch (_: Exception) { }
            // Allow the final update to arrive. If it already stopped this service, no extra write.
            delay(1000); owned = false
        }
        if (running) flush(true)
        completeSave()
        if (normal) status = "Rilevazione terminata"
        stopSelf()
    }
    private fun completeSave() {
        val command=finishCommand ?: return
        finishCommand=null
        if (WatchStore.displaySnapshot(this).optString("sessionId") == command.optString("sessionId") && !WatchStore.finishPending(this,session)) {
            if (!WatchStore.postCommand(this,command)) status="Coda piena: riprova il salvataggio"
        }
        savingSession=""
    }
    override fun onDestroy() {
        if (owned) client.endExerciseAsync()
        if (registered) client.clearUpdateCallbackAsync(callback)
        if (running && (samples.isNotEmpty() || kcal >= 0)) flush(true)
        completeSave(); savingSession=""; running = false; tracking=false; scope.cancel(); stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy()
    }
}
