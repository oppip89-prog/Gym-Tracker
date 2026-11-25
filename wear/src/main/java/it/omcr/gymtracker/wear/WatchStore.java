package it.omcr.gymtracker.wear;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Wearable;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.util.UUID;

/** Watch-side cached session and persistent offline command queue. */
public final class WatchStore {
    private static final Object LOCK = new Object();
    private static final String PREF = "gym_watch_v1";
    private static final String SESSION = "session";
    private static final String PENDING = "pending";
    private static final String MESSAGE = "last_message";

    private WatchStore() { }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public static void receiveSession(Context ctx, String payload) {
        if (payload == null || payload.length() > 90000) return;
        try {
            JSONObject json = new JSONObject(payload);
            if (json.optInt("protocol") != 1) return;
            synchronized (LOCK) {
                prefs(ctx).edit().putString(SESSION, payload)
                        .putLong("last_received", System.currentTimeMillis()).commit();
            }
        } catch (Exception ignored) { }
    }

    public static void receiveAck(Context ctx, String id, String status, String text) {
        if (id == null || id.isEmpty() || status == null) return;
        synchronized (LOCK) {
            if ("queued".equals(status)) {
                prefs(ctx).edit().putString(MESSAGE, "In coda sul telefono").apply();
                return;
            }
            if (!"applied".equals(status) && !"rejected".equals(status)) return;
            JSONArray old = pending(ctx), after = new JSONArray();
            for (int i = 0; i < old.length(); i++) {
                JSONObject c = old.optJSONObject(i);
                if (c != null && !id.equals(c.optString("id"))) after.put(c);
            }
            String message = "applied".equals(status) ? "Operazione salvata nell'app" :
                    (text == null || text.isEmpty() ? "Conferma rifiutata" : text);
            prefs(ctx).edit().putString(PENDING, after.toString())
                    .putString(MESSAGE, message).commit();
        }
        // Commands are DataItems (offline-safe). Delete only after a terminal ACK.
        deleteCommand(ctx, id);
    }

    private static JSONArray pending(Context ctx) {
        try { return new JSONArray(prefs(ctx).getString(PENDING, "[]")); }
        catch (Exception e) { return new JSONArray(); }
    }

    public static int pendingCount(Context ctx) {
        synchronized (LOCK) { return pending(ctx).length(); }
    }

    public static String lastMessage(Context ctx) {
        return prefs(ctx).getString(MESSAGE, "");
    }

    public static long lastReceived(Context ctx) {
        return prefs(ctx).getLong("last_received", 0L);
    }

    public static JSONObject displaySnapshot(Context ctx) {
        synchronized (LOCK) {
            JSONObject json;
            try { json = new JSONObject(prefs(ctx).getString(SESSION, "{}")); }
            catch (Exception e) { json = new JSONObject(); }
            JSONArray commands = pending(ctx);
            for (int i = 0; i < commands.length(); i++) {
                JSONObject cmd = commands.optJSONObject(i);
                if (cmd != null) applyPreview(json, cmd);
            }
            return json;
        }
    }

    /** The watch never writes the authoritative session: this is a local display projection. */
    static void applyPreview(JSONObject snapshot, JSONObject cmd) {
        if (!snapshot.optString("sessionId").equals(cmd.optString("sessionId"))) return;
        try {
            String kind = cmd.optString("kind");
            if ("confirm".equals(kind)) {
                int exi = cmd.getInt("exi"), si = cmd.getInt("si");
                JSONArray exercises = snapshot.getJSONArray("exercises");
                if (exi < 0 || exi >= exercises.length()) return;
                JSONObject ex = exercises.getJSONObject(exi);
                JSONArray sets = ex.getJSONArray("sets");
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
                int rest = set.optInt("restSec", ex.optInt("restSec"));
                if (rest > 0) {
                    long end = Instant.parse(cmd.getString("at")).toEpochMilli() + 1000L * rest;
                    snapshot.put("timerEnd", Math.max(snapshot.optLong("timerEnd"), end));
                    snapshot.put("timerTotal", rest);
                    snapshot.put("timerLabel", ex.optString("name"));
                }
            } else if ("timer_add".equals(kind) && snapshot.optLong("timerEnd") > System.currentTimeMillis()) {
                snapshot.put("timerEnd", snapshot.optLong("timerEnd") + 30000L);
            } else if ("timer_skip".equals(kind)) {
                snapshot.put("timerEnd", 0);
            }
        } catch (Exception ignored) { }
    }

