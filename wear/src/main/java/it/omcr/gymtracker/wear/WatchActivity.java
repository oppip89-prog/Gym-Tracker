package it.omcr.gymtracker.wear;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/** Round-friendly, touch-operated Gym Tracker Wear OS companion. */
public class WatchActivity extends Activity implements SensorEventListener {
    private static final int BG = Color.rgb(8, 13, 19);
    private static final int PANEL = Color.rgb(22, 32, 43);
    private static final int WHITE = Color.rgb(244, 247, 250);
    private static final int SECONDARY = Color.rgb(159, 176, 191);
    private static final int YELLOW = Color.rgb(255, 212, 3);
    private static final int GREEN = Color.rgb(54, 211, 143);
    private static final int PAGE_COUNT = 5;
    private static final int SENSOR_PERMISSION = 751;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final DecimalFormat kgFormat = new DecimalFormat("0.##",
            DecimalFormatSymbols.getInstance(Locale.ITALY));
    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            refresh();
            WatchStore.retryPending(WatchActivity.this);
            handler.postDelayed(this, 750);
        }
    };

    private int page = 0;
    private String lastSignature = "";
    private String editKey = "";
    private double editedKg = 0;
    private int editedReps = 0;
    private boolean edited = false;
    private long lastBuzzedTimer = 0;
    private float downX, downY;
    private boolean ignoreTouch;
    private TextView kgValue, repsValue, timerValue, heartValue, calorieValue;
    private ScrollView scroll;
    private SensorManager sensors;
    private Sensor heartSensor;
    private int bpm = 0;
    private boolean heartActive = false;

    private static class Position {
        int exi, si;
        JSONObject exercise, set;
        Position(int e, int s, JSONObject x, JSONObject t) { exi=e; si=s; exercise=x; set=t; }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) page = state.getInt("page", 0);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        heartSensor = sensors == null ? null : sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        render();
        WatchStore.refreshFromDataLayer(this);
    }

    @Override protected void onResume() {
        super.onResume();
        handler.removeCallbacks(ticker);
        handler.post(ticker);
        manageHeartSensor();
    }

    @Override protected void onPause() {
        handler.removeCallbacks(ticker);
        unregisterHeart();
        super.onPause();
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        out.putInt("page", page);
        super.onSaveInstanceState(out);
    }

    @Override public boolean dispatchTouchEvent(MotionEvent event) {
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
            downX = event.getX(); downY = event.getY(); ignoreTouch = false;
        } else if (event.getActionMasked() == MotionEvent.ACTION_UP && !ignoreTouch) {
            float dx = event.getX() - downX;
            float dy = event.getY() - downY;
            if (Math.abs(dx) > dp(58) && Math.abs(dx) > Math.abs(dy) * 1.2f) {
                navigate(dx < 0 ? 1 : -1);
                ignoreTouch = true;
                return true;
            }
        }
        return super.dispatchTouchEvent(event);
    }

    private void navigate(int direction) {
        page = (page + direction + PAGE_COUNT) % PAGE_COUNT;
        lastSignature = "";
        render();
        manageHeartSensor();
    }

    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private GradientDrawable shape(int color, int radius) {
        GradientDrawable b = new GradientDrawable();
        b.setColor(color);
        b.setCornerRadius(dp(radius));
        return b;
    }

    private TextView text(String value, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextColor(color);
        t.setTextSize(sp);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        t.setIncludeFontPadding(false);
        return t;
    }

    private LinearLayout column() {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        return c;
    }

    private LinearLayout row() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER_VERTICAL);
        return r;
    }

    private LinearLayout.LayoutParams lp(int w, int h) {
        return new LinearLayout.LayoutParams(w < 0 ? w : dp(w), h < 0 ? h : dp(h));
    }

    private void gap(LinearLayout parent, int height) {
        View v = new View(this);
        parent.addView(v, lp(1, height));
    }

    private TextView line(LinearLayout parent, String value, float size, int color, boolean bold) {
        TextView t = text(value, size, color, bold);
        parent.addView(t, lp(-1, -2));
        return t;
    }

    private Button button(String name, int bg, int fg, Runnable click) {
        Button b = new Button(this);
        b.setText(name);
        b.setAllCaps(false);
        b.setTextColor(fg);
        b.setTextSize(15);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setPadding(dp(4), 0, dp(4), 0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setBackground(shape(bg, 30));
        b.setOnClickListener(v -> click.run());
        return b;
    }

    private JSONObject getSnapshot() { return WatchStore.displaySnapshot(this); }

    private Position nextSet(JSONObject snapshot) {
        JSONArray exercises = snapshot.optJSONArray("exercises");
        if (exercises == null || exercises.length() == 0) return null;
        int start = Math.max(0, Math.min(exercises.length() - 1, snapshot.optInt("preferredExercise")));
        for (int round = 0; round < exercises.length(); round++) {
            int index = (start + round) % exercises.length();
            JSONObject ex = exercises.optJSONObject(index);
            if (ex == null) continue;
            JSONArray sets = ex.optJSONArray("sets");
            if (sets == null) continue;
            for (int si = 0; si < sets.length(); si++) {
                JSONObject s = sets.optJSONObject(si);
                if (s != null && !s.optBoolean("done")) return new Position(index, si, ex, s);
            }
        }
        return null;
    }

    private int[] count(JSONObject snapshot) {
        int done = 0, total = 0;
        JSONArray exercises = snapshot.optJSONArray("exercises");
        if (exercises == null) return new int[]{0, 0};
        for (int i = 0; i < exercises.length(); i++) {
            JSONObject ex = exercises.optJSONObject(i);
            if (ex == null) continue;
            JSONArray sets = ex.optJSONArray("sets");
            if (sets == null) continue;
            for (int j = 0; j < sets.length(); j++) {
                total++;
                if (sets.optJSONObject(j) != null && sets.optJSONObject(j).optBoolean("done")) done++;
            }
        }
        return new int[]{done, total};
    }

    private String fmt(double kg) { return kgFormat.format(kg); }
    private String clock(long seconds) {
        long m = Math.max(0, seconds) / 60;
        long s = Math.max(0, seconds) % 60;
        return String.format(Locale.ITALY, "%02d:%02d", m, s);
    }

    private void refresh() {
        JSONObject snapshot = getSnapshot();
        String signature = snapshot.toString() + "|" + WatchStore.pendingCount(this)
                + "|" + WatchStore.lastMessage(this) + "|" + page + "|" + WorkoutHealthService.running + "|" + WorkoutHealthService.status;
        if (!signature.equals(lastSignature)) {
            lastSignature = signature;
            render();
        }
        updateTimer(snapshot);
        if (heartValue != null && WorkoutHealthService.running) heartValue.setText(WorkoutHealthService.bpm > 0 && System.currentTimeMillis() - WorkoutHealthService.lastBpmAt < 120000 ? String.valueOf(WorkoutHealthService.bpm) : "--");
        if (calorieValue != null) calorieValue.setText(WorkoutHealthService.kcal >= 0 ? String.valueOf(Math.round(WorkoutHealthService.kcal)) : "--");
    }

    private void updateTimer(JSONObject snapshot) {
        long end = snapshot.optLong("timerEnd");
        long remaining = Math.max(0, (end - System.currentTimeMillis() + 999) / 1000);
        if (timerValue != null) {
            String label = page == 0 ? "Recupero " : "";
            timerValue.setText(end > 0 && remaining > 0 ? label + clock(remaining) :
                    (page == 0 ? "Recupero non attivo" : "00:00"));
        }
        if (end > 0 && remaining == 0 && lastBuzzedTimer != end) {
            lastBuzzedTimer = end;
            Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 240, 100, 240}, -1));
            }
        }
    }

    private void render() {
        JSONObject snapshot = getSnapshot();
        kgValue = null; repsValue = null; timerValue = null; heartValue = null; calorieValue = null;
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        scroll.setVerticalScrollBarEnabled(false);
        LinearLayout content = column();
        content.setPadding(dp(32), dp(17), dp(32), dp(20));
        scroll.addView(content);
        setContentView(scroll);

        line(content, "GYM TRACKER  /  WATCH", 10, YELLOW, true);
        gap(content, 6);
        int waiting = WatchStore.pendingCount(this);
        String connection = waiting > 0 ? waiting + " conferme da sincronizzare" :
                (WatchStore.lastReceived(this) == 0 ? "In attesa del telefono" :
                 "Dati ricevuti dal telefono");
        line(content, connection, 11, waiting > 0 ? YELLOW : GREEN, false);
        gap(content, 12);

        if (snapshot.optString("sessionId").isEmpty()) {
            line(content, "Nessuna seduta attiva", 19, WHITE, true);
            gap(content, 13);
            line(content, "Apri Gym Tracker sul telefono e avvia PUSH, PULL, LEGS, UPPER o LOWER.", 13, SECONDARY, false);
            gap(content, 15);
            Button retry = button("Aggiorna", PANEL, WHITE,
                    () -> { WatchStore.refreshFromDataLayer(this); lastSignature = ""; });
            content.addView(retry, lp(-1, 43));
        } else if (page == 0) {
            renderSets(content, snapshot);
        } else if (page == 1) {
            renderRecovery(content, snapshot);
        } else if (page == 2) {
            renderHeart(content);
        } else if (page == 3) {
            renderCalories(content);
        } else {
            renderOverview(content, snapshot);
        }
        if (!snapshot.optString("sessionId").isEmpty() && (page == 0 || page == 2 || page == 3)) {
            gap(content, 8);
            line(content, WorkoutHealthService.status, 11, SECONDARY, false);
            content.addView(button(WorkoutHealthService.running ? "Ferma rilevazione" : "Avvia salute", PANEL, WHITE, this::toggleHealth), lp(-1, 43));
        }
        gap(content, 12);
        String[] captions = {"SERIE", "RECUPERO", "BATTITO", "CALORIE", "RIEPILOGO"};
        line(content, (page + 1) + "/" + PAGE_COUNT + "  " + captions[page]
                + "  |  scorri lateralmente", 10, SECONDARY, false);
    }

    private void renderSets(LinearLayout parent, JSONObject snapshot) {
        Position position = nextSet(snapshot);
        if (position == null) {
            line(parent, "Serie completate", 20, GREEN, true);
            gap(parent, 12);
            line(parent, "Termina l'allenamento dal telefono oppure scorri per il riepilogo.", 12, SECONDARY, false);
            return;
        }
        JSONObject ex = position.exercise;
        JSONArray allSets = ex.optJSONArray("sets");
        int done = 0;
        if (allSets != null) for (int i=0; i<allSets.length(); i++)
            if (allSets.optJSONObject(i) != null && allSets.optJSONObject(i).optBoolean("done")) done++;
        line(parent, snapshot.optString("workout", "ALLENAMENTO"), 12, SECONDARY, true);
        gap(parent, 3);
        line(parent, ex.optString("name", "Esercizio"), 17, WHITE, true);
        gap(parent, 3);
        line(parent, "Serie " + (position.si + 1) + "/" + (allSets == null ? 0 : allSets.length())
                + "  -  " + ex.optString("equipment", ""), 11, SECONDARY, false);
        gap(parent, 12);

        String key = snapshot.optString("sessionId") + ":" + position.exi + ":" + position.si;
        if (!key.equals(editKey)) {
            editKey = key;
            editedKg = Math.max(0, position.set.isNull("kg") ? 0 : position.set.optDouble("kg", 0));
            editedReps = Math.max(0, position.set.isNull("reps") ? 0 : position.set.optInt("reps", 0));
            edited = false;
        } else if (!edited && WatchStore.pendingCount(this) == 0) {
            editedKg = Math.max(0, position.set.optDouble("kg", editedKg));
            editedReps = Math.max(0, position.set.optInt("reps", editedReps));
        }
        final double step = Math.max(0.1, ex.optDouble("stepKg", 2.5));
        line(parent, "CARICO", 10, SECONDARY, true);
        gap(parent, 4);
        LinearLayout kgRow = row();
        kgRow.setGravity(Gravity.CENTER);
        parent.addView(kgRow, lp(-1, 46));
        kgRow.addView(button("-", PANEL, WHITE, () -> changeKg(-step)), lp(46, 44));
        kgValue = text(fmt(editedKg) + " kg", 23, WHITE, true);
        kgRow.addView(kgValue, new LinearLayout.LayoutParams(0, dp(45), 1));
        kgRow.addView(button("+", PANEL, WHITE, () -> changeKg(step)), lp(46, 44));
        gap(parent, 4);
        line(parent, "Passo " + fmt(step) + " kg", 10, SECONDARY, false);
        gap(parent, 8);

        line(parent, "RIPETIZIONI", 10, SECONDARY, true);
        gap(parent, 4);
        LinearLayout repRow = row();
        repRow.setGravity(Gravity.CENTER);
        parent.addView(repRow, lp(-1, 44));
        repRow.addView(button("-", PANEL, WHITE, () -> changeReps(-1)), lp(46, 43));
        repsValue = text(String.valueOf(editedReps), 24, WHITE, true);
        repRow.addView(repsValue, new LinearLayout.LayoutParams(0, dp(44), 1));
        repRow.addView(button("+", PANEL, WHITE, () -> changeReps(1)), lp(46, 43));
        gap(parent, 12);
        Button confirm = button("CONFERMA SERIE", YELLOW, BG,
                () -> confirmSet(snapshot.optString("sessionId"), position));
        parent.addView(confirm, lp(-1, 46));
        gap(parent, 8);
        long left = (snapshot.optLong("timerEnd") - System.currentTimeMillis() + 999) / 1000;
        timerValue = line(parent, left > 0 ? "Recupero " + clock(left) : "Recupero non attivo", 12, GREEN, false);
        int[] counts = count(snapshot);
        gap(parent, 5);
        line(parent, "Totale: " + counts[0] + "/" + counts[1] + " serie", 11, SECONDARY, false);
    }

    private void changeKg(double step) {
        edited = true;
        editedKg = Math.max(0, Math.min(1000, Math.round((editedKg + step) * 100.0) / 100.0));
        if (kgValue != null) kgValue.setText(fmt(editedKg) + " kg");
    }

    private void changeReps(int delta) {
        edited = true;
        editedReps = Math.max(0, Math.min(100, editedReps + delta));
        if (repsValue != null) repsValue.setText(String.valueOf(editedReps));
    }

    private void confirmSet(String sessionId, Position position) {
        if (editedReps < 1 || editedReps > 100 || editedKg < 0 || editedKg > 1000) {
            WatchStore.receiveAck(this, "validation", "ignored", "Carico o ripetizioni non validi");
            lineWarning("Imposta almeno 1 ripetizione");
            return;
        }
        try {
            JSONObject command = new JSONObject();
            command.put("kind", "confirm");
            command.put("sessionId", sessionId);
            command.put("exi", position.exi);
            command.put("si", position.si);
            command.put("kg", editedKg);
            command.put("reps", editedReps);
            if (WatchStore.postCommand(this, command)) {
                editKey = "";
                lastSignature = "";
                render();
            } else lineWarning("Memoria piena. Collega il telefono.");
        } catch (Exception e) { lineWarning("Impossibile preparare la serie"); }
    }

    private void lineWarning(String message) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_SHORT).show();
    }

    private void renderRecovery(LinearLayout parent, JSONObject snapshot) {
        line(parent, "RECUPERO", 16, WHITE, true);
        gap(parent, 13);
        long end = snapshot.optLong("timerEnd");
        long left = Math.max(0, (end - System.currentTimeMillis() + 999) / 1000);
        timerValue = line(parent, end > 0 ? clock(left) : "00:00", 37, YELLOW, true);
        gap(parent, 5);
        line(parent, left > 0 ? snapshot.optString("timerLabel", "") : "Nessun recupero attivo", 12, SECONDARY, false);
        gap(parent, 18);
        LinearLayout controls = row();
        parent.addView(controls, lp(-1, 46));
        Button plus = button("+30 s", PANEL, WHITE, () -> timerCommand("timer_add", snapshot));
        controls.addView(plus, new LinearLayout.LayoutParams(0, dp(44), 1));
        gapHorizontal(controls, 10);
        Button skip = button("Salta", PANEL, WHITE, () -> timerCommand("timer_skip", snapshot));
        controls.addView(skip, new LinearLayout.LayoutParams(0, dp(44), 1));
        plus.setEnabled(left > 0);
        skip.setEnabled(left > 0);
        gap(parent, 10);
        line(parent, "Vibrazione al termine del timer.", 11, SECONDARY, false);
    }

    private void gapHorizontal(LinearLayout parent, int width) {
        View v = new View(this);
        parent.addView(v, lp(width, 1));
    }

    private void timerCommand(String action, JSONObject snapshot) {
        try {
            JSONObject cmd = new JSONObject();
            cmd.put("kind", action);
            cmd.put("sessionId", snapshot.optString("sessionId"));
            if (WatchStore.postCommand(this, cmd)) { lastSignature = ""; render(); }
        } catch (Exception ignored) { }
    }

    private void renderHeart(LinearLayout parent) {
        line(parent, "BATTITO CARDIACO", 15, WHITE, true);
        gap(parent, 16);
        heartValue = line(parent, WorkoutHealthService.running && WorkoutHealthService.bpm > 0 && System.currentTimeMillis() - WorkoutHealthService.lastBpmAt < 120000 ? String.valueOf(WorkoutHealthService.bpm) : "--", 42, GREEN, true);
        line(parent, "BPM", 13, SECONDARY, false);
        gap(parent, 10);
        line(parent, "Avvia salute per registrare battito durante la seduta e sincronizzarlo sul telefono.", 11, SECONDARY, false);
    }

    private void renderCalories(LinearLayout parent) {
        line(parent, "CALORIE TOTALI", 16, WHITE, true);
        gap(parent, 18);
        calorieValue = line(parent, WorkoutHealthService.kcal >= 0 ? String.valueOf(Math.round(WorkoutHealthService.kcal)) : "--", 42, YELLOW, true);
        line(parent, "kcal stimate", 13, SECONDARY, false);
        gap(parent, 10);
        line(parent, "Include metabolismo basale. Solo intervallo registrato da Health Services.", 12, SECONDARY, false);
    }

    private void toggleHealth() {
        if (WorkoutHealthService.running) {
            startService(new Intent(this, WorkoutHealthService.class).setAction("STOP"));
            return;
        }
        if (!hasHeartPermission() || checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{heartPermission(), Manifest.permission.ACTIVITY_RECOGNITION}, SENSOR_PERMISSION);
            return;
        }
        String id = getSnapshot().optString("sessionId");
        if (id.isEmpty()) return;
        unregisterHeart();
        try { startForegroundService(new Intent(this, WorkoutHealthService.class).putExtra("sessionId", id)); }
        catch (Exception e) { lineWarning("Impossibile avviare rilevazione. Controlla i permessi."); }
    }

    private void renderOverview(LinearLayout parent, JSONObject snapshot) {
        line(parent, "RIEPILOGO SEDUTA", 15, WHITE, true);
        gap(parent, 10);
        line(parent, snapshot.optString("workout"), 17, WHITE, true);
        gap(parent, 9);
        int[] counts = count(snapshot);
        line(parent, counts[0] + " / " + counts[1], 30, GREEN, true);
        line(parent, "serie registrate (comprese quelle in coda)", 11, SECONDARY, false);
        gap(parent, 10);
        line(parent, snapshot.optString("gymName", ""), 11, SECONDARY, false);
        gap(parent, 12);
        String message = WatchStore.lastMessage(this);
        if (!message.isEmpty()) line(parent, message, 11, YELLOW, false);
    }

    private String heartPermission() {
        return Build.VERSION.SDK_INT >= 36 ? "android.permission.health.READ_HEART_RATE"
                : Manifest.permission.BODY_SENSORS;
    }

    private boolean hasHeartPermission() {
        return checkSelfPermission(heartPermission()) == PackageManager.PERMISSION_GRANTED;
    }

    private void askHeartPermission() {
        requestPermissions(new String[]{heartPermission()}, SENSOR_PERMISSION);
    }

    private void manageHeartSensor() {
        unregisterHeart();
        // Health Services now owns the exercise sensors; do not register competing listeners.
    }

    private void unregisterHeart() {
        if (heartActive && sensors != null) sensors.unregisterListener(this);
        heartActive = false;
    }

    @Override public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_HEART_RATE || event.values.length == 0) return;
        int reading = Math.round(event.values[0]);
        if (reading > 0 && reading < 250) {
            bpm = reading;
            if (heartValue != null) heartValue.setText(String.valueOf(bpm));
        }
    }

    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SENSOR_PERMISSION) {
            if (hasHeartPermission() && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) toggleHealth();
            lastSignature = "";
            render();
        }
    }
}
