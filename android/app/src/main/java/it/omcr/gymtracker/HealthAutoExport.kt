package it.omcr.gymtracker

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.work.*
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Persist only payloads still to be written; WorkManager input has no health samples. */
object HealthAutoExport {
    private const val TAG = "gymtracker-health-export"
    private val lock = Any()
    private fun prefs(c: Context) = c.getSharedPreferences("gym_health_auto_v982",Context.MODE_PRIVATE)
    private fun valid(id: String) = id.matches(Regex("[a-zA-Z0-9_-]{1,100}"))
    @JvmStatic fun enqueue(c: Context, raw: String, revision: Long): Boolean {
        try {
            if (raw.length > 100000) return false
            val j = JSONObject(raw); val id = j.getString("id")
            if (!valid(id) || revision < 0) return false
            synchronized(lock) {
                val pref=prefs(c)
                if (!pref.getBoolean("enabled",true)) return false
                val prior = JSONObject(pref.getString("job:$id","{}") ?: "{}")
                if (prior.optLong("revision",-1)==revision) return true
                val envelope=JSONObject().put("revision",revision).put("state","scheduled").put("payload",j)
                if (!pref.edit().putString("job:$id",envelope.toString()).commit()) return false
                val work=OneTimeWorkRequestBuilder<HealthAutoExportWorker>()
                    .setInputData(workDataOf("id" to id,"revision" to revision))
                    .setInitialDelay(8,TimeUnit.SECONDS).addTag(TAG).build()
                WorkManager.getInstance(c).enqueueUniqueWork("gym-health-$id",ExistingWorkPolicy.REPLACE,work)
                return true
            }
        } catch (_: Exception) { return false }
    }
    @JvmStatic fun status(c: Context,id: String): String = synchronized(lock) {
        if (!valid(id)) return@synchronized "{}"
        try {
            val j=JSONObject(prefs(c).getString("job:$id","{}") ?: "{}")
            j.remove("payload");j.toString()
        } catch (_:Exception) { "{}" }
    }
    @JvmStatic fun setEnabled(c: Context,enabled: Boolean) {
        synchronized(lock) {
            val p=prefs(c);val e=p.edit().putBoolean("enabled",enabled)
            if(!enabled) for(k in p.all.keys) if(k.startsWith("job:")) e.remove(k)
            e.commit()
            if(!enabled) WorkManager.getInstance(c).cancelAllWorkByTag(TAG)
        }
    }
    @JvmStatic fun forget(c: Context,id:String,revision:Long) {
        synchronized(lock) {
            if(!valid(id))return
            val p=prefs(c);val j=JSONObject(p.getString("job:$id","{}") ?: "{}")
            if(j.optLong("revision",-1)==revision) p.edit().remove("job:$id").commit()
        }
    }
    internal fun payload(c: Context,id:String,revision:Long):JSONObject? = synchronized(lock) {
        val p=prefs(c); if(!valid(id)||!p.getBoolean("enabled",true)) return@synchronized null
        val j=JSONObject(p.getString("job:$id","{}") ?: "{}")
        if(j.optLong("revision",-1)!=revision) null else j.optJSONObject("payload")
    }
    internal fun finish(c:Context,id:String,revision:Long,result:JSONObject) {
        synchronized(lock) {
            val p=prefs(c);if(!p.getBoolean("enabled",true)||!valid(id))return
            val j=JSONObject(p.getString("job:$id","{}") ?: "{}")
            if(j.optLong("revision",-1)!=revision)return
            p.edit().putString("job:$id",JSONObject().put("revision",revision).put("state","done").put("result",result.put("id",id).put("action","export")).toString()).commit()
        }
    }
}

class HealthAutoExportWorker(context: Context,params:WorkerParameters):CoroutineWorker(context,params) {
    override suspend fun doWork():Result {
        val id=inputData.getString("id")?:return Result.failure()
        val revision=inputData.getLong("revision",-1)
        val c=applicationContext
        val payload=HealthAutoExport.payload(c,id,revision)?:return Result.success()
        val result=try {
            if(HealthConnectClient.getSdkStatus(c)!=HealthConnectClient.SDK_AVAILABLE) JSONObject().put("status","foreground_required").put("error","Connessione Salute non disponibile")
            else {
                val client=HealthConnectClient.getOrCreate(c)
                val granted=client.permissionController.getGrantedPermissions()
                if(client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND)!=HealthConnectFeatures.FEATURE_STATUS_AVAILABLE || HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND !in granted) JSONObject().put("status","foreground_required").put("error","Per sincronizzare con l'app chiusa, autorizza accesso in background. Riprovo quando apri GymTracker.")
                else HealthExportEngine.export(c,client,granted,payload)
            }
        } catch(e:CancellationException){throw e}
        catch(e:Exception){JSONObject().put("status","retry").put("error","Esportazione in background non riuscita ("+e.javaClass.simpleName+"). Riprovo dall'app.")}
        HealthAutoExport.finish(c,id,revision,result)
        return Result.success()
    }
}