    public static boolean postCommand(Context ctx, JSONObject command) {
        synchronized (LOCK) {
            if (pending(ctx).length() >= 150) {
                prefs(ctx).edit().putString(MESSAGE, "Coda piena. Collega il telefono.").apply();
                return false;
            }
            try {
                String id = UUID.randomUUID().toString();
                command.put("id", id);
                command.put("at", Instant.now().toString());
                JSONArray queue = pending(ctx);
                queue.put(command);
                if (!prefs(ctx).edit().putString(PENDING, queue.toString())
                        .putString(MESSAGE, "In attesa di sincronizzazione").commit()) return false;
                PutDataMapRequest data = PutDataMapRequest.create("/gymtracker/command/" + id);
                data.getDataMap().putString("payload", command.toString());
                data.getDataMap().putLong("time", System.currentTimeMillis());
                Wearable.getDataClient(ctx.getApplicationContext())
                        .putDataItem(data.asPutDataRequest().setUrgent())
                        .addOnFailureListener(e -> prefs(ctx).edit()
                                .putString(MESSAGE, "In attesa del collegamento").apply());
                return true;
            } catch (Exception e) { return false; }
        }
    }

    private static void deleteCommand(Context ctx, String id) {
        Wearable.getDataClient(ctx.getApplicationContext()).getDataItems()
                .addOnSuccessListener(buffer -> {
                    try {
                        for (DataItem item : buffer) {
                            if (("/gymtracker/command/" + id).equals(item.getUri().getPath())) {
                                Wearable.getDataClient(ctx.getApplicationContext()).deleteDataItems(item.getUri());
                            }
                        }
                    } finally { buffer.release(); }
                });
    }

    /** Re-emit local offline commands using the same IDs if Play services interrupted a put. */
    public static void retryPending(Context ctx) {
        synchronized (LOCK) {
            long now = System.currentTimeMillis();
            if (now - prefs(ctx).getLong("last_retry", 0L) < 15000L) return;
            prefs(ctx).edit().putLong("last_retry", now).apply();
            JSONArray commands = pending(ctx);
            for (int i=0; i<commands.length(); i++) {
                JSONObject command = commands.optJSONObject(i);
                if (command == null) continue;
                String id = command.optString("id", "");
                if (!id.matches("[a-zA-Z0-9-]{8,120}")) continue;
                PutDataMapRequest data = PutDataMapRequest.create("/gymtracker/command/" + id);
                data.getDataMap().putString("payload", command.toString());
                data.getDataMap().putLong("time", now);
                Wearable.getDataClient(ctx.getApplicationContext())
                        .putDataItem(data.asPutDataRequest().setUrgent());
            }
        }
    }

    /** Fetch previously synchronized items when app is launched after first pairing. */
    public static void refreshFromDataLayer(Context ctx) {
        Wearable.getDataClient(ctx.getApplicationContext()).getDataItems()
                .addOnSuccessListener(buffer -> {
                    try {
                        for (DataItem item : buffer) {
                            String path = item.getUri().getPath();
                            if (path == null) continue;
                            DataMap map = DataMapItem.fromDataItem(item).getDataMap();
                            if ("/gymtracker/session".equals(path)) {
                                receiveSession(ctx, map.getString("payload"));
                            } else if (path.startsWith("/gymtracker/ack/")) {
                                receiveAck(ctx, map.getString("id"), map.getString("status"), map.getString("message"));
                            }
                        }
                    } finally { buffer.release(); }
                });
    }
}
