package it.omcr.gymtracker.wear;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.content.res.ColorStateList;
import android.graphics.drawable.RippleDrawable;
import android.view.WindowManager;
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
    private static final int BG = Color.BLACK;
    private static final int PANEL = Color.rgb(39, 40, 45);
    private static final int WHITE = Color.rgb(244, 247, 250);
    private static final int SECONDARY = Color.rgb(171, 175, 183);
    private static final int YELLOW = Color.rgb(242, 224, 64);
    private static final int GREEN = Color.rgb(52, 215, 101);
    private static final int PAGE_COUNT = 5;
    private static final int CLOSE = 6;
    private static final int MENU = 5;
    private static final int BLUE = Color.rgb(57,156,247), PINK = Color.rgb(255,64,108), PURPLE = Color.rgb(151,109,252);
    private TextView elapsedValue, avgValue, maxValue, stepValue, liveSummary;
    private String shownSession="";
    private static final String[] PAGE_NAMES={"SERIE","RECUPERO","BATTITO","ATTIVITÀ","RIEPILOGO","MENU","TERMINA"};
    private static final int AMBER = Color.rgb(255, 155, 57);
    private static final int NOTIF_PERMISSION = 752;
    private long lastServiceAttempt = 0;
    private boolean visible;
    private boolean keepDisplay = true;
    private boolean autoRecovery;
    private String autoRecoverySession = "";
    private ProgressArc recoveryArc;
    private HeartZoneDial heartDial;
    private TextView zoneValue, heartMini;
    private boolean permissionDialog;
    private long autoHealthAttemptAt;
    private String autoAttemptedSession = "";
    private int maxHeartRate = 0;
    private String screenKey="";
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

    private int page = MENU;
    private static final int MENU_PAGES = 3;
    private int menuPage = 0;
    private String lastSignature = "";
    private String editKey = "";
    private double editedKg = 0;
    private int editedReps = 0;
    private boolean edited = false;
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
        String kind;
        Position(int e, int s, JSONObject x, JSONObject t, String k) { exi=e; si=s; exercise=x; set=t; kind=k; }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) { page = Math.max(0,Math.min(CLOSE,state.getInt("page", MENU))); menuPage = Math.max(0,Math.min(MENU_PAGES-1,state.getInt("menuPage",0))); }
        shownSession=getSnapshot().optString("sessionId");
        keepDisplay = getPreferences(MODE_PRIVATE).getBoolean("keepDisplay", true);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        heartSensor = sensors == null ? null : sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        render();
        WatchStore.refreshFromDataLayer(this);
    }

    @Override protected void onResume() {
        super.onResume();
        visible = true;
        WatchLaunchNotification.clear(this);
        WatchStore.refreshFromDataLayer(this);
        handler.removeCallbacks(ticker);
        handler.post(ticker);
        manageHeartSensor();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent);
        WatchStore.refreshFromDataLayer(this);
        lastSignature = "";
    }

    @Override protected void onPause() {
        visible = false;
        handler.removeCallbacks(ticker);
        unregisterHeart();
        super.onPause();
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        out.putInt("page", page);
        out.putInt("menuPage", menuPage);
        super.onSaveInstanceState(out);
    }

    @Override public boolean dispatchTouchEvent(MotionEvent event) {
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
            downX = event.getX(); downY = event.getY(); ignoreTouch = false;
        } else if (event.getActionMasked() == MotionEvent.ACTION_UP && !ignoreTouch) {
            float dx = event.getX() - downX;
            float dy = event.getY() - downY;
            if (Math.abs(dx) > dp(58) && Math.abs(dx) > Math.abs(dy) * 1.2f) {
                MotionEvent cancel = MotionEvent.obtain(event);
                cancel.setAction(MotionEvent.ACTION_CANCEL);
                super.dispatchTouchEvent(cancel); cancel.recycle();
                navigate(dx < 0 ? 1 : -1);
                ignoreTouch = true;
                return true;
            }
        }
        return super.dispatchTouchEvent(event);
    }

    @Override public void onBackPressed() { if (page!=MENU && !getSnapshot().optString("sessionId").isEmpty()) go(MENU); else super.onBackPressed(); }

    private void navigate(int direction) {
        autoRecovery = false;
        if (page == MENU) menuPage = (menuPage + direction + MENU_PAGES) % MENU_PAGES;
        else if (page != CLOSE) page = (page + direction + PAGE_COUNT) % PAGE_COUNT;
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
        t.setTypeface(Typeface.create(bold ? "sans-serif-medium" : "sans-serif", Typeface.NORMAL));
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
        b.setTextSize(13);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setPadding(dp(4), 0, dp(4), 0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x33FFFFFF), shape(bg, 24), null));
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
            if (sets == null || sets.length() == 0) {
                if (!ex.optBoolean("done")) return new Position(index, -1, ex, null, "warmup_general");
                continue;
            }
            boolean workStarted = false;
            for (int i=0;i<sets.length();i++) if (sets.optJSONObject(i)!=null && sets.optJSONObject(i).optBoolean("done")) workStarted=true;
            JSONArray warm = ex.optJSONArray("warmupSets");
            if (!workStarted && warm != null) for (int si=0;si<warm.length();si++) {
                JSONObject w=warm.optJSONObject(si);
                if (w!=null && !w.optBoolean("done")) return new Position(index,si,ex,w,"warmup_set");
            }
            for (int si = 0; si < sets.length(); si++) {
                JSONObject s = sets.optJSONObject(si);
                if (s != null && !s.optBoolean("done")) return new Position(index, si, ex, s,"confirm");
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
            if (sets == null || sets.length() == 0) continue; // Preparation is not a working set.
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
        String sid=snapshot.optString("sessionId");
        if (!sid.equals(shownSession)) { shownSession=sid; page=MENU; menuPage=0; autoRecovery=false; lastSignature=""; }
        maintainSession(snapshot);
        ensureHealth(snapshot);
        if (autoRecovery && page==1 && (snapshot.optLong("timerEnd") <= System.currentTimeMillis() || !autoRecoverySession.equals(snapshot.optString("sessionId")))) { page=0; autoRecovery=false; }
        String signature = snapshot.toString() + "|" + WatchStore.pendingCount(this)
                + "|" + WatchStore.lastMessage(this) + "|" + page + ":" + menuPage + "|" + WorkoutHealthService.running + "|" + WorkoutHealthService.tracking + "|" + WorkoutHealthService.status + "|" + WorkoutHealthService.savingSession;
        if (!signature.equals(lastSignature)) {
            lastSignature = signature;
            render();
        }
        updateTimer(snapshot);
        updateHeart(snapshot);
        updateMetrics(snapshot);
    }

    private void updateTimer(JSONObject snapshot) {
        long end = snapshot.optLong("timerEnd");
        long remaining = Math.max(0, (end - System.currentTimeMillis() + 999) / 1000);
        if (timerValue != null) {
            String label = page == 0 ? "Recupero " : "";
            timerValue.setText(end > 0 && remaining > 0 ? label + clock(remaining) :
                    (page == 0 ? "Recupero non attivo" : "00:00"));
        }
        if (recoveryArc != null) recoveryArc.setFraction(snapshot.optInt("timerTotal") > 0 ? (float)remaining/snapshot.optInt("timerTotal") : 0);
        WatchStore.buzzIfDue(this, end);
    }

    private void render() {
        JSONObject snapshot = getSnapshot();
        Position activePosition=page==0?nextSet(snapshot):null;
        String nextScreenKey=snapshot.optString("sessionId")+":"+page+":"+menuPage+":"+(activePosition==null?"":activePosition.exi+":"+activePosition.kind+":"+activePosition.si)+":"+WatchStore.finishPending(this,snapshot.optString("sessionId"));
        int previousScroll=scroll!=null && screenKey.equals(nextScreenKey)?scroll.getScrollY():0;
        screenKey=nextScreenKey;
        recoveryArc = null; heartDial = null; zoneValue = null; heartMini = null; elapsedValue=null; avgValue=null; maxValue=null; stepValue=null; liveSummary=null;
        kgValue = null; repsValue = null; timerValue = null; heartValue = null; calorieValue = null;
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        scroll.setVerticalScrollBarEnabled(false);
        LinearLayout content = column();
        boolean compactMenu=page==MENU && !snapshot.optString("sessionId").isEmpty();
        content.setPadding(dp(20), dp(compactMenu?12:16), dp(20), dp(compactMenu?8:22));
        content.setClipToPadding(false);
        scroll.addView(content);
        setContentView(scroll);


        int waiting = WatchStore.trainingPending(this);
        String connection = waiting > 0 ? waiting + " in attesa di sync" :
                (WatchStore.lastReceived(this) == 0 ? "In attesa del telefono" :
                 "Dati disponibili");
        boolean active=!snapshot.optString("sessionId").isEmpty();
        if (active && page!=MENU) {
            TextView home=line(content,"‹ Menu  ·  "+PAGE_NAMES[page],11,WHITE,true); home.setPadding(0,dp(2),0,dp(3)); home.setOnClickListener(v->go(MENU));
        } else if(!compactMenu) line(content, "GYMTRACKER", 11, WHITE, true);
        if (active && page != 2 && page != MENU && page != 3 && page != CLOSE) {
            heartMini=line(content,"",11,SECONDARY,true);heartMini.setOnClickListener(v->{page=2;autoRecovery=false;lastSignature="";render();});
            updateHeart(snapshot);
        }
        if(!compactMenu)gap(content, 7);

        if (snapshot.optString("sessionId").isEmpty()) {
            boolean saved=WatchStore.recentlySaved(this), discarded=WatchStore.recentlyDiscarded(this);
            line(content, discarded?"Seduta scartata":saved?"✓ Allenamento salvato":"Nessuna seduta attiva", 21, saved?GREEN:WHITE, true);
            gap(content, 13);
            line(content, discarded?"Non salvata nello storico né esportata.":saved?"La seduta è nello storico del telefono.":"Avvia una seduta sul telefono.", 13, SECONDARY, false);
            gap(content, 15);
            Button retry = button("Aggiorna", PANEL, WHITE,
                    () -> { WatchStore.refreshFromDataLayer(this); lastSignature = ""; });
            content.addView(retry, lp(-1, 43));
        } else if (WatchStore.finishPending(this, snapshot.optString("sessionId")) || snapshot.optString("sessionId").equals(WorkoutHealthService.savingSession)) {
            gap(content,12); line(content,"Chiusura in corso",20,GREEN,true); gap(content,8);
            line(content,"Apri GymTracker sul telefono se non si sincronizza. La chiusura attende la conferma del telefono.",12,SECONDARY,false);
            gap(content,8); content.addView(button("Sincronizza",PANEL,WHITE,()->{WatchStore.retryPending(this);WatchStore.refreshFromDataLayer(this);}),lp(-1,42));
        } else if (page == 0) {
            String err=WatchStore.finishError(this,snapshot.optString("sessionId"));
            if(!err.isEmpty()) {line(content,err,11,AMBER,false);gap(content,5);}
            renderSets(content, snapshot);
        } else if (page == 1) {
            renderRecovery(content, snapshot);
        } else if (page == 2) {
            renderHeart(content, snapshot);
        } else if (page == 3) {
            renderCalories(content);
        } else if (page == CLOSE) {
            renderClose(content,snapshot);
        } else if (page == MENU) {
            renderMenu(content,snapshot,connection);
        } else {
            renderOverview(content, snapshot);
        }
        if (!snapshot.optString("sessionId").isEmpty() && !WatchStore.finishPending(this,snapshot.optString("sessionId")) && !snapshot.optString("sessionId").equals(WorkoutHealthService.savingSession) && (page == 2 || page == 3)) {
            gap(content, 8);
            line(content, WorkoutHealthService.status, 11, SECONDARY, false);
            content.addView(button(WorkoutHealthService.running ? "Ferma rilevazione" : "Avvia salute", PANEL, WHITE, this::toggleHealth), lp(-1, 43));
        }
        if (active && page!=MENU && page!=CLOSE && !WatchStore.finishPending(this,snapshot.optString("sessionId")) && !snapshot.optString("sessionId").equals(WorkoutHealthService.savingSession)) {
            gap(content,6);
            LinearLayout nav=row(); nav.setGravity(Gravity.CENTER); content.addView(nav,lp(-1,38));
            nav.addView(button("‹",PANEL,WHITE,()->navigate(-1)),lp(40,38));
            TextView label=text(PAGE_NAMES[page],10,SECONDARY,true);
            nav.addView(label,new LinearLayout.LayoutParams(0,dp(38),1));
            nav.addView(button("›",PANEL,WHITE,()->navigate(1)),lp(40,38));
            if(page==0) {gap(content,6); content.addView(button("Riepilogo / termina",PANEL,WHITE,()->{page=4;autoRecovery=false;lastSignature="";render();}),lp(-1,42));}
        }
        gap(content, 5);
        if(active && page!=MENU && page!=CLOSE) line(content, "●  "+(page+1)+" / "+PAGE_COUNT+"  ·  Scorri ↔", 9, SECONDARY, false);
        updateMetrics(snapshot);
        if(previousScroll>0) scroll.post(()->scroll.scrollTo(0,previousScroll));
    }

    private void renderSets(LinearLayout parent, JSONObject snapshot) {
        Position position = nextSet(snapshot);
        if (position == null) {
            line(parent, "Serie completate", 20, GREEN, true);
            gap(parent, 12);
            showProgress(parent,snapshot);
            gap(parent,8); line(parent, "Ottimo lavoro! Salva la seduta.", 12, SECONDARY, false);
            gap(parent,8); parent.addView(button("Termina allenamento",GREEN,BG,()->finishSession(snapshot)),lp(-1,46));
            return;
        }
        JSONObject ex = position.exercise;
        boolean warm = "warmup_set".equals(position.kind);
        if ("warmup_general".equals(position.kind)) {
            line(parent,"WARM-UP  /  GENERALE",11,AMBER,true); gap(parent,5);
            line(parent,ex.optString("name"),21,WHITE,true); gap(parent,7);
            line(parent,ex.optString("warmupDescription"),28,AMBER,true);
            gap(parent,5); line(parent,ex.optString("warmupNote"),12,SECONDARY,false); gap(parent,10);
            parent.addView(button("✓ Riscaldamento fatto",AMBER,BG,()->confirmSet(snapshot.optString("sessionId"),position)),lp(-1,46));
            showProgress(parent,snapshot); return;
        }
        JSONArray allSets = ex.optJSONArray(warm ? "warmupSets" : "sets");
        int done = 0;
        if (allSets != null) for (int i=0; i<allSets.length(); i++)
            if (allSets.optJSONObject(i) != null && allSets.optJSONObject(i).optBoolean("done")) done++;
        line(parent, warm ? "WARM-UP  /  AVVICINAMENTO" : snapshot.optString("workout", "ALLENAMENTO")+"  /  LAVORO", 10, warm?AMBER:YELLOW, true);
        gap(parent, 3);
        line(parent, ex.optString("name", "Esercizio"), 19, WHITE, true);
        gap(parent, 3);
        line(parent, position.set.optString("label",String.valueOf(position.si+1)) + "  ·  " + (position.si + 1) + "/" + (allSets == null ? 0 : allSets.length()), 11, SECONDARY, false);
        gap(parent, 6);

        String key = snapshot.optString("sessionId") + ":" + position.exi + ":" + position.kind + ":" + position.si;
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
        LinearLayout kgRow = row();
        kgRow.setGravity(Gravity.CENTER); parent.addView(kgRow, lp(-1, 43));
        kgRow.addView(button("−", PANEL, WHITE, () -> changeKg(-step)), lp(36, 36));
        LinearLayout kgCenter=column(); kgCenter.setGravity(Gravity.CENTER);
        kgRow.addView(kgCenter,new LinearLayout.LayoutParams(0,dp(43),1));
        kgValue=text(fmt(editedKg)+" kg",22,WHITE,true); kgValue.setSingleLine(true);
        kgCenter.addView(kgValue,lp(-1,-2));line(kgCenter,"CARICO",9,SECONDARY,true);
        kgRow.addView(button("+", PANEL, WHITE, () -> changeKg(step)), lp(36, 36));
        gap(parent, 3);
        LinearLayout repRow=row(); repRow.setGravity(Gravity.CENTER); parent.addView(repRow,lp(-1,43));
        repRow.addView(button("−",PANEL,WHITE,()->changeReps(-1)),lp(36,36));
        LinearLayout repCenter=column();repCenter.setGravity(Gravity.CENTER);
        repRow.addView(repCenter,new LinearLayout.LayoutParams(0,dp(43),1));
        repsValue=text(String.valueOf(editedReps),22,WHITE,true);
        repCenter.addView(repsValue,lp(-1,-2));line(repCenter,"RIPETIZIONI",9,SECONDARY,true);
        repRow.addView(button("+",PANEL,WHITE,()->changeReps(1)),lp(36,36));
        gap(parent, 7);
        Button confirm = button(warm ? "✓ Completa warm-up" : "✓ Completa serie", warm ? AMBER : YELLOW, BG,
                () -> confirmSet(snapshot.optString("sessionId"), position));
        parent.addView(confirm, lp(-1, 43));
        gap(parent, 8);
        long left = (snapshot.optLong("timerEnd") - System.currentTimeMillis() + 999) / 1000;
        timerValue = line(parent, left > 0 ? "Recupero " + clock(left) : "Recupero non attivo", 12, GREEN, false);
        showProgress(parent,snapshot);
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
        if (!"warmup_general".equals(position.kind) && (editedReps < 1 || editedReps > 100 || editedKg < 0 || editedKg > 1000)) {
            WatchStore.receiveAck(this, "validation", "ignored", "Carico o ripetizioni non validi");
            lineWarning("Imposta almeno 1 ripetizione");
            return;
        }
        try {
            JSONObject command = new JSONObject();
            command.put("kind", position.kind);
            command.put("sessionId", sessionId);
            command.put("exi", position.exi);
            command.put("si", position.si);
            command.put("kg", editedKg);
            command.put("reps", editedReps);
            if (WatchStore.postCommand(this, command)) {
                editKey = "";
                JSONObject updated=getSnapshot();
                if(!"warmup_general".equals(position.kind) && updated.optLong("timerEnd")>System.currentTimeMillis()) {page=1;autoRecovery=true;autoRecoverySession=sessionId;}
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
        android.widget.FrameLayout dial=new android.widget.FrameLayout(this);
        parent.addView(dial,lp(126,126));
        recoveryArc=new ProgressArc(GREEN); dial.addView(recoveryArc,new android.widget.FrameLayout.LayoutParams(-1,-1));
        recoveryArc.setFraction(snapshot.optInt("timerTotal")>0 ? (float)left/snapshot.optInt("timerTotal") : 0);
        timerValue=text(end>0?clock(left):"00:00",32,WHITE,true);
        dial.addView(timerValue,new android.widget.FrameLayout.LayoutParams(-1,-1,Gravity.CENTER));
        gap(parent, 5);
        line(parent, left > 0 ? snapshot.optString("timerLabel", "") : "Nessun recupero attivo", 12, SECONDARY, false);
        gap(parent, 8);
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
        parent.addView(button("Torna alle serie",PANEL,WHITE,()->{page=0;autoRecovery=false;lastSignature="";render();}),lp(-1,42));
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

    private int currentBpm() {
        return WorkoutHealthService.running && WorkoutHealthService.bpm > 0 && System.currentTimeMillis() - WorkoutHealthService.lastBpmAt < 45000 ? WorkoutHealthService.bpm : 0;
    }
    private int zoneColor(int value, int max) {
        if (value <= 0 || max < 100) return SECONDARY;
        double f = (double)value/max;
        return f < .70 ? GREEN : (f < .85 ? YELLOW : Color.rgb(255,84,104));
    }
    private void updateHeart(JSONObject snapshot) {
        int value = currentBpm(); int max = snapshot.optInt("maxHeartRate",0);
        maxHeartRate = max >= 100 && max <= 240 ? max : 0;
        if (heartMini != null) { heartMini.setText(value>0?"♥  "+value+" bpm  ›":WorkoutHealthService.running?"♥  In attesa del sensore  ›":"♥  Sensori  ›");heartMini.setTextColor(zoneColor(value,maxHeartRate)); }
        if (heartDial != null) heartDial.setReading(value,maxHeartRate);
        if (heartValue != null) { heartValue.setText(value>0?String.valueOf(value):"--");heartValue.setTextColor(zoneColor(value,maxHeartRate)); }
        if (zoneValue != null) {
            String label = maxHeartRate == 0 ? "Imposta FC max sul telefono" : value == 0 ? "In attesa del sensore" : ((double)value/maxHeartRate < .70 ? "LEGGERA" : (double)value/maxHeartRate < .85 ? "MODERATA" : "INTENSA") + " · " + Math.round(100.0*value/maxHeartRate) + "% FC max";
            zoneValue.setText(label); zoneValue.setTextColor(zoneColor(value,maxHeartRate));
        }
    }
    private void renderHeart(LinearLayout parent, JSONObject snapshot) {
        line(parent, "♥  Frequenza cardiaca", 12, PINK, true);
        gap(parent, 5);
        android.widget.FrameLayout face = new android.widget.FrameLayout(this);
        parent.addView(face,lp(150,130));
        heartDial = new HeartZoneDial();
        face.addView(heartDial,new android.widget.FrameLayout.LayoutParams(-1,-1));
        LinearLayout center = column(); center.setGravity(Gravity.CENTER);
        face.addView(center,new android.widget.FrameLayout.LayoutParams(-1,-1,Gravity.CENTER));
        heartValue = line(center,"--",40,WHITE,true);
        line(center,"BPM",11,SECONDARY,true);
        zoneValue=line(parent,"",11,SECONDARY,true);
        gap(parent,4);
        avgValue=line(parent,"Media —",11,SECONDARY,true);
        maxValue=line(parent,"Max —",11,SECONDARY,true);
        line(parent,"Zone indicative · 70% / 85% FC max",9,SECONDARY,false);
        updateHeart(snapshot);
    }
    private final class HeartZoneDial extends View {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private int value, max;
        HeartZoneDial() { super(WatchActivity.this); }
        void setReading(int bpm,int maximum) { if (value==bpm && max==maximum)return;value=bpm;max=maximum;invalidate(); }
        @Override protected void onDraw(Canvas c) {
            super.onDraw(c); float cx=getWidth()/2f, cy=getHeight()/2f+dp(5), r=Math.min(getWidth(),getHeight())/2f-dp(10);
            RectF a=new RectF(cx-r,cy-r,cx+r,cy+r);
            float start=150f, sweep=240f;
            // Scale 40–100% of configurable HRmax. Below 40% clamps to the left.
            float[] ends={0f,.50f,.75f,1f}; int[] colors={GREEN,YELLOW,Color.rgb(255,84,104)};
            p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(8));p.setStrokeCap(Paint.Cap.ROUND);
            for(int i=0;i<3;i++){p.setColor(colors[i]);p.setAlpha(max>0?255:90);c.drawArc(a,start+sweep*ends[i]+3,sweep*(ends[i+1]-ends[i])-6,false,p);}
            p.setAlpha(255);
            if(value>0&&max>0){double angle=Math.toRadians(start+sweep*Math.max(0,Math.min(1.0,((double)value/max-.40)/.60)));float x=cx+r*(float)Math.cos(angle),y=cy+r*(float)Math.sin(angle);p.setStyle(Paint.Style.FILL);p.setColor(BG);c.drawCircle(x,y,dp(6),p);p.setColor(WHITE);c.drawCircle(x,y,dp(4),p);}
        }
    }

    private void go(int next) { page=next; autoRecovery=false; lastSignature=""; render(); }
    private void renderMenu(LinearLayout parent, JSONObject snapshot, String connection) {
        TextView name=line(parent,snapshot.optString("workout","Allenamento"),16,WHITE,true); name.setSingleLine(true);name.setEllipsize(android.text.TextUtils.TruncateAt.END);
        liveSummary=line(parent,"",10,GREEN,true);
        gap(parent,8);
        String[] labels={"Serie","Recupero","Battito","Attività","Progresso","Termina"};
        int[] colors={GREEN,BLUE,PINK,AMBER,PURPLE,Color.rgb(241,76,77)};
        LinearLayout rr=row();rr.setGravity(Gravity.CENTER);parent.addView(rr,lp(-1,-2));
        for(int col=0;col<2;col++) {
            final int item=menuPage*2+col;
            LinearLayout tile=column();tile.setGravity(Gravity.CENTER);rr.addView(tile,new LinearLayout.LayoutParams(0,dp(83),1));
            BubbleIcon bubble=new BubbleIcon(item,colors[item]);tile.addView(bubble,lp(60,60));
            gap(tile,4);
            TextView caption=line(tile,labels[item],12,WHITE,true);caption.setSingleLine(true);
            tile.setContentDescription(labels[item]);tile.setClickable(true);tile.setFocusable(true);
            tile.setOnClickListener(v->{if(item==5) finishSession(getSnapshot()); else go(item);});
        }
        gap(parent,4);
        LinearLayout nav=row();nav.setGravity(Gravity.CENTER);parent.addView(nav,lp(-1,40));
        Button prev=button("‹",PANEL,WHITE,()->navigate(-1));prev.setContentDescription("Menu precedente");nav.addView(prev,lp(42,38));
        TextView dots=text((menuPage==0?"● ○ ○":menuPage==1?"○ ● ○":"○ ○ ●")+"\n"+(menuPage+1)+" / "+MENU_PAGES,11,WHITE,true);nav.addView(dots,new LinearLayout.LayoutParams(0,dp(40),1));
        Button next=button("›",PANEL,WHITE,()->navigate(1));next.setContentDescription("Menu successivo");nav.addView(next,lp(42,38));
        line(parent,"Scorri a sinistra o destra",10,SECONDARY,false);
        line(parent,WorkoutHealthService.tracking?"Sensori attivi":WorkoutHealthService.running?"Avvio sensori...":connection,9,WorkoutHealthService.tracking?GREEN:SECONDARY,false);
    }
    /** Glossy spherical menu icons. Canvas shaders keep the same appearance at every density. */
    private final class BubbleIcon extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final int item, color;
        BubbleIcon(int i, int c) { super(WatchActivity.this); item=i; color=c; }
        @Override protected void onDraw(Canvas c) {
            super.onDraw(c);
            float size = Math.min(getWidth(), getHeight());
            if (size <= 0) return;
            c.save(); c.translate((getWidth()-size)/2f,(getHeight()-size)/2f); c.scale(size/48f,size/48f);
            paint.setStyle(Paint.Style.FILL); paint.setShader(null);
            // A dark lower edge gives the circular button real visual depth without a bitmap.
            paint.setColor(blend(color,Color.BLACK,.70f)); c.drawCircle(24,25,22.5f,paint);
            paint.setShader(new android.graphics.RadialGradient(16,11,38,
                    new int[]{blend(color,Color.WHITE,.60f),blend(color,Color.WHITE,.20f),color,blend(color,Color.BLACK,.43f),blend(color,Color.BLACK,.69f)},
                    new float[]{0f,.24f,.47f,.78f,1f},android.graphics.Shader.TileMode.CLAMP));
            c.drawCircle(24,23.5f,22.3f,paint);
            paint.setShader(null);
            // Thin light rim and a localized specular reflection on the upper-left dome.
            paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(.85f);
            paint.setShader(new android.graphics.LinearGradient(5,2,41,45,
                    new int[]{0xDFFFFFFF,0x37FFFFFF,0x06000000,0x45FFFFFF},
                    new float[]{0f,.32f,.70f,1f},android.graphics.Shader.TileMode.CLAMP));
            c.drawCircle(24,23.5f,21.7f,paint);
            paint.setStyle(Paint.Style.FILL);
            c.save(); android.graphics.Path sphere = new android.graphics.Path(); sphere.addCircle(24,23.5f,21.6f,android.graphics.Path.Direction.CW); c.clipPath(sphere);
            paint.setShader(new android.graphics.RadialGradient(15.5f,7.5f,19f,
                    new int[]{0xA8FFFFFF,0x40FFFFFF,0x00FFFFFF},new float[]{0f,.34f,1f},android.graphics.Shader.TileMode.CLAMP));
            c.drawOval(4,2,36,22,paint);
            paint.setShader(new android.graphics.LinearGradient(0,35,0,45,0x00FFFFFF,0x30FFFFFF,android.graphics.Shader.TileMode.CLAMP));
            c.drawOval(11,36,38,45,paint); c.restore();
            // Draw the glyph twice: dark depth underneath, then a clean enamel face.
            paint.setShader(null); paint.setStrokeWidth(3.2f); paint.setStrokeCap(Paint.Cap.ROUND); paint.setStrokeJoin(Paint.Join.ROUND);
            c.save(); c.translate(0,1.35f); paint.setColor(0x66000000); drawGlyph(c); c.restore();
            paint.setColor(Color.WHITE);
            paint.setShader(new android.graphics.LinearGradient(0,10,0,36,Color.WHITE,0xFFE2E9F1,android.graphics.Shader.TileMode.CLAMP));
            drawGlyph(c); paint.setShader(null); paint.setStyle(Paint.Style.FILL);
            c.restore();
        }
        private void drawGlyph(Canvas c) {
            if(item==0){paint.setStyle(Paint.Style.STROKE);c.drawLine(15,24,33,24,paint);c.drawLine(12,17,12,31,paint);c.drawLine(17,14,17,34,paint);c.drawLine(31,14,31,34,paint);c.drawLine(36,17,36,31,paint);}
            else if(item==1){paint.setStyle(Paint.Style.STROKE);c.drawCircle(24,25,11,paint);c.drawLine(24,25,24,18,paint);c.drawLine(24,25,30,25,paint);c.drawLine(21,10,27,10,paint);}
            else if(item==2){paint.setStyle(Paint.Style.FILL);android.graphics.Path p=new android.graphics.Path();p.moveTo(24,34);p.cubicTo(7,23,10,11,19,14);p.quadTo(23,15,24,19);p.quadTo(28,10,34,15);p.cubicTo(43,23,33,29,24,34);c.drawPath(p,paint);}
            else if(item==3){paint.setStyle(Paint.Style.FILL);android.graphics.Path p=new android.graphics.Path();p.moveTo(25,9);p.cubicTo(25,21,39,20,34,33);p.cubicTo(30,43,13,37,14,27);p.quadTo(14,20,22,15);p.quadTo(21,24,25,25);p.quadTo(29,20,25,9);c.drawPath(p,paint);}
            else if(item==4){paint.setStyle(Paint.Style.STROKE);c.drawArc(11,11,37,37,-90,270,false,paint);c.drawArc(17,17,31,31,-90,220,false,paint);c.drawArc(22,22,26,26,0,360,false,paint);}
            else{paint.setStyle(Paint.Style.FILL);c.drawRoundRect(16,16,32,32,3,3,paint);}
        }
    }
    private int blend(int a,int b,float f){return Color.rgb(Math.round(Color.red(a)*(1-f)+Color.red(b)*f),Math.round(Color.green(a)*(1-f)+Color.green(b)*f),Math.round(Color.blue(a)*(1-f)+Color.blue(b)*f));}
    private String metric(int n){return n>0?String.valueOf(n):"—";}
    private void updateMetrics(JSONObject snapshot){
        boolean active=WorkoutHealthService.running;
        String kcal=active&&WorkoutHealthService.kcal>=0?String.valueOf(Math.round(WorkoutHealthService.kcal)):"—";
        String duration=active&&WorkoutHealthService.activeAnchor>0?clock(WorkoutHealthService.durationMs()/1000):"—";
        if(calorieValue!=null)calorieValue.setText(kcal);
        if(elapsedValue!=null)elapsedValue.setText(duration);
        if(avgValue!=null)avgValue.setText("Media "+(active?metric(WorkoutHealthService.avgBpm):"—")+" bpm");
        if(maxValue!=null)maxValue.setText("Max "+(active?metric(WorkoutHealthService.maxBpm):"—")+" bpm");
        if(stepValue!=null)stepValue.setText(active&&WorkoutHealthService.steps>=0?String.valueOf(WorkoutHealthService.steps):"—");
        if(liveSummary!=null)liveSummary.setText((currentBpm()>0?"♥ "+currentBpm()+"  ·  ":"")+duration+"  ·  "+kcal+" kcal");
    }
    private TextView metricTile(LinearLayout parent,String label,String initial,int accent){
        LinearLayout tile=column();tile.setGravity(Gravity.CENTER);tile.setBackground(shape(PANEL,15));tile.setPadding(dp(2),dp(3),dp(2),dp(3));
        LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(0,dp(49),1);params.setMargins(dp(2),dp(2),dp(2),dp(2));parent.addView(tile,params);
        TextView val=line(tile,initial,20,accent,true);line(tile,label,9,SECONDARY,false);return val;
    }
    private void renderCalories(LinearLayout parent) {
        line(parent,WorkoutHealthService.exerciseLabel.isEmpty()?"Attività":WorkoutHealthService.exerciseLabel,15,WHITE,true);gap(parent,7);
        LinearLayout top=row();parent.addView(top,lp(-1,-2));elapsedValue=metricTile(top,"TOTALE SENSORI", "—",BLUE);calorieValue=metricTile(top,"KCAL TOTALI","—",AMBER);
        LinearLayout bottom=row();parent.addView(bottom,lp(-1,-2));stepValue=metricTile(bottom,"PASSI","—",GREEN);
        LinearLayout heart=column();heart.setGravity(Gravity.CENTER);heart.setBackground(shape(PANEL,15));LinearLayout.LayoutParams hp=new LinearLayout.LayoutParams(0,dp(49),1);hp.setMargins(dp(2),dp(2),dp(2),dp(2));bottom.addView(heart,hp);TextView icon=line(heart,"♥",20,PINK,true);line(heart,"BATTITO",9,SECONDARY,false);heart.setOnClickListener(v->go(2));
        gap(parent,5);line(parent,"Dati Health Services. Le calorie includono il metabolismo basale.",10,SECONDARY,false);
        line(parent,"— = dato non disponibile",9,SECONDARY,false);updateMetrics(getSnapshot());
    }

    private void ensureHealth(JSONObject snapshot) {
        String id = snapshot.optString("sessionId");
        if (!visible || id.isEmpty() || !snapshot.optBoolean("autoWatchHealth",true) || permissionDialog || WorkoutHealthService.running || WatchStore.finishPending(this,id)) return;
        if (id.equals(getPreferences(MODE_PRIVATE).getString("manualHealthStop", ""))) return;
        if (id.equals(autoAttemptedSession)) return;
        if (System.currentTimeMillis()-autoHealthAttemptAt<2000) return;
        autoHealthAttemptAt=System.currentTimeMillis(); autoAttemptedSession=id;
        startHealth(id);
    }
    private void startHealth(String id) {
        if (!visible || id.isEmpty() || WorkoutHealthService.running) return;
        if (!hasHeartPermission() || checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            if (!permissionDialog) {permissionDialog=true;requestPermissions(new String[]{heartPermission(), Manifest.permission.ACTIVITY_RECOGNITION}, SENSOR_PERMISSION);}
            return;
        }
        unregisterHeart();
        try { startForegroundService(new Intent(this, WorkoutHealthService.class).putExtra("sessionId", id)); }
        catch (Exception e) { lineWarning("Impossibile avviare rilevazione. Controlla i permessi."); }
    }
    private void toggleHealth() {
        String activeId = getSnapshot().optString("sessionId");
        if (WorkoutHealthService.running) {
            getPreferences(MODE_PRIVATE).edit().putString("manualHealthStop",activeId).apply();
            startService(new Intent(this, WorkoutHealthService.class).setAction("STOP"));
            return;
        }
        getPreferences(MODE_PRIVATE).edit().remove("manualHealthStop").apply();
        autoAttemptedSession=activeId;
        startHealth(activeId);
    }

    private void renderOverview(LinearLayout parent, JSONObject snapshot) {
        line(parent, "RIEPILOGO SEDUTA", 15, WHITE, true);
        gap(parent, 10);
        line(parent, snapshot.optString("workout"), 17, WHITE, true);
        gap(parent, 9);
        int[] counts = count(snapshot);
        android.widget.FrameLayout dial=new android.widget.FrameLayout(this); parent.addView(dial,lp(114,114));
        ProgressArc arc=new ProgressArc(GREEN);arc.setFraction(counts[1]>0?(float)counts[0]/counts[1]:0);dial.addView(arc,new android.widget.FrameLayout.LayoutParams(-1,-1));
        TextView total=text(counts[0]+" / "+counts[1],25,GREEN,true);dial.addView(total,new android.widget.FrameLayout.LayoutParams(-1,-1,Gravity.CENTER));
        line(parent, "serie allenanti completate", 11, SECONDARY, false);
        showProgress(parent,snapshot);
        gap(parent, 8);
        if (snapshot.optString("workStartedAt", "").isEmpty()) {
            line(parent, "Warm-up escluso dal tempo di lavoro", 11, SECONDARY, false);
            parent.addView(button("Inizia serie allenanti", BLUE, WHITE,
                () -> timerCommand("start_work", snapshot)), lp(-1,46));
        } else {
            long seconds = Math.max(0L, (long)snapshot.optDouble("trainingSeconds", 0));
            String workTime = String.format(java.util.Locale.ROOT, "%02d:%02d", seconds / 60, seconds % 60);
            line(parent, "LAVORO " + workTime + (snapshot.optBoolean("workPaused") ? " - PAUSA" : ""), 15, GREEN, true);
            line(parent, "Tempo aggiornato dal telefono", 10, SECONDARY, false);
        }
        gap(parent, 10);
        line(parent, snapshot.optString("gymName", ""), 11, SECONDARY, false);
        gap(parent, 12);
        String message = WatchStore.finishError(this,snapshot.optString("sessionId"));
        if(message.isEmpty()) message=WatchStore.lastMessage(this);
        if (!message.isEmpty()) line(parent, message, 11, YELLOW, false);
        gap(parent,8); parent.addView(button("Termina allenamento",GREEN,BG,()->finishSession(snapshot)),lp(-1,46));
        gap(parent,6); parent.addView(button(keepDisplay?"Schermo sempre attivo: sì":"Schermo sempre attivo: no",PANEL,WHITE,()->{
            keepDisplay=!keepDisplay;getPreferences(MODE_PRIVATE).edit().putBoolean("keepDisplay",keepDisplay).apply();maintainSession(getSnapshot());lastSignature="";render();
        }),lp(-1,44));
    }

    private void maintainSession(JSONObject snapshot) {
        boolean active=!snapshot.optString("sessionId").isEmpty();
        if(active && keepDisplay) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if(!active || !visible) return;
        long now=System.currentTimeMillis();
        if(!WatchSessionService.running && now-lastServiceAttempt>15000) {
            lastServiceAttempt=now;
            try {startForegroundService(new Intent(this,WatchSessionService.class));} catch(Exception ignored) { }
        }
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED && !permissionDialog && !getPreferences(MODE_PRIVATE).getBoolean("notifAsked",false)) {
            getPreferences(MODE_PRIVATE).edit().putBoolean("notifAsked",true).apply();
            permissionDialog=true;
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIF_PERMISSION);
        }
    }
    private void finishSession(JSONObject snapshot) {
        String id=snapshot.optString("sessionId");
        if(id.isEmpty()||WatchStore.finishPending(this,id)||id.equals(WorkoutHealthService.savingSession)) return;
        go(CLOSE);
    }
    private void renderClose(LinearLayout parent, JSONObject snapshot) {
        String id=snapshot.optString("sessionId");
        int[] c=count(snapshot); boolean incomplete=c[0]<c[1];
        line(parent,"Termina allenamento",16,WHITE,true);
        line(parent,c[0]+" / "+c[1]+" completate",11,SECONDARY,false);
        gap(parent,7);
        parent.addView(button("Salva",GREEN,BG,()->{
            if(incomplete) new AlertDialog.Builder(this).setTitle("Salvare seduta incompleta?").setMessage("Le serie completate saranno registrate.").setNegativeButton("Annulla",null).setPositiveButton("Salva",(d,b)->closeSession(id,false,true)).show();
            else closeSession(id,false,false);
        }),lp(-1,42));
        gap(parent,5);
        parent.addView(button("Scarta sessione",Color.rgb(195,45,65),WHITE,()->new AlertDialog.Builder(this).setTitle("Scartare la seduta?").setMessage("Non verra salvata nello storico ne esportata in Salute.").setNegativeButton("Continua",null).setPositiveButton("Scarta",(d,b)->closeSession(id,true,false)).show()),lp(-1,42));
        gap(parent,5);
        parent.addView(button("Continua allenamento",PANEL,WHITE,()->go(0)),lp(-1,42));
    }
    private void closeSession(String id,boolean discard,boolean incomplete) {
        if(!id.equals(getSnapshot().optString("sessionId"))||WatchStore.finishPending(this,id)||id.equals(WorkoutHealthService.savingSession)) {lineWarning("Sessione cambiata: riprova");return;}
        if(!discard && WatchStore.trainingPending(this)>0) {lineWarning("Attendi la sincronizzazione delle serie. Apri l'app sul telefono.");return;}
        try {
            if(WorkoutHealthService.running) {
                WorkoutHealthService.savingSession=id;
                try { startService(new Intent(this,WorkoutHealthService.class).setAction(discard?"DISCARD":"SAVE").putExtra("sessionId",id).putExtra("allowIncomplete",incomplete)); }
                catch(Exception e){WorkoutHealthService.savingSession="";lineWarning("Riprova la chiusura");return;}
                lastSignature="";render();return;
            }
            JSONObject cmd=new JSONObject().put("kind",discard?"discard":"finish").put("sessionId",id).put("allowIncomplete",incomplete);
            if(WatchStore.postCommand(this,cmd)){lastSignature="";render();}else lineWarning("Coda piena, riprova");
        }catch(Exception e){lineWarning("Impossibile terminare la seduta");}
    }
    private void showProgress(LinearLayout parent,JSONObject snapshot) {
        int[] c=count(snapshot); gap(parent,5);
        android.widget.ProgressBar bar=new android.widget.ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        bar.setMax(Math.max(1,c[1]));bar.setProgress(c[0]);bar.setProgressTintList(ColorStateList.valueOf(GREEN));bar.setProgressBackgroundTintList(ColorStateList.valueOf(PANEL));
        parent.addView(bar,lp(-1,6));gap(parent,3);
        line(parent,c[0]+" / "+c[1]+"  ·  PROGRESSO",9,SECONDARY,true);
    }
    private class ProgressArc extends View {
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG); private final int color; private float fraction;
        ProgressArc(int c){super(WatchActivity.this);color=c;}
        void setFraction(float f){fraction=Math.max(0,Math.min(1,f));invalidate();}
        @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float inset=dp(7);RectF r=new RectF(inset,inset,getWidth()-inset,getHeight()-inset);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(dp(6));paint.setStrokeCap(Paint.Cap.ROUND);paint.setColor(PANEL);canvas.drawArc(r,-90,360,false,paint);paint.setColor(color);canvas.drawArc(r,-90,360*fraction,false,paint);}
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
        permissionDialog=false;
        if (requestCode == NOTIF_PERMISSION) {
            if(grantResults.length>0 && grantResults[0]==PackageManager.PERMISSION_GRANTED && !getSnapshot().optString("sessionId").isEmpty()) {try{startForegroundService(new Intent(this,WatchSessionService.class));}catch(Exception ignored){}}
            lastSignature="";return;
        }
        if (requestCode == SENSOR_PERMISSION) {
            if (hasHeartPermission() && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) {
                handler.postDelayed(() -> startHealth(getSnapshot().optString("sessionId")), 500);
            }
            lastSignature = "";
            render();
        }
    }
}
