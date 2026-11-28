package it.omcr.gymtracker.wear;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.content.pm.PackageManager;

/** One tap fallback if Wear OS cannot open the activity remotely. */
final class WatchLaunchNotification {
    static final int ID = 982;
    static void offer(Context c, String id) {
        try {
            if (WatchSessionService.running) return;
            if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
            NotificationManager n = c.getSystemService(NotificationManager.class);
            if (n == null) return;
            n.createNotificationChannel(new NotificationChannel("gym_launch", "Avvio allenamento", NotificationManager.IMPORTANCE_DEFAULT));
            Intent i = new Intent(c, WatchActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent open = PendingIntent.getActivity(c, ID, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            n.notify(ID, new Notification.Builder(c, "gym_launch").setSmallIcon(R.drawable.ic_workout)
                .setContentTitle("GymTracker · Allenamento pronto").setContentText("Tocca per iniziare dal polso")
                .setContentIntent(open).setAutoCancel(true).setLocalOnly(true).build());
        } catch (Exception ignored) { }
    }
    static void clear(Context c) { try { c.getSystemService(NotificationManager.class).cancel(ID); } catch (Exception ignored) { } }
}
