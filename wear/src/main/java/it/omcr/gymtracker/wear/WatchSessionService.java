package it.omcr.gymtracker.wear;

import android.app.*;
import android.content.Intent;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.wear.ongoing.OngoingActivity;
import org.json.JSONObject;

/** Keeps the active session accessible, independently of optional health sensors. */
public final class WatchSessionService extends Service {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wake;
    private long wakeEnd;
    private String session = "";
    public static volatile boolean running;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            JSONObject s = WatchStore.displaySnapshot(WatchSessionService.this);
            WatchStore.retryPending(WatchSessionService.this);
            if (!session.equals(s.optString("sessionId"))) { stopSelf(); return; }
            long end = s.optLong("timerEnd"), now = System.currentTimeMillis();
            if (end > now && end != wakeEnd) {
                releaseWake();
                PowerManager pm = getSystemService(PowerManager.class);
                if (pm != null) {
                    wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GymTracker:Recovery");
                    wake.setReferenceCounted(false);
                    wake.acquire(Math.min(end-now+3000, 10*60*1000L));
                    wakeEnd = end;
                }
            } else if (end <= now) releaseWake();
            WatchStore.buzzIfDue(WatchSessionService.this, end);
            handler.postDelayed(this, 1000);
        }
    };
    @Override public IBinder onBind(Intent i) { return null; }
    @Override public int onStartCommand(Intent i, int flags, int startId) {
        JSONObject s = WatchStore.displaySnapshot(this);
        session = s.optString("sessionId");
        if (session.isEmpty()) { stopSelf(); return START_NOT_STICKY; }
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            nm.createNotificationChannel(new NotificationChannel("gym_session", "Sessione GymTracker", NotificationManager.IMPORTANCE_LOW));
            Intent launch = new Intent(this, WatchActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent open = PendingIntent.getActivity(this, 20, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder b = new NotificationCompat.Builder(this, "gym_session")
                .setSmallIcon(R.drawable.ic_workout).setContentTitle("GymTracker · " + s.optString("workout"))
                .setContentText("Allenamento in corso · Tocca per tornare")
                .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE);
            OngoingActivity ongoing = new OngoingActivity.Builder(this, 981, b)
                .setStaticIcon(R.drawable.ic_workout).setTouchIntent(open).build();
            ongoing.apply(this);
            startForeground(981, b.build());
            running = true;
            handler.removeCallbacks(tick); handler.post(tick);
        } catch (Exception ex) { running = false; stopSelf(); }
        return START_NOT_STICKY;
    }
    private void releaseWake() {
        if (wake != null && wake.isHeld()) wake.release();
        wake = null; wakeEnd = 0;
    }
    @Override public void onDestroy() {
        handler.removeCallbacks(tick); releaseWake(); running = false;
        stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy();
    }
}
