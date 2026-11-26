package it.omcr.gymtracker;

import androidx.activity.ComponentActivity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONObject;
import java.lang.ref.WeakReference;

import java.io.OutputStream;

public class MainActivity extends ComponentActivity {
    private static final int REQUEST_FILE_CHOOSER = 2001;
    private static final int REQUEST_SAVE_FILE = 2002;

    private static WeakReference<MainActivity> current = new WeakReference<>(null);
    private boolean watchWebReady = false;
    private boolean foreground = false;
    private boolean watchOpenedThisResume = false;
    private String lastOpenedSession = "";
    private long lastRemoteAttempt = 0;
    private boolean remoteOpening = false;
    private String remoteStatus = "";

    // RemoteActivityHelper is the official phone-to-Wear activity launch route.
    // This only opens the UI; the watch validates the actual session via Data Layer.
    private void openWatch(String session, boolean force) {
        if (!foreground || !watchWebReady || remoteOpening) return;
        if (!force && watchOpenedThisResume && session.equals(lastOpenedSession)) return;
        if (!force && System.currentTimeMillis() - lastRemoteAttempt < 1800) {
            webView.postDelayed(() -> {
                try {JSONObject latest = new JSONObject(PhoneWearSync.snapshotJson(MainActivity.this)); if (latest.optBoolean("autoOpenWatch",true) && session.equals(latest.optString("sessionId"))) openWatch(session,false); } catch(Exception ignored) { }
            }, 1900); return;
        }
        lastRemoteAttempt = System.currentTimeMillis();
        watchOpenedThisResume = true; lastOpenedSession = session; remoteOpening = true;
        try {
            Intent target = new Intent(Intent.ACTION_VIEW, Uri.parse("gymtracker://watch/open"))
                    .addCategory(Intent.CATEGORY_BROWSABLE);
            java.util.concurrent.Executor executor = this::runOnUiThread;
            androidx.wear.remote.interactions.RemoteActivityHelper helper =
                    new androidx.wear.remote.interactions.RemoteActivityHelper(this, executor);
            com.google.common.util.concurrent.ListenableFuture<Void> future = helper.startRemoteActivity(target, null);
            future.addListener(() -> {
                remoteOpening = false;
                try { future.get(); remoteStatus = "Apertura inviata al Watch"; }
                catch (Exception e) { remoteStatus = "Watch non raggiungibile: aprilo dalla notifica o riprova"; }
                if (foreground) {
                    try {
                        JSONObject latest = new JSONObject(PhoneWearSync.snapshotJson(MainActivity.this));
                        String active = latest.optString("sessionId");
                        if (latest.optBoolean("autoOpenWatch",true) && !active.isEmpty() && !active.equals(session)) openWatch(active, false);
                    } catch (Exception ignored) { }
                }
            }, executor);
        } catch (Exception e) { remoteOpening = false; remoteStatus = "Apertura remota non disponibile"; }
    }
    private void openWatchIfEnabled() {
        if (!foreground || !watchWebReady) return;
        try {
            JSONObject s = new JSONObject(PhoneWearSync.snapshotJson(this));
            if (s.optBoolean("autoOpenWatch", true)) openWatch(s.optString("sessionId"), false);
        } catch (Exception ignored) { }
    }
    private WebView webView;
    private HealthConnectBridge health;
    private ValueCallback<Uri[]> filePathCallback;
    private byte[] pendingSaveBytes;
    private String pendingSaveName;
    private String pendingSaveMime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = new WeakReference<>(this);
        health = new HealthConnectBridge(this, this::deliverHealthResult);

