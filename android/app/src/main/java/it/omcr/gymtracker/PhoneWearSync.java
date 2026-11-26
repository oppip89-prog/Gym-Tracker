package it.omcr.gymtracker;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Wearable;

import org.json.JSONArray;
import org.json.JSONObject;

/** Persisted phone-side inbox and Wear Data Layer synchronization.
 * The authoritative training data stays in Gym Tracker's localStorage.
 * Pending commands are durably queued and applied by the WebView bridge.
 */
public final class PhoneWearSync {
    private static final Object LOCK = new Object();
    private static final String PREF = "gym_wear_sync_v1";
    private static final String SESSION = "/gymtracker/session";
    private static final String PENDING = "pending";
    private static final String SNAPSHOT = "snapshot";
    private static final String TERMINAL = "terminal";

    private PhoneWearSync() { }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public static void publishSnapshot(Context context, String json) {
        if (json == null || json.length() > 90000) return;
        synchronized (LOCK) {
            prefs(context).edit().putString(SNAPSHOT, json).commit();
            sendProjectedState(context);
        }
    }

    public static String snapshotJson(Context context) { return prefs(context).getString(SNAPSHOT, "{}"); }

    private static JSONArray pending(Context context) {
        try { return new JSONArray(prefs(context).getString(PENDING, "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    public static String getPendingJson(Context context) {
        synchronized (LOCK) { return pending(context).toString(); }
    }

    public static String statusJson(Context context) {
        synchronized (LOCK) {
            JSONObject status = new JSONObject();
            try {
                status.put("pending", pending(context).length());
                status.put("hasSnapshot", !prefs(context).getString(SNAPSHOT, "").isEmpty());
            } catch (Exception ignored) { }
            return status.toString();
        }
    }

    public static void receiveCommand(Context context, String raw) {
        String id;
        synchronized (LOCK) {
            try {
                JSONObject cmd = new JSONObject(raw);
                id = cmd.optString("id", "");
                if (!id.matches("[a-zA-Z0-9-]{8,120}") || raw.length() > 4096) return;
                JSONObject processed = terminal(context);
                if (processed.has(id)) {
                    sendAck(context, id, processed.optString(id), "Comando gia gestito");
                    return;
                }
                JSONArray queue = pending(context);
                for (int i = 0; i < queue.length(); i++) {
                    if (id.equals(queue.getJSONObject(i).optString("id"))) return;
                }
                if (queue.length() >= 150) {
                    sendAck(context, id, "rejected", "Coda piena. Apri Gym Tracker sul telefono.");
                    return;
                }
                queue.put(cmd);
                if (!prefs(context).edit().putString(PENDING, queue.toString()).commit()) return;
                sendProjectedState(context);
                // Do not send a queued ACK: its async write could overwrite a
                // later applied ACK on the same DataItem path.
            } catch (Exception e) { return; }
        }
        MainActivity.onWearInboxChanged();
    }

    private static JSONObject terminal(Context context) {
        try { return new JSONObject(prefs(context).getString(TERMINAL, "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }

    public static void ackApplied(Context context, String id, String status, String message) {
        if (id == null || !id.matches("[a-zA-Z0-9-]{8,120}")) return;
        if (!"applied".equals(status) && !"rejected".equals(status)) return;
        synchronized (LOCK) {
            JSONArray old = pending(context);
            JSONArray remaining = new JSONArray();
            for (int i = 0; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item != null && !id.equals(item.optString("id"))) remaining.put(item);
            }
            JSONObject processed = terminal(context);
            try {
                processed.put(id, status);
                if (processed.length() > 300) {
                    java.util.Iterator<String> names = processed.keys();
                    if (names.hasNext()) processed.remove(names.next());
                }
            } catch (Exception ignored) { }
            prefs(context).edit().putString(PENDING, remaining.toString())
                    .putString(TERMINAL, processed.toString()).commit();
            sendAck(context, id, status, message == null ? "" : message);
            sendProjectedState(context);
        }
    }

    private static void sendAck(Context context, String id, String status, String message) {
        try {
            PutDataMapRequest request = PutDataMapRequest.create("/gymtracker/ack/" + id);
            DataMap map = request.getDataMap();
            map.putString("id", id);
            map.putString("status", status);
            map.putString("message", message);
            map.putLong("time", System.currentTimeMillis());
            Wearable.getDataClient(context.getApplicationContext()).putDataItem(request.asPutDataRequest().setUrgent());
        } catch (Exception ignored) { }
    }

    private static void sendProjectedState(Context context) {
        try {
            String authoritative = prefs(context).getString(SNAPSHOT, "");
            if (authoritative.isEmpty()) return;
            JSONObject projected = new JSONObject(authoritative);
            JSONArray queue = pending(context);
            JSONArray projectedIds = new JSONArray();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject command = queue.optJSONObject(i);
                if (command != null) { projectCommand(projected, command); projectedIds.put(command.optString("id")); }
            }
            projected.put("pendingCount", queue.length());
            projected.put("projectedIds", projectedIds);
            PutDataMapRequest request = PutDataMapRequest.create(SESSION);
            request.getDataMap().putString("payload", projected.toString());
            request.getDataMap().putLong("time", System.currentTimeMillis());
            Wearable.getDataClient(context.getApplicationContext()).putDataItem(request.asPutDataRequest().setUrgent());
        } catch (Exception ignored) { }
    }

    /** Projection is display-only: it never alters workout history. */
    public static void projectCommand(JSONObject snapshot, JSONObject cmd) {
        if (!snapshot.optString("sessionId").equals(cmd.optString("sessionId"))) return;
        try {
            String kind = cmd.optString("kind");
            if ("warmup_general".equals(kind)) {
                JSONObject ex = snapshot.getJSONArray("exercises").optJSONObject(cmd.optInt("exi", -1));
                if (ex == null || (ex.optJSONArray("sets") != null && ex.optJSONArray("sets").length() > 0)) return;
                ex.put("done", true);
                snapshot.put("preferredExercise", cmd.optInt("exi") + 1);
            } else if ("confirm".equals(kind) || "warmup_set".equals(kind)) {
                int exi = cmd.getInt("exi"), si = cmd.getInt("si");
                JSONArray exercises = snapshot.getJSONArray("exercises");
                if (exi < 0 || exi >= exercises.length()) return;
                JSONObject ex = exercises.getJSONObject(exi);
                JSONArray sets = ex.getJSONArray("warmup_set".equals(kind) ? "warmupSets" : "sets");
                if (si < 0 || si >= sets.length()) return;
                JSONObject set = sets.getJSONObject(si);
                if (set.optBoolean("done")) return;
                double kg = cmd.getDouble("kg");
                int reps = cmd.getInt("reps");
                if (kg < 0 || kg > 1000 || reps < 1 || reps > 100) return;
                set.put("kg", kg);
                set.put("reps", reps);
                set.put("done", true);
                snapshot.put("preferredExercise", exi);
                long at = java.time.Instant.parse(cmd.getString("at")).toEpochMilli();
                int rest = set.optInt("restSec", ex.optInt("restSec", 0));
                if (rest > 0 && (!"warmup_set".equals(kind) || snapshot.optBoolean("autoTimer", true))) {
                    snapshot.put("timerEnd", Math.max(snapshot.optLong("timerEnd"), at + rest * 1000L));
                    snapshot.put("timerTotal", rest);
                    snapshot.put("timerLabel", ex.optString("name", "") + ("warmup_set".equals(kind) ? " · warm-up" : ""));
                }
            } else if ("timer_add".equals(kind) && snapshot.optLong("timerEnd") > System.currentTimeMillis()) {
                snapshot.put("timerEnd", snapshot.optLong("timerEnd") + 30000L);
                snapshot.put("timerTotal", snapshot.optInt("timerTotal") + 30);
            } else if ("timer_skip".equals(kind)) {
                snapshot.put("timerEnd", 0);
            }
        } catch (Exception ignored) { }
    }
}
