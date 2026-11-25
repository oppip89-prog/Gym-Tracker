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

/** Explicitly started on the Watch; stops when the phone closes the session. */
class WorkoutHealthService : Service() {
    companion object {
        @JvmField @Volatile var running = false
        @JvmField @Volatile var status = "Rilevazione non attiva"
        @JvmField @Volatile var bpm = 0
        @JvmField @Volatile var kcal = -1.0
        @JvmField @Volatile var lastBpmAt = 0L
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
    private val samples = sortedMapOf<Long, Int>()
    private var lastSentKcal = -1.0
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
                    val bucket = t / 15000 * 15000
                    samples[maxOf(bucket, startedAt)] = v
                    if (t >= lastBpmAt) { bpm = v; lastBpmAt = t }
                }
            }
            val calories = update.latestMetrics.getData(DataType.CALORIES_TOTAL)?.total
            if (calories != null && calories.isFinite() && calories >= 0 && calories < 10000) kcal = maxOf(kcal, calories)
            if (update.exerciseStateInfo.state.isEnded && owned) {
                owned = false; ending = true
                flush(true); status = "Rilevazione terminata"; stopSelf()
            }
        }
    }
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { scope.launch { finish() }; return START_NOT_STICKY }
        if (running) return START_NOT_STICKY
        session = intent?.getStringExtra("sessionId") ?: ""
        if (session.isBlank() || WatchStore.displaySnapshot(this).optString("sessionId") != session) { stopSelf(); return START_NOT_STICKY }
        segment = UUID.randomUUID().toString(); startedAt = System.currentTimeMillis()
        running = true; bpm = 0; kcal = -1.0; lastBpmAt = 0; status = "Avvio sensori..."
        try {
            val manager = getSystemService(NotificationManager::class.java) ?: error("Notifiche non disponibili")
            manager.createNotificationChannel(NotificationChannel("gym_health", "Allenamento GymTracker", NotificationManager.IMPORTANCE_LOW))
            val open = PendingIntent.getActivity(this, 0, Intent(this, WatchActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val stop = PendingIntent.getService(this, 1, Intent(this, WorkoutHealthService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            startForeground(980, Notification.Builder(this, "gym_health").setSmallIcon(android.R.drawable.ic_media_play).setContentTitle("GymTracker - Allenamento").setContentText("Rilevazione battito e calorie").setContentIntent(open).addAction(Notification.Action.Builder(null, "Termina", stop).build()).setOngoing(true).build())
        } catch (e: Exception) { status = "Permessi rilevazione non disponibili"; running = false; stopSelf(); return START_NOT_STICKY }
        beginJob = scope.launch {
            try {
                val info = client.getCurrentExerciseInfoAsync().await()
                // UNKNOWN means there is no active exercise. Do not interrupt Samsung Health or another workout.
                if (info.exerciseType != ExerciseType.UNKNOWN) { status = "Altro allenamento attivo: terminalo prima"; stopSelf(); return@launch }
                val capabilities = client.getCapabilitiesAsync().await()
                val type = listOf(ExerciseType.STRENGTH_TRAINING, ExerciseType.WEIGHTLIFTING, ExerciseType.WORKOUT).firstOrNull { it in capabilities.supportedExerciseTypes } ?: error("Allenamento non supportato")
                val supported = capabilities.getExerciseTypeCapabilities(type).supportedDataTypes
                val metrics: Set<DataType<*, *>> = setOf<DataType<*, *>>(DataType.HEART_RATE_BPM, DataType.CALORIES_TOTAL).filter { it in supported }.toSet()
                if (metrics.isEmpty()) error("Nessun dato supportato")
                client.setUpdateCallback(callback); registered = true
                client.startExerciseAsync(ExerciseConfig(exerciseType = type, dataTypes = metrics, isAutoPauseAndResumeEnabled = false, isGpsEnabled = false)).await()
                owned = true; status = "Rilevazione attiva"
                var lastFlush = System.currentTimeMillis()
                while (isActive && !ending) {
                    delay(3000)
                    if (WatchStore.displaySnapshot(this@WorkoutHealthService).optString("sessionId") != session || System.currentTimeMillis() - startedAt > 6 * 3600000L) { finish(); break }
                    WatchStore.retryPending(this@WorkoutHealthService)
                    if (System.currentTimeMillis() - lastFlush >= 60000) { flush(false); lastFlush = System.currentTimeMillis() }
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { status = "Rilevazione non riuscita: " + e.javaClass.simpleName; finish(false) }
        }
        return START_NOT_STICKY
    }
    private fun flush(final: Boolean) {
        if (session.isEmpty() || (final && finalSent)) return
        // Keep batches below the existing 4 KiB wire limit. Ack/replay use existing offline queue.
        do {
            val batch = samples.entries.take(80).map { it.key to it.value }
            val hasCalories = kcal >= 0 && (kcal != lastSentKcal || final)
            if (batch.isEmpty() && !hasCalories && !final) return
            val payload = JSONObject().put("kind", "health_batch").put("sessionId", session).put("segment", segment).put("segmentStart", startedAt).put("samples", JSONArray(batch.map { JSONArray(listOf(it.first, it.second)) })).put("recordedUntil", minOf(System.currentTimeMillis(), cutoff)).put("final", final && samples.size <= 80)
            if (hasCalories) payload.put("totalKcal", kcal)
            if (!WatchStore.postCommand(this, payload)) { status = "Coda Watch piena: collega il telefono"; return }
            batch.forEach { samples.remove(it.first) }; lastSentKcal = kcal
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
        if (normal) status = "Rilevazione terminata"
        stopSelf()
    }
    override fun onDestroy() {
        if (owned) client.endExerciseAsync()
        if (registered) client.clearUpdateCallbackAsync(callback)
        if (running && (samples.isNotEmpty() || kcal >= 0)) flush(true)
        running = false; scope.cancel(); stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy()
    }
}
