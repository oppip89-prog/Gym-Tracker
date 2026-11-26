package it.omcr.gymtracker

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CancellationException
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.Duration
import java.time.ZoneId

internal object HealthExportEngine {
    private suspend inline fun <reified T: Record> read(client: HealthConnectClient, from: Instant, to: Instant): List<T> {
        val records = mutableListOf<T>(); var token: String? = null
        do {
            val page = client.readRecords(ReadRecordsRequest<T>(timeRangeFilter = TimeRangeFilter.between(from, to), pageToken = token))
            records.addAll(page.records); token = page.pageToken
        } while (token != null)
        return records
    }
    private fun bounds(j: JSONObject): Pair<Instant, Instant> {
        val from = Instant.ofEpochMilli(j.getLong("start")); val to = Instant.ofEpochMilli(j.getLong("end"))
        require(from < to && Duration.between(from, to).toHours() < 24 && to <= Instant.now().plusSeconds(60))
        return from to to
    }
    suspend fun export(context: android.content.Context, c: HealthConnectClient, g: Set<String>, j: JSONObject): JSONObject {
        val id = j.getString("id"); require(id.matches(Regex("[a-zA-Z0-9_-]{1,100}")))
        val out = JSONObject().put("id", id)
        if (HealthPermission.getWritePermission(ExerciseSessionRecord::class) !in g || HealthPermission.getReadPermission(ExerciseSessionRecord::class) !in g)
            return out.put("status", "permission").put("error", "Servono i permessi di lettura e scrittura allenamenti per evitare duplicati.")
        val (from,to) = bounds(j); val recordId = "gymtracker-$id"
        val scanFrom = from.minus(Duration.ofHours(12)); val scanTo = minOf(to.plus(Duration.ofHours(1)), Instant.now())
        val others = read<ExerciseSessionRecord>(c, scanFrom, scanTo).filter { it.startTime < to && it.endTime > from }
        val own = others.firstOrNull { it.metadata.dataOrigin.packageName == context.packageName && it.metadata.clientRecordId == recordId }
        if (own == null && others.isNotEmpty()) return out.put("status", "overlap").put("error", "Esiste gia un allenamento sovrapposto in Connessione Salute: esportazione non eseguita per evitare duplicati.")
        val zone = ZoneId.systemDefault(); val revision = j.optLong("version",System.currentTimeMillis()).coerceAtLeast(1L)
        val notes = j.optString("notes").take(4000)
        // Upsert only our own record. The same session ID prevents duplicate exports on retry.
        if (own == null || own.notes != notes) {
            c.insertRecords(listOf(ExerciseSessionRecord(startTime = from, startZoneOffset = zone.rules.getOffset(from), endTime = to, endZoneOffset = zone.rules.getOffset(to), metadata = Metadata.activelyRecorded(device = Device(type = Device.TYPE_PHONE), clientRecordId = recordId, clientRecordVersion = revision), exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, title = "GymTracker " + j.optString("workout").take(100), notes = notes)))
        }
        val verified = read<ExerciseSessionRecord>(c, scanFrom, scanTo).firstOrNull { it.metadata.dataOrigin.packageName == context.packageName && it.metadata.clientRecordId == recordId }
            ?: return out.put("status","retry").put("error","Scrittura inviata, ma la seduta non e ancora leggibile in Connessione Salute. Riprovo automaticamente.")
        out.put("status", "exported").put("recordId",verified.metadata.id)
        // Never write imported Health Connect or Samsung Health samples back to the provider.
        val raw = j.optJSONArray("watchSamples") ?: JSONArray()
        val samples = (0 until minOf(raw.length(),2400)).mapNotNull { i ->
            val a = raw.optJSONArray(i) ?: return@mapNotNull null
            val t = Instant.ofEpochMilli(a.optLong(0,0)); val bpm = a.optLong(1,0)
            if (t >= from && t < to && bpm in 30L..240L) HeartRateRecord.Sample(t,bpm) else null
        }.distinctBy { it.time }.sortedBy { it.time }
        if (samples.isEmpty()) return out.put("heartStatus","no_data")
        if (HealthPermission.getWritePermission(HeartRateRecord::class) !in g) return out.put("heartStatus","permission")
        try {
            val hrFrom = samples.first().time; val hrTo = minOf(to, samples.last().time.plusMillis(1))
            if (hrFrom < hrTo) {
                c.insertRecords(listOf(HeartRateRecord(startTime = hrFrom, startZoneOffset = zone.rules.getOffset(hrFrom), endTime = hrTo, endZoneOffset = zone.rules.getOffset(hrTo), samples = samples, metadata = Metadata.activelyRecorded(device = Device(type = Device.TYPE_WATCH), clientRecordId = "$recordId-hr", clientRecordVersion = revision))))
                out.put("heartStatus","written")
            } else out.put("heartStatus","no_data")
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { out.put("heartStatus","error") }
        return out
    }
}