        getWindow().setStatusBarColor(Color.rgb(11, 15, 20));
        getWindow().setNavigationBarColor(Color.rgb(11, 15, 20));
        getWindow().getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(11, 15, 20));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if (("file".equalsIgnoreCase(scheme) && uri.toString().startsWith("file:///android_asset/www/")) || "about".equalsIgnoreCase(scheme) || "javascript".equalsIgnoreCase(scheme)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Exception ignored) {
                    return true; // Never load an external page with the native bridge attached.
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, REQUEST_FILE_CHOOSER);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "Impossibile aprire il selettore file", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/www/index.html");
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void deliverHealthResult(String json) {
        if (webView != null) webView.evaluateJavascript("window.GymHealth && window.GymHealth.receive(" + JSONObject.quote(json) + ");", null);
    }

    public static void onWearInboxChanged() {
        MainActivity activity = current.get();
        if (activity != null) activity.runOnUiThread(activity::deliverWearInbox);
    }

    private void deliverWearInbox() {
        if (!watchWebReady || webView == null) return;
        String pending = PhoneWearSync.getPendingJson(this);
        if ("[]".equals(pending)) return;
        String js = "window.GymWatchBridge && window.GymWatchBridge.consumePending(" + JSONObject.quote(pending) + ");";
        webView.evaluateJavascript(js, null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true; watchOpenedThisResume = false;
        if (webView != null) webView.postDelayed(() -> {
            deliverWearInbox(); openWatchIfEnabled();
            if (watchWebReady) webView.evaluateJavascript("window.GymHealth && window.GymHealth.onForeground();", null);
        }, 350);
    }

    @Override protected void onPause() { foreground = false; super.onPause(); }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_FILE_CHOOSER) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }

        if (requestCode == REQUEST_SAVE_FILE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingSaveBytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new IllegalStateException("OutputStream non disponibile");
                    out.write(pendingSaveBytes);
                    out.flush();
                    Toast.makeText(this, "File salvato", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Errore durante il salvataggio", Toast.LENGTH_LONG).show();
                }
            }
            pendingSaveBytes = null;
            pendingSaveName = null;
            pendingSaveMime = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (health != null) health.close();
        if (current.get() == this) current = new WeakReference<>(null);
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
        }
        super.onDestroy();
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void healthAction(String action, String payload) {
            runOnUiThread(() -> { if (health != null) health.action(action, payload); });
        }

        @JavascriptInterface public boolean queueHealthExport(String payload, long revision) {
            return HealthAutoExport.enqueue(getApplicationContext(),payload,revision);
        }
        @JavascriptInterface public String getHealthExportResult(String id) {
            return HealthAutoExport.status(getApplicationContext(),id);
        }
        @JavascriptInterface public void forgetHealthExport(String id,long revision) {
            HealthAutoExport.forget(getApplicationContext(),id,revision);
        }
        @JavascriptInterface public void setHealthAutoExport(boolean enabled) {
            HealthAutoExport.setEnabled(getApplicationContext(),enabled);
        }

        @JavascriptInterface
        public void publishWatchState(String snapshot) {
            PhoneWearSync.publishSnapshot(getApplicationContext(), snapshot);
            runOnUiThread(() -> {
                try {
                    JSONObject s = new JSONObject(snapshot);
                    String session = s.optString("sessionId");
                    // Reopen for a NEW workout, not when the user finishes one.
                    if (s.optBoolean("autoOpenWatch", true) && (!watchOpenedThisResume || (!session.isEmpty() && !session.equals(lastOpenedSession)))) openWatch(session, false);
                } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public String getWatchStatus() {
            try { return new JSONObject(PhoneWearSync.statusJson(getApplicationContext())).put("remote", remoteStatus).toString(); }
            catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void openWatchNow() {
            runOnUiThread(() -> {
                try { openWatch(new JSONObject(PhoneWearSync.snapshotJson(MainActivity.this)).optString("sessionId"), true); }
                catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public void watchReady() {
            runOnUiThread(() -> {
                watchWebReady = true;
                deliverWearInbox();
                openWatchIfEnabled();
            });
        }

        @JavascriptInterface
        public void ackWatchCommand(String id, String status, String message) {
            PhoneWearSync.ackApplied(getApplicationContext(), id, status, message);
        }

        @JavascriptInterface
        public void saveBase64File(String fileName, String mimeType, String base64Data) {
            try {
                byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
                runOnUiThread(() -> launchSavePicker(fileName, mimeType, decoded));
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Impossibile preparare il file", Toast.LENGTH_LONG).show());
            }
        }
    }

    private void launchSavePicker(String fileName, String mimeType, byte[] bytes) {
        pendingSaveBytes = bytes;
        pendingSaveName = (fileName == null || fileName.trim().isEmpty()) ? "gym-tracker-export.json" : fileName;
        pendingSaveMime = (mimeType == null || mimeType.trim().isEmpty()) ? "application/octet-stream" : mimeType;

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(pendingSaveMime);
        intent.putExtra(Intent.EXTRA_TITLE, pendingSaveName);
        startActivityForResult(intent, REQUEST_SAVE_FILE);
    }
}
