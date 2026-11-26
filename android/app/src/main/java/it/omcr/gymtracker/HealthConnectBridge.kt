package it.omcr.gymtracker

import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.Duration
import java.time.ZoneId

/** Foreground, explicitly authorized Health Connect access. No network backend. */
class HealthConnectBridge(private val activity: ComponentActivity, private val callback: java.util.function.Consumer<String>) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val permissions = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getWritePermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(BodyFatRecord::class),
        HealthPermission.getReadPermission(LeanBodyMassRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class)
    )
    private val launcher = activity.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
        action("status", "{}")
    }
    private var busy = false
    fun close() { scope.cancel() }
    private fun send(action: String, data: JSONObject) {
        data.put("action", action); callback.accept(data.toString())
    }
    fun action(action: String, payload: String) {
        val requestId = try { JSONObject(payload).optString("id") } catch (_: Exception) { "" }
        fun failure(message: String): JSONObject = JSONObject().put("id",requestId).put("error",message)
        if (busy) { send(action, failure("Operazione in corso; riprova.")); return }
        scope.launch {
            busy = true
            try {
                val sdk = HealthConnectClient.getSdkStatus(activity)
                if (sdk != HealthConnectClient.SDK_AVAILABLE) {
                    send(action, failure(if (sdk == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) "Installa o aggiorna Connessione Salute dalle impostazioni Android / Play Store." else "Connessione Salute non disponibile su questo telefono.").put("available", false))
                    return@launch
                }
                val client = HealthConnectClient.getOrCreate(activity)
                val granted = client.permissionController.getGrantedPermissions()
                val backgroundAvailable = client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
                val requested = if (backgroundAvailable) permissions + HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND else permissions
                when (action) {
                    "status" -> send(action, JSONObject().put("available", true).put("granted", JSONArray(granted.intersect(requested).toList())).put("requested", requested.size).put("backgroundAvailable",backgroundAvailable))
                    "authorize" -> { if (granted.containsAll(requested)) send("status", JSONObject().put("available", true).put("granted", JSONArray(requested.toList())).put("requested", requested.size).put("backgroundAvailable",backgroundAvailable)) else launcher.launch(requested) }
                    "profile" -> send(action, profile(client, granted))
                    "session" -> send(action, sessionMetrics(client, granted, JSONObject(payload)))
                    "export" -> send(action, HealthExportEngine.export(activity, client, granted, JSONObject(payload)))
                    else -> send(action, JSONObject().put("error", "Azione sconosciuta"))
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { send(action, failure("Operazione non riuscita: controlla permessi, disponibilita e intervallo dei dati (" + e.javaClass.simpleName + ").")) }
            finally { busy = false }
        }
    }
    private suspend inline fun <reified T: Record> read(client: HealthConnectClient, from: Instant, to: Instant): List<T> {
        val records = mutableListOf<T>(); var token: String? = null
        do {
            val page = client.readRecords(ReadRecordsRequest<T>(timeRangeFilter = TimeRangeFilter.between(from, to), pageToken = token))
            records.addAll(page.records); token = page.pageToken
        } while (token != null)
        return records
    }
    private suspend fun profile(c: HealthConnectClient, g: Set<String>): JSONObject {
        val now = Instant.now(); val month = now.minus(Duration.ofDays(29)); val week = now.minus(Duration.ofDays(14))
        val out = JSONObject().put("fetchedAt", now.toEpochMilli()); val errors = JSONArray()
        suspend fun section(name: String, allowed: Boolean, work: suspend () -> Unit) {
            if (!allowed) return
            try { work() } catch (e: CancellationException) { throw e } catch (e: Exception) { errors.put(name) }
        }
        fun value(key: String, n: Number, at: Instant, source: String) { out.put(key, JSONObject().put("value", n).put("at", at.toEpochMilli()).put("source", source)) }
        section("peso", HealthPermission.getReadPermission(WeightRecord::class) in g) {
            val records = read<WeightRecord>(c, month, now).sortedBy { it.time }
            records.lastOrNull()?.let { latest ->
                val source = latest.metadata.dataOrigin.packageName
                value("weight", latest.weight.inKilograms, latest.time, source)
                val first = records.firstOrNull { it.metadata.dataOrigin.packageName == source && Duration.between(it.time, latest.time).toHours() >= 24 }
                if (first != null) value("weightDelta", latest.weight.inKilograms - first.weight.inKilograms, latest.time, source)
            }
        }
        section("grasso", HealthPermission.getReadPermission(BodyFatRecord::class) in g) {
            read<BodyFatRecord>(c, month, now).maxByOrNull { it.time }?.let { value("bodyFat", it.percentage.value, it.time, it.metadata.dataOrigin.packageName) }
        }
        section("massa magra", HealthPermission.getReadPermission(LeanBodyMassRecord::class) in g) {
            read<LeanBodyMassRecord>(c, month, now).maxByOrNull { it.time }?.let { value("leanMass", it.mass.inKilograms, it.time, it.metadata.dataOrigin.packageName) }
        }
        section("sonno", HealthPermission.getReadPermission(SleepSessionRecord::class) in g) {
            read<SleepSessionRecord>(c, now.minus(Duration.ofHours(48)), now).filter { it.endTime <= now }.maxByOrNull { it.endTime }?.let {
                value("sleepMinutes", Duration.between(it.startTime, it.endTime).toMinutes(), it.endTime, it.metadata.dataOrigin.packageName)
            }
        }
        section("battito a riposo", HealthPermission.getReadPermission(RestingHeartRateRecord::class) in g) {
            val records = read<RestingHeartRateRecord>(c, week, now)
            val latest = records.maxByOrNull { it.time }
            if (latest != null) {
                val source = latest.metadata.dataOrigin.packageName
                value("restingHr", latest.beatsPerMinute, latest.time, source)
                val zone = ZoneId.systemDefault(); val day = latest.time.atZone(zone).toLocalDate()
                val daily = records.filter { it.metadata.dataOrigin.packageName == source && it.time.atZone(zone).toLocalDate() < day }.groupBy { it.time.atZone(zone).toLocalDate() }.values.map { v -> v.map { it.beatsPerMinute }.average() }
                if (daily.size >= 3) value("restingBaseline", daily.average(), latest.time, source)
            }
        }
        section("passi", HealthPermission.getReadPermission(StepsRecord::class) in g) {
            val start = now.atZone(ZoneId.systemDefault()).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant()
            if (start < now) c.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(start, now)))[StepsRecord.COUNT_TOTAL]?.let { value("steps", it, now, "Health Connect") }
        }
        return out.put("errors", errors).put("available", true)
    }
    private fun bounds(j: JSONObject): Pair<Instant, Instant> {
        val from = Instant.ofEpochMilli(j.getLong("start")); val to = Instant.ofEpochMilli(j.getLong("end"))
        require(from < to && Duration.between(from, to).toHours() < 24 && to <= Instant.now().plusSeconds(60))
        return from to to
    }
    private suspend fun sessionMetrics(c: HealthConnectClient, g: Set<String>, j: JSONObject): JSONObject {
        val (from, to) = bounds(j); val out = JSONObject().put("id", j.getString("id")); val errors = JSONArray()
        if (HealthPermission.getReadPermission(HeartRateRecord::class) in g) try {
            val groups = read<HeartRateRecord>(c, from, to).filter { it.metadata.dataOrigin.packageName != activity.packageName }.groupBy { it.metadata.dataOrigin.packageName }
            val data = groups.entries.map { entry -> entry.key to entry.value.flatMap { it.samples }.filter { it.time >= from && it.time <= to }.distinctBy { it.time }.sortedBy { it.time } }.filter { it.second.isNotEmpty() }
            val preferred = data.firstOrNull { it.first == "com.sec.android.app.shealth" } ?: data.maxByOrNull { it.second.size }
            if (preferred != null) {
                val samples = preferred.second.groupBy { it.time.toEpochMilli() / 15000 }.values.map { it.last() }
                out.put("samples", JSONArray(samples.map { JSONArray(listOf(it.time.toEpochMilli(), it.beatsPerMinute)) })).put("heartSource", preferred.first)
            }
        } catch (e: CancellationException) { throw e } catch (e: Exception) { errors.put("battito") }
        if (HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class) in g) try {
            c.aggregate(AggregateRequest(setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL), TimeRangeFilter.between(from, to)))[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.let { out.put("activeKcal", it.inKilocalories) }
        } catch (e: CancellationException) { throw e } catch (e: Exception) { errors.put("calorie attive") }
        return out.put("errors", errors)
    }
}
