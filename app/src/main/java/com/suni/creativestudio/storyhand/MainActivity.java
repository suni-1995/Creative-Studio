package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.app.AlertDialog;
import android.print.PrintManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.Manifest;
import android.content.pm.PackageManager;
import android.media.MediaPlayer;
import android.media.MediaMetadataRetriever;
import android.database.Cursor;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.widget.TextView;

import java.io.OutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;
import java.util.zip.ZipInputStream;
import org.json.JSONObject;
import org.json.JSONArray;

public class MainActivity extends Activity {
    private static final int REQ_FILE = 1001;
    private static final int REQ_SAVE = 1002;
    private static final int REQ_ZIP_IMPORT = 1003;
    private static final int REQ_BACKUP_DIR = 1004;
    private static final int REQ_AUDIO_PERMISSION = 1005;
    private static final int REQ_NOTIFICATION_PERMISSION = 1006;
    private static final int REQ_PROJECT_MUSIC = 1007;
    private static final int REQ_DELETE_DEVICE_MUSIC = 1008;
    private boolean deviceMusicDeletionPending = false;
    private WebView webView;
    private final Object printHtmlLock = new Object();
    private WebView activePdfWebView;
    private StringBuilder pendingPrintHtml = null;
    private String pendingPrintTitle = "";
    private View splashView;
    private long splashStartedAt;
    private volatile boolean appDarkMode = false;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingSaveBytes;
    private String pendingSaveMime = "application/octet-stream";
    private String pendingSaveName = "file";
    private File pendingSaveFile;
    private ZipOutputStream activeZipOut;
    private File activeZipTemp;
    private ZipFile restoreZipFile;
    private File restoreZipTemp;
    private List<ZipEntry> restoreZipEntries = new ArrayList<>();
    private int restoreZipIndex = 0;
    private final Set<String> activeProjectMusicBackupIds = new HashSet<>();
    private File restoreProjectMusicTempDir;
    private String pendingProjectMusicExportId = "";
    private boolean backupFolderChangeOnly = false;

    // MP3 experiment branch: playback is owned by a foreground service so it can continue in background.
    private MediaPlayer musicPlayer; // legacy field kept unused for source compatibility with older helper methods.
    private String musicCurrentUri = "";
    private boolean musicPrepared = false;
    private String musicLibraryCache = "[]";
    private boolean musicShuffleMode = false;
    private String musicRepeatMode = "off";
    private String musicAccentColor = "#5d5870";
    private boolean musicAppearanceDark = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Restore the last selected appearance before the splash is drawn.
        appDarkMode = getSharedPreferences("creative_studio_prefs", MODE_PRIVATE)
                .getBoolean("dark_mode", false);
        int startupBarColor = Color.parseColor(appDarkMode ? "#17171B" : "#F5F4F2");
        getWindow().setStatusBarColor(startupBarColor);
        getWindow().setNavigationBarColor(startupBarColor);
        int startupFlags = getWindow().getDecorView().getSystemUiVisibility();
        if (appDarkMode) {
            startupFlags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (android.os.Build.VERSION.SDK_INT >= 26) startupFlags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
            startupFlags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (android.os.Build.VERSION.SDK_INT >= 26) startupFlags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(startupFlags);

        // Resize the app when the on-screen keyboard opens.
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        // Keep the actual WebView inside the Android safe area instead of merely
        // adding padding inside the webpage. This prevents the app header from
        // being drawn underneath the status bar on edge-to-edge devices.
        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        // Keep the WebView hidden until its first page is ready. This prevents the native
        // window/WebView background from flashing between launch and the splash screen.
        webView.setAlpha(0f);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        splashStartedAt = SystemClock.elapsedRealtime();
        LinearLayout splash = new LinearLayout(this);
        splash.setOrientation(LinearLayout.VERTICAL);
        splash.setGravity(android.view.Gravity.CENTER);
        splash.setPadding(dp(28), dp(28), dp(28), dp(28));
        splash.setBackgroundColor(Color.parseColor(appDarkMode ? "#151519" : "#F5F4F2"));

        ImageView splashIcon = new ImageView(this);
        splashIcon.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(92), dp(92));
        iconLp.bottomMargin = dp(20);
        splash.addView(splashIcon, iconLp);

        TextView splashTitle = new TextView(this);
        splashTitle.setText("창작소 : 내 손안에 이야기");
        splashTitle.setTextColor(Color.parseColor(appDarkMode ? "#F2F1F5" : "#242328"));
        splashTitle.setTextSize(20);
        splashTitle.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        splashTitle.setGravity(android.view.Gravity.CENTER);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        titleLp.bottomMargin = dp(18);
        splash.addView(splashTitle, titleLp);

        ProgressBar splashProgress = new ProgressBar(this);
        LinearLayout.LayoutParams progressLp = new LinearLayout.LayoutParams(dp(34), dp(34));
        progressLp.bottomMargin = dp(10);
        splash.addView(splashProgress, progressLp);

        TextView splashLoading = new TextView(this);
        splashLoading.setText("불러오는 중…");
        splashLoading.setTextColor(Color.parseColor(appDarkMode ? "#A6A2AD" : "#77737D"));
        splashLoading.setTextSize(13);
        splashLoading.setGravity(android.view.Gravity.CENTER);
        splash.addView(splashLoading);

        splashView = splash;
        root.addView(splash, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top;
            int bottom;
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                top = bars.top;
                // When the keyboard is visible, reserve its full inset so the WebView
                // and any fixed editor modal end above the keyboard.
                bottom = Math.max(bars.bottom, ime.bottom);
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(0, top, 0, bottom);
            return insets;
        });
        root.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                // index.html is loaded under https://creative.local so existing WebView
                // localStorage keeps the same origin. Serve bundled fonts for that
                // virtual origin instead of changing the page origin (which would
                // make existing app data look missing).
                try {
                    Uri uri = Uri.parse(url);
                    if ("creative.local".equalsIgnoreCase(uri.getHost())) {
                        String path = uri.getPath();
                        if (path != null && !path.contains("..")) {
                            String assetPath = path.substring(1);
                            if (path.startsWith("/fonts/")) {
                                InputStream font = getAssets().open(assetPath);
                                return new WebResourceResponse("font/ttf", null, font);
                            }
                            if (path.startsWith("/extras/") && path.endsWith(".css")) {
                                InputStream css = getAssets().open(assetPath);
                                return new WebResourceResponse("text/css", "UTF-8", css);
                            }
                            if (path.startsWith("/extras/") && path.endsWith(".js")) {
                                InputStream js = getAssets().open(assetPath);
                                return new WebResourceResponse("application/javascript", "UTF-8", js);
                            }
                            if (path.startsWith("/extras/") && path.endsWith(".svg")) {
                                InputStream svg = getAssets().open(assetPath);
                                return new WebResourceResponse("image/svg+xml", "UTF-8", svg);
                            }
                            if (path.startsWith("/extras/") && path.endsWith(".wav")) {
                                InputStream wav = getAssets().open(assetPath);
                                return new WebResourceResponse("audio/wav", null, wav);
                            }
                        }
                    }
                } catch (Exception ignored) { }
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                long elapsed = SystemClock.elapsedRealtime() - splashStartedAt;
                long delay = Math.max(0L, 1400L - elapsed);
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (splashView != null && splashView.getParent() != null) {
                        final View fadingSplash = splashView;
                        // WebView has stayed hidden behind the splash since creation.
                        webView.setScaleX(0.992f);
                        webView.setScaleY(0.992f);
                        webView.animate()
                                .alpha(1f)
                                .scaleX(1f)
                                .scaleY(1f)
                                .setDuration(320L)
                                .setInterpolator(new android.view.animation.DecelerateInterpolator())
                                .start();
                        fadingSplash.animate()
                                .alpha(0f)
                                .setDuration(280L)
                                .setInterpolator(new android.view.animation.DecelerateInterpolator())
                                .withEndAction(() -> {
                                    if (fadingSplash.getParent() != null) {
                                        ((FrameLayout) fadingSplash.getParent()).removeView(fadingSplash);
                                    }
                                })
                                .start();
                    }
                    splashView = null;
                }, delay);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                showAppDialog(message, result, false);
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                showAppDialog(message, result, true);
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent;
                try {
                    intent = params.createIntent();
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    startActivityForResult(intent, REQ_FILE);
                } catch (Exception e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });

        webView.addJavascriptInterface(new NativeBridge(), "Android");
        loadLocalApp();
    }


    @Override
    protected void onPause() {
        super.onPause();
        // Background playback is handled by MusicPlaybackService. Do not pause here.
    }

    @Override
    protected void onResume() {
        super.onResume();
        evalJs("window.syncNativeMusicState&&window.syncNativeMusicState()");
    }

    @Override
    protected void onDestroy() {
        // Do not stop MusicPlaybackService here; playback must survive Activity destruction/backgrounding.
        releaseMusicPlayer();
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_AUDIO_PERMISSION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            evalJs("window.onMusicPermissionResult&&window.onMusicPermissionResult(" + (granted ? "true" : "false") + ")");
        } else if (requestCode == REQ_NOTIFICATION_PERMISSION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            evalJs("window.onMusicNotificationPermissionResult&&window.onMusicNotificationPermissionResult(" + (granted ? "true" : "false") + ")");
        }
    }

    private boolean hasAudioPermission() {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            return checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED;
        }
        return checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestAudioPermission() {
        runOnUiThread(() -> {
            if (hasAudioPermission()) {
                evalJs("window.onMusicPermissionResult&&window.onMusicPermissionResult(true)");
                return;
            }
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                requestPermissions(new String[]{Manifest.permission.READ_MEDIA_AUDIO}, REQ_AUDIO_PERMISSION);
            } else {
                requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, REQ_AUDIO_PERMISSION);
            }
        });
    }

    private String queryMusicLibraryJson() {
        JSONArray out = new JSONArray();
        if (!hasAudioPermission()) return out.toString();
        Uri collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String[] projection = new String[]{
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.DATE_ADDED
        };
        String selection = MediaStore.Audio.Media.IS_MUSIC + "!=0";
        String sort = MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC";
        try (Cursor c = getContentResolver().query(collection, projection, selection, null, sort)) {
            if (c == null) return out.toString();
            int idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            int titleCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
            int artistCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
            int durCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
            int mimeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
            int nameCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
            int addedCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED);
            while (c.moveToNext()) {
                long id = c.getLong(idCol);
                String title = c.getString(titleCol);
                String artist = c.getString(artistCol);
                long duration = c.getLong(durCol);
                String mime = c.getString(mimeCol);
                String name = c.getString(nameCol);
                String low = name == null ? "" : name.toLowerCase(java.util.Locale.ROOT);
                boolean extOk = low.endsWith(".mp3") || low.endsWith(".m4a") || low.endsWith(".aac") ||
                        low.endsWith(".ogg") || low.endsWith(".wav") || low.endsWith(".flac");
                boolean mimeOk = mime != null && (mime.startsWith("audio/"));
                if (!extOk && !mimeOk) continue;
                try {
                    JSONObject o = new JSONObject();
                    o.put("id", id);
                    o.put("title", (title == null || title.trim().isEmpty()) ? (name == null ? "제목 없음" : name) : title);
                    o.put("artist", (artist == null || "<unknown>".equalsIgnoreCase(artist)) ? "" : artist);
                    o.put("duration", Math.max(0, duration));
                    o.put("dateAdded", Math.max(0, c.getLong(addedCol)));
                    o.put("mime", mime == null ? "" : mime);
                    o.put("uri", Uri.withAppendedPath(collection, String.valueOf(id)).toString());
                    out.put(o);
                } catch (Exception ignored) { }
            }
        } catch (Exception ignored) { }
        musicLibraryCache = out.toString();
        return musicLibraryCache;
    }

    private void sendMusicService(Intent intent, boolean foregroundStart) {
        if (intent == null) return;
        try {
            if (foregroundStart && android.os.Build.VERSION.SDK_INT >= 26) startForegroundService(intent);
            else startService(intent);
        } catch (Exception ignored) { }
    }

    private Intent musicServiceIntent(String action) {
        return new Intent(MainActivity.this, MusicPlaybackService.class).setAction(action);
    }

    private void startMusicInService(String uri) {
        if (uri == null || uri.trim().isEmpty()) return;
        Intent i = musicServiceIntent(MusicPlaybackService.ACTION_PLAY_URI)
                .putExtra("uri", uri)
                .putExtra("playlist", musicLibraryCache)
                .putExtra("shuffle", musicShuffleMode)
                .putExtra("repeat", musicRepeatMode)
                .putExtra("color", musicAccentColor)
                .putExtra("dark", musicAppearanceDark);
        sendMusicService(i, true);
    }

    private void releaseMusicPlayer() {
        musicPrepared = false;
        if (musicPlayer != null) {
            try { musicPlayer.stop(); } catch (Exception ignored) { }
            try { musicPlayer.release(); } catch (Exception ignored) { }
            musicPlayer = null;
        }
    }

    private void playMusicUri(String uriText) {
        if (uriText == null || uriText.trim().isEmpty()) return;
        runOnUiThread(() -> {
            try {
                releaseMusicPlayer();
                musicCurrentUri = uriText;
                musicPlayer = new MediaPlayer();
                musicPlayer.setDataSource(MainActivity.this, Uri.parse(uriText));
                musicPlayer.setOnPreparedListener(mp -> {
                    musicPrepared = true;
                    mp.start();
                    evalJs("window.onNativeMusicState&&window.onNativeMusicState(true)");
                });
                musicPlayer.setOnCompletionListener(mp -> {
                    evalJs("window.onNativeMusicEnded&&window.onNativeMusicEnded()");
                });
                musicPlayer.setOnErrorListener((mp, what, extra) -> {
                    musicPrepared = false;
                    evalJs("window.onNativeMusicError&&window.onNativeMusicError()");
                    return true;
                });
                musicPlayer.prepareAsync();
            } catch (Exception e) {
                releaseMusicPlayer();
                evalJs("window.onNativeMusicError&&window.onNativeMusicError()");
            }
        });
    }

    private void pauseMusicInternal(boolean notifyJs) {
        runOnUiThread(() -> {
            if (musicPlayer != null && musicPrepared) {
                try { if (musicPlayer.isPlaying()) musicPlayer.pause(); } catch (Exception ignored) { }
            }
            if (notifyJs) evalJs("window.onNativeMusicState&&window.onNativeMusicState(false)");
        });
    }


    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void showAppDialog(String message, JsResult result, boolean confirmDialog) {
        // JS confirm()/alert() pauses the WebView JavaScript thread, so never call
        // evaluateJavascript() from here. The current theme is cached by setSystemBars().
        runOnUiThread(() -> {
            boolean dark = appDarkMode;
            int surface = Color.parseColor(dark ? "#1E1E23" : "#FFFFFF");
            int text = Color.parseColor(dark ? "#F2F1F5" : "#242328");
            int muted = Color.parseColor(dark ? "#B2AEB8" : "#706B75");
            int accent = Color.parseColor(dark ? "#A98BE0" : "#6E5A91");

            AlertDialog.Builder builder = new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message == null ? "" : message)
                    .setPositiveButton("확인", (dialog, which) -> result.confirm());
            if (confirmDialog) {
                builder.setNegativeButton("취소", (dialog, which) -> result.cancel());
            }

            AlertDialog dialog = builder.create();
            dialog.setCanceledOnTouchOutside(false);
            dialog.setOnCancelListener(d -> {
                if (confirmDialog) result.cancel();
                else result.confirm();
            });
            dialog.setOnShowListener(d -> {
                if (dialog.getWindow() != null) {
                    GradientDrawable bg = new GradientDrawable();
                    bg.setColor(surface);
                    bg.setCornerRadius(dp(22));
                    dialog.getWindow().setBackgroundDrawable(bg);
                }
                TextView msg = dialog.findViewById(android.R.id.message);
                if (msg != null) {
                    msg.setTextColor(text);
                    msg.setTextSize(16);
                    msg.setLineSpacing(0f, 1.2f);
                    msg.setPadding(dp(24), dp(22), dp(24), dp(10));
                }
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(accent);
                if (confirmDialog) {
                    dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setTextColor(muted);
                }
            });
            dialog.show();
        });
    }

    private void loadLocalApp() {
        try (InputStream in = getAssets().open("index.html"); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            String html = out.toString("UTF-8");
            webView.loadDataWithBaseURL("https://creative.local/", html, "text/html", "UTF-8", null);
        } catch (Exception e) {
            webView.loadData("<h2>창작소를 불러오지 못했습니다.</h2>", "text/html", "UTF-8");
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript("(window.handleNativeBack?window.handleNativeBack():'exit')", value -> {
            if (value == null || value.contains("exit")) {
                showExitConfirmation();
            }
        });
    }

    private void showExitConfirmation() {
        if (isFinishing()) return;

        boolean dark = appDarkMode;
        int surface = Color.parseColor(dark ? "#1D1C22" : "#FFFFFF");
        int text = Color.parseColor(dark ? "#F2F1F5" : "#242328");
        int muted = Color.parseColor(dark ? "#C5C1CA" : "#706B75");
        int line = Color.parseColor(dark ? "#35333C" : "#E5E2DF");
        int accent = Color.parseColor(dark ? "#786C94" : "#5D5870");
        int secondary = Color.parseColor(dark ? "#292830" : "#EFEDE9");

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("앱 종료")
                .setMessage("앱을 종료하시겠습니까?")
                .setNegativeButton("아니오", null)
                .setPositiveButton("예", (d, which) -> {
                    // Finish the task, not just the current WebView history. The next launch
                    // creates a fresh Activity, shows the splash, then starts at project list.
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                        finishAndRemoveTask();
                    } else {
                        finish();
                    }
                })
                .create();

        dialog.setCanceledOnTouchOutside(false);
        dialog.setOnShowListener(d -> {
            if (dialog.getWindow() != null) {
                GradientDrawable bg = new GradientDrawable();
                bg.setColor(surface);
                bg.setCornerRadius(dp(22));
                bg.setStroke(dp(1), line);
                dialog.getWindow().setBackgroundDrawable(bg);
                dialog.getWindow().getDecorView().setPadding(dp(8), dp(4), dp(8), dp(6));
            }

            int titleId = getResources().getIdentifier("alertTitle", "id", "android");
            TextView title = titleId != 0 ? dialog.findViewById(titleId) : null;
            if (title != null) {
                title.setTextColor(text);
                title.setTextSize(19);
            }

            TextView msg = dialog.findViewById(android.R.id.message);
            if (msg != null) {
                msg.setTextColor(muted);
                msg.setTextSize(15);
                msg.setLineSpacing(0f, 1.2f);
            }

            android.widget.Button noButton = dialog.getButton(AlertDialog.BUTTON_NEGATIVE);
            android.widget.Button yesButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE);

            GradientDrawable noBg = new GradientDrawable();
            noBg.setColor(secondary);
            noBg.setCornerRadius(dp(12));
            noBg.setStroke(dp(1), line);
            noButton.setBackground(noBg);
            noButton.setTextColor(text);
            noButton.setAllCaps(false);
            noButton.setMinHeight(dp(46));
            noButton.setPadding(dp(18), 0, dp(18), 0);

            GradientDrawable yesBg = new GradientDrawable();
            yesBg.setColor(accent);
            yesBg.setCornerRadius(dp(12));
            yesButton.setBackground(yesBg);
            yesButton.setTextColor(Color.WHITE);
            yesButton.setAllCaps(false);
            yesButton.setMinHeight(dp(46));
            yesButton.setPadding(dp(22), 0, dp(22), 0);

            View parent = (View) yesButton.getParent();
            if (parent instanceof LinearLayout) {
                LinearLayout buttonBar = (LinearLayout) parent;
                buttonBar.setPadding(dp(18), dp(8), dp(18), dp(16));
                noButton.setLayoutParams(new LinearLayout.LayoutParams(0, dp(46), 1f));
                yesButton.setLayoutParams(new LinearLayout.LayoutParams(0, dp(46), 1f));
                LinearLayout.LayoutParams noLp = (LinearLayout.LayoutParams) noButton.getLayoutParams();
                noLp.setMargins(0, 0, dp(6), 0);
                noButton.setLayoutParams(noLp);
                LinearLayout.LayoutParams yesLp = (LinearLayout.LayoutParams) yesButton.getLayoutParams();
                yesLp.setMargins(dp(6), 0, 0, 0);
                yesButton.setLayoutParams(yesLp);
            }
        });
        dialog.show();
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE) {
            if (fileCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            fileCallback.onReceiveValue(results);
            fileCallback = null;
        } else if (requestCode == REQ_DELETE_DEVICE_MUSIC) {
            deviceMusicDeletionPending = false;
            musicLibraryCache = "[]";
            boolean deleted = resultCode == RESULT_OK;
            evalJs("window.onDeviceMusicDeleted&&window.onDeviceMusicDeleted(" + deleted + "," + JSONObject.quote(deleted ? "휴대폰에서 선택한 음악이 삭제되었습니다." : "휴대폰 파일 삭제가 취소되었습니다.") + ")");
        } else if (requestCode == REQ_PROJECT_MUSIC) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                final Uri uri = data.getData();
                try {
                    final int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    try { getContentResolver().takePersistableUriPermission(uri, flags); } catch (Exception ignored) { }
                    new Thread(() -> {
                        try {
                            JSONObject meta = importProjectMusicUri(uri);
                            evalJs("window.onProjectMusicFilePicked&&window.onProjectMusicFilePicked(" + JSONObject.quote(meta.toString()) + ")");
                        } catch (Exception e) {
                            evalJs("window.onProjectMusicFilePickFailed&&window.onProjectMusicFilePickFailed(" + JSONObject.quote(e.getMessage()==null?"음악 파일을 가져오지 못했습니다.":e.getMessage()) + ")");
                        }
                    }).start();
                } catch (Exception e) { evalJs("window.onProjectMusicFilePickFailed&&window.onProjectMusicFilePickFailed('음악 파일을 가져오지 못했습니다.')"); }
            }
        } else if (requestCode == REQ_SAVE) {
            boolean savedZip = false;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                if (pendingSaveFile != null && pendingSaveFile.exists()) {
                    try (InputStream in = new FileInputStream(pendingSaveFile);
                         OutputStream out = getContentResolver().openOutputStream(data.getData(), "wt")) {
                        if (out != null) {
                            byte[] buffer = new byte[256 * 1024];
                            int n;
                            while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
                            savedZip = pendingProjectMusicExportId.isEmpty();
                        }
                    } catch (Exception ignored) { }
                } else if (pendingSaveBytes != null) {
                    try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                        if (out != null) out.write(pendingSaveBytes);
                    } catch (Exception ignored) { }
                }
            }
            if (savedZip && data != null && data.getData() != null) {
                try {
                    Uri savedUri = data.getData();
                    final int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    try { getContentResolver().takePersistableUriPermission(savedUri, flags); } catch (Exception ignored) { }
                    getSharedPreferences("creative_studio_prefs", MODE_PRIVATE).edit()
                            .putString("default_zip_backup_uri", savedUri.toString()).apply();
                } catch (Exception ignored) { }
            }
            if (!pendingProjectMusicExportId.isEmpty() && resultCode == RESULT_OK && data != null && data.getData() != null) {
                final String exportedId = pendingProjectMusicExportId; final Uri exported = data.getData(); final String exportedUri = exported.toString();
                try { final int pf=data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION); getContentResolver().takePersistableUriPermission(exported,pf); } catch(Exception ignored){}
                evalJs("window.onProjectMusicExported&&window.onProjectMusicExported(" + JSONObject.quote(exportedId) + "," + JSONObject.quote(exportedUri) + ")");
            }
            pendingProjectMusicExportId = "";
            if (pendingSaveFile != null) {
                try { pendingSaveFile.delete(); } catch (Exception ignored) { }
                pendingSaveFile = null;
            }
            pendingSaveBytes = null;
            if (savedZip) evalJs("window.zipBackupSaved&&window.zipBackupSaved()");
        } else if (requestCode == REQ_BACKUP_DIR) {
            final boolean changeOnly = backupFolderChangeOnly;
            backupFolderChangeOnly = false;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                final Uri treeUri = data.getData();
                try {
                    final int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    getContentResolver().takePersistableUriPermission(treeUri, flags);
                    getSharedPreferences("creative_studio_prefs", MODE_PRIVATE).edit()
                            .putString("backup_tree_uri", treeUri.toString())
                            .remove("default_zip_backup_uri")
                            .apply();
                    evalJs("window.backupFolderChanged&&window.backupFolderChanged()");
                    if (!changeOnly && pendingSaveFile != null && pendingSaveFile.exists()) {
                        new Thread(() -> savePendingZipToBackupFolder(treeUri)).start();
                    }
                } catch (Exception e) {
                    if (!changeOnly) failPendingBackup("백업 폴더 권한을 저장하지 못했습니다.");
                }
            } else if (!changeOnly && pendingSaveFile != null) {
                failPendingBackup("백업 폴더 선택이 취소되었습니다.");
            }
        } else if (requestCode == REQ_ZIP_IMPORT) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                final Uri uri = data.getData();
                new Thread(() -> prepareZipRestore(uri)).start();
            }
        }
    }

    private void evalJs(String script) {
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    private void prepareZipRestore(Uri uri) {
        closeRestoreZip();
        try {
            restoreZipTemp = File.createTempFile("storyhand_restore_", ".zip", getCacheDir());
            try (InputStream in = getContentResolver().openInputStream(uri);
                 OutputStream out = new FileOutputStream(restoreZipTemp)) {
                if (in == null) throw new Exception("파일을 열 수 없습니다.");
                byte[] buffer = new byte[256 * 1024];
                int n;
                while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            }
            restoreZipFile = new ZipFile(restoreZipTemp);
            ZipEntry meta = restoreZipFile.getEntry("backup.json");
            if (meta == null) throw new Exception("backup.json이 없습니다.");
            String json;
            try (InputStream in = restoreZipFile.getInputStream(meta);
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[64 * 1024];
                int n;
                while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
                json = out.toString("UTF-8");
            }
            stageProjectMusicFromRestoreZip();
            restoreZipEntries = new ArrayList<>();
            java.util.Enumeration<? extends ZipEntry> en = restoreZipFile.entries();
            while (en.hasMoreElements()) {
                ZipEntry e = en.nextElement();
                if (!e.isDirectory() && e.getName().startsWith("media/")) restoreZipEntries.add(e);
            }
            restoreZipIndex = 0;
            String jsonB64 = Base64.encodeToString(json.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            final String call = "window.zipRestoreBegin&&window.zipRestoreBegin(" + JSONObject.quote(jsonB64) + "," + restoreZipEntries.size() + ")";
            runOnUiThread(() -> webView.evaluateJavascript(call, value -> sendNextRestoreEntry()));
        } catch (Exception e) {
            final String msg = "ZIP 백업을 열 수 없습니다: " + (e.getMessage() == null ? "알 수 없는 오류" : e.getMessage());
            evalJs("window.zipRestoreFail&&window.zipRestoreFail(" + JSONObject.quote(msg) + ")");
            closeRestoreZip();
        }
    }

    private void sendNextRestoreEntry() {
        if (restoreZipFile == null) return;
        if (restoreZipIndex >= restoreZipEntries.size()) {
            evalJs("window.zipRestoreFinish&&window.zipRestoreFinish()");
            closeRestoreZip();
            return;
        }
        final ZipEntry entry = restoreZipEntries.get(restoreZipIndex++);
        new Thread(() -> {
            try (InputStream in = restoreZipFile.getInputStream(entry);
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[256 * 1024];
                int n;
                while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
                byte[] bytes = out.toByteArray();
                String comment = entry.getComment();
                String id = null, mime = "application/octet-stream";
                if (comment != null) {
                    int cut = comment.indexOf('\n');
                    if (cut >= 0) { id = comment.substring(0, cut); mime = comment.substring(cut + 1); }
                    else id = comment;
                }
                if (id == null || id.isEmpty()) id = Uri.decode(entry.getName().substring("media/".length()));
                final String finalId = id;
                final String finalMime = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                runOnUiThread(() -> sendRestoreChunk(bytes, 0, finalId, finalMime));
            } catch (Exception e) {
                final String msg = "백업 파일 복원 중 오류가 발생했습니다: " + (e.getMessage() == null ? "파일 읽기 실패" : e.getMessage());
                evalJs("window.zipRestoreFail&&window.zipRestoreFail(" + JSONObject.quote(msg) + ")");
                closeRestoreZip();
            }
        }).start();
    }

    private void sendRestoreChunk(byte[] bytes, int offset, String id, String mime) {
        final int rawChunk = 192 * 1024; // 3의 배수: 이어 붙인 Base64가 유효합니다.
        if (offset >= bytes.length) {
            String call = "window.zipRestoreEntryDone&&window.zipRestoreEntryDone(" + JSONObject.quote(id) + "," + JSONObject.quote(mime) + ")";
            webView.evaluateJavascript(call, null);
            return;
        }
        int len = Math.min(rawChunk, bytes.length - offset);
        byte[] part = new byte[len];
        System.arraycopy(bytes, offset, part, 0, len);
        String b64 = Base64.encodeToString(part, Base64.NO_WRAP);
        String call = "window.zipRestoreChunk&&window.zipRestoreChunk(" + JSONObject.quote(id) + "," + JSONObject.quote(b64) + ")";
        webView.evaluateJavascript(call, value -> sendRestoreChunk(bytes, offset + len, id, mime));
    }

    private void closeRestoreZip() {
        try { if (restoreZipFile != null) restoreZipFile.close(); } catch (Exception ignored) { }
        restoreZipFile = null;
        restoreZipEntries = new ArrayList<>();
        restoreZipIndex = 0;
        if (restoreZipTemp != null) {
            try { restoreZipTemp.delete(); } catch (Exception ignored) { }
            restoreZipTemp = null;
        }
    }

    private Uri getBackupTreeUri() {
        String saved = getSharedPreferences("creative_studio_prefs", MODE_PRIVATE)
                .getString("backup_tree_uri", "");
        if (saved == null || saved.isEmpty()) return null;
        try { return Uri.parse(saved); } catch (Exception e) { return null; }
    }

    private String queryDisplayName(Uri uri) {
        if (uri == null) return "";
        try (Cursor c = getContentResolver().query(uri,
                new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0) == null ? "" : c.getString(0);
        } catch (Exception ignored) { }
        return "";
    }

    private Uri findChildDocument(Uri treeUri, String name) {
        if (treeUri == null || name == null) return null;
        try {
            String treeId = DocumentsContract.getTreeDocumentId(treeUri);
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, treeId);
            try (Cursor c = getContentResolver().query(children,
                    new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME},
                    null, null, null)) {
                if (c != null) while (c.moveToNext()) {
                    if (name.equals(c.getString(1))) {
                        return DocumentsContract.buildDocumentUriUsingTree(treeUri, c.getString(0));
                    }
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    private boolean copyFileToUri(File src, Uri dst) {
        try (InputStream in = new FileInputStream(src);
             OutputStream out = getContentResolver().openOutputStream(dst, "wt")) {
            if (out == null) return false;
            byte[] buffer = new byte[256 * 1024];
            int n;
            while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            out.flush();
            return true;
        } catch (Exception e) { return false; }
    }

    private boolean verifyBackupUri(Uri uri) {
        try (InputStream raw = getContentResolver().openInputStream(uri);
             ZipInputStream zin = raw == null ? null : new ZipInputStream(raw)) {
            if (zin == null) return false;
            ZipEntry e;
            while ((e = zin.getNextEntry()) != null) {
                if ("backup.json".equals(e.getName())) return true;
            }
        } catch (Exception ignored) { }
        return false;
    }

    private void cleanupPendingBackupFile() {
        if (pendingSaveFile != null) {
            try { pendingSaveFile.delete(); } catch (Exception ignored) { }
            pendingSaveFile = null;
        }
    }

    private void failPendingBackup(String message) {
        cleanupPendingBackupFile();
        evalJs("window.zipBackupNativeFail&&window.zipBackupNativeFail(" + JSONObject.quote(message) + ")");
    }

    private void savePendingZipToBackupFolder(Uri treeUri) {
        File source = pendingSaveFile;
        if (source == null || !source.exists()) {
            failPendingBackup("생성된 백업 파일을 찾을 수 없습니다.");
            return;
        }
        Uri tempUri = null;
        try {
            String treeId = DocumentsContract.getTreeDocumentId(treeUri);
            Uri parentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeId);
            final String targetName = (pendingSaveName == null || pendingSaveName.trim().isEmpty()) ? "Suni_Backup.zip" : pendingSaveName;
            final boolean managedMainBackup = "Suni_Backup.zip".equals(targetName);
            String tempBase = targetName.replaceAll("(?i)\\.zip$", "");
            String tempName = tempBase + "_new_" + System.currentTimeMillis() + ".zip";
            tempUri = DocumentsContract.createDocument(getContentResolver(), parentUri, "application/zip", tempName);
            if (tempUri == null) throw new Exception("임시 백업 파일을 만들 수 없습니다.");
            if (!copyFileToUri(source, tempUri)) throw new Exception("백업 파일을 저장하지 못했습니다.");
            if (!verifyBackupUri(tempUri)) throw new Exception("새 백업 파일 검증에 실패했습니다.");

            // 새 파일이 완전히 저장/검증된 뒤에만 기존 앱 관리 백업을 교체합니다.
            android.content.SharedPreferences prefs = getSharedPreferences("creative_studio_prefs", MODE_PRIVATE);
            Uri oldUri = null;
            if (managedMainBackup) {
                String oldManaged = prefs.getString("managed_backup_uri", "");
                String oldTree = prefs.getString("managed_backup_tree_uri", "");
                boolean sameManagedFolder = treeUri.toString().equals(oldTree);
                if (sameManagedFolder && oldManaged != null && !oldManaged.isEmpty()) {
                    try { oldUri = Uri.parse(oldManaged); } catch (Exception ignored) { }
                }
                if (oldUri == null && sameManagedFolder) oldUri = findChildDocument(treeUri, targetName);
            } else {
                // PreRestore_Backup.zip 같은 보조 안전 백업은 메인 관리 백업과 독립적으로 교체합니다.
                oldUri = findChildDocument(treeUri, targetName);
            }

            if (oldUri != null && !oldUri.equals(tempUri)) {
                try { DocumentsContract.deleteDocument(getContentResolver(), oldUri); } catch (Exception ignored) { }
            }

            Uri finalUri = tempUri;
            try {
                Uri renamed = DocumentsContract.renameDocument(getContentResolver(), tempUri, targetName);
                if (renamed != null) finalUri = renamed;
            } catch (Exception ignored) { }

            if (managedMainBackup) {
                prefs.edit()
                        .putString("managed_backup_uri", finalUri.toString())
                        .putString("managed_backup_tree_uri", treeUri.toString())
                        .apply();
            }

            cleanupPendingBackupFile();
            final String callbackName = targetName;
            evalJs("window.zipBackupFileSaved&&window.zipBackupFileSaved(" + JSONObject.quote(callbackName) + ")");
        } catch (Exception e) {
            if (tempUri != null) {
                try { DocumentsContract.deleteDocument(getContentResolver(), tempUri); } catch (Exception ignored) { }
            }
            failPendingBackup("ZIP 백업 저장 실패: " + (e.getMessage() == null ? "알 수 없는 오류" : e.getMessage()));
        }
    }

    private void launchBackupFolderPicker(boolean changeOnly) {
        backupFolderChangeOnly = changeOnly;
        runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                    Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
            startActivityForResult(intent, REQ_BACKUP_DIR);
        });
    }

    private void saveBytes(String fileName, String mime, byte[] bytes) {
        pendingSaveBytes = bytes;
        pendingSaveName = fileName == null || fileName.isEmpty() ? "file" : fileName;
        pendingSaveMime = mime == null || mime.isEmpty() ? "application/octet-stream" : mime;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(pendingSaveMime);
        intent.putExtra(Intent.EXTRA_TITLE, pendingSaveName);
        startActivityForResult(intent, REQ_SAVE);
    }


    private File projectMusicDir() {
        File dir = new File(getFilesDir(), "project_music");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private File projectMusicFile(String internalId) {
        if (internalId == null || !internalId.matches("^[0-9a-fA-F]{64}$")) return null;
        return new File(projectMusicDir(), internalId.toLowerCase(java.util.Locale.ROOT) + ".bin");
    }

    private static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
        return sb.toString();
    }

    private JSONObject importProjectMusicUri(Uri uri) throws Exception {
        if (uri == null) throw new Exception("음악 파일을 찾을 수 없습니다.");
        String name = "music";
        String mime = getContentResolver().getType(uri);
        long declaredSize = 0L;
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int nc = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sc = c.getColumnIndex(OpenableColumns.SIZE);
                if (nc >= 0 && c.getString(nc) != null) name = c.getString(nc);
                if (sc >= 0 && !c.isNull(sc)) declaredSize = c.getLong(sc);
            }
        } catch (Exception ignored) { }

        String title = name, artist = ""; long duration = 0L;
        MediaMetadataRetriever mmr = new MediaMetadataRetriever();
        try {
            mmr.setDataSource(this, uri);
            String v = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE); if (v != null && !v.trim().isEmpty()) title = v;
            v = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST); if (v != null && !"<unknown>".equalsIgnoreCase(v)) artist = v;
            v = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION); if (v != null) try { duration = Long.parseLong(v); } catch (Exception ignored) { }
            if (mime == null || mime.isEmpty()) mime = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE);
        } catch (Exception ignored) { } finally { try { mmr.release(); } catch (Exception ignored) { } }

        File tmp = File.createTempFile("project_music_", ".tmp", getCacheDir());
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long actualSize = 0L;
        try (InputStream in = getContentResolver().openInputStream(uri); OutputStream out = new FileOutputStream(tmp)) {
            if (in == null) throw new Exception("음악 파일을 열 수 없습니다.");
            byte[] buffer = new byte[256 * 1024]; int n;
            while ((n = in.read(buffer)) >= 0) { if (n == 0) continue; digest.update(buffer, 0, n); out.write(buffer, 0, n); actualSize += n; }
        } catch (Exception e) { tmp.delete(); throw e; }
        String internalId = hex(digest.digest());
        File target = projectMusicFile(internalId);
        if (target == null) { tmp.delete(); throw new Exception("내부 음악 ID 생성 실패"); }
        if (!target.exists()) {
            if (!tmp.renameTo(target)) {
                try (InputStream in = new FileInputStream(tmp); OutputStream out = new FileOutputStream(target)) {
                    byte[] b = new byte[256 * 1024]; int n; while ((n = in.read(b)) >= 0) out.write(b, 0, n);
                }
                tmp.delete();
            }
        } else tmp.delete();

        JSONObject o = new JSONObject();
        o.put("internalMusicId", internalId);
        o.put("sourceUri", uri.toString());
        String last = uri.getLastPathSegment();
        if (last != null && last.matches("\\d+")) o.put("mediaStoreId", last); else o.put("mediaStoreId", "");
        o.put("name", name); o.put("title", title == null ? name : title); o.put("artist", artist == null ? "" : artist);
        o.put("mime", mime == null ? "audio/*" : mime);
        o.put("size", actualSize > 0 ? actualSize : Math.max(0, declaredSize));
        o.put("duration", Math.max(0, duration));
        return o;
    }

    private boolean uriReadable(String uriText) {
        if (uriText == null || uriText.trim().isEmpty()) return false;
        try (android.content.res.AssetFileDescriptor afd = getContentResolver().openAssetFileDescriptor(Uri.parse(uriText), "r")) { return afd != null; }
        catch (Exception e) { return false; }
    }

    private String resolveProjectMusicUri(JSONObject meta) {
        String source = meta.optString("sourceUri", "");
        if (uriReadable(source)) return source;
        File f = projectMusicFile(meta.optString("internalMusicId", ""));
        if (f != null && f.exists()) return Uri.fromFile(f).toString();
        return "";
    }

    private void collectInternalMusicIds(Object value, Set<String> out) {
        if (value instanceof JSONObject) {
            JSONObject o = (JSONObject)value;
            String id = o.optString("internalMusicId", "");
            if (id.matches("^[0-9a-fA-F]{64}$")) out.add(id.toLowerCase(java.util.Locale.ROOT));
            java.util.Iterator<String> it = o.keys();
            while (it.hasNext()) { String k = it.next(); collectInternalMusicIds(o.opt(k), out); }
        } else if (value instanceof JSONArray) {
            JSONArray a = (JSONArray)value;
            for (int i=0;i<a.length();i++) collectInternalMusicIds(a.opt(i), out);
        }
    }

    private void addProjectMusicFilesToActiveZip() throws Exception {
        if (activeZipOut == null) return;
        byte[] buffer = new byte[256 * 1024];
        for (String id : activeProjectMusicBackupIds) {
            File f = projectMusicFile(id); if (f == null || !f.exists()) continue;
            ZipEntry e = new ZipEntry("internal_music/" + id + ".bin"); activeZipOut.putNextEntry(e);
            try (InputStream in = new FileInputStream(f)) { int n; while ((n=in.read(buffer))>=0) activeZipOut.write(buffer,0,n); }
            activeZipOut.closeEntry();
        }
    }

    private void stageProjectMusicFromRestoreZip() throws Exception {
        if (restoreZipFile == null) return;
        if (restoreProjectMusicTempDir != null) { File[] old=restoreProjectMusicTempDir.listFiles(); if(old!=null)for(File f:old)f.delete(); restoreProjectMusicTempDir.delete(); }
        restoreProjectMusicTempDir = new File(getCacheDir(), "restore_project_music_" + System.currentTimeMillis()); restoreProjectMusicTempDir.mkdirs();
        java.util.Enumeration<? extends ZipEntry> en = restoreZipFile.entries(); byte[] buffer = new byte[256*1024];
        while (en.hasMoreElements()) {
            ZipEntry e=en.nextElement(); String n=e.getName();
            if (e.isDirectory() || !n.startsWith("internal_music/")) continue;
            String fileName=n.substring("internal_music/".length());
            if (!fileName.matches("^[0-9a-fA-F]{64}\\.bin$")) continue;
            File outFile=new File(restoreProjectMusicTempDir,fileName);
            try(InputStream in=restoreZipFile.getInputStream(e); OutputStream out=new FileOutputStream(outFile)){int r;while((r=in.read(buffer))>=0)out.write(buffer,0,r);}
        }
    }

    private void commitRestoredProjectMusicFiles() {
        if (restoreProjectMusicTempDir == null || !restoreProjectMusicTempDir.exists()) return;
        File[] files=restoreProjectMusicTempDir.listFiles(); if(files!=null)for(File src:files){
            String n=src.getName(); if(!n.matches("^[0-9a-fA-F]{64}\\.bin$"))continue;
            File dst=new File(projectMusicDir(),n); if(dst.exists()){src.delete();continue;}
            if(!src.renameTo(dst)){try(InputStream in=new FileInputStream(src);OutputStream out=new FileOutputStream(dst)){byte[] b=new byte[256*1024];int r;while((r=in.read(b))>=0)out.write(b,0,r);}catch(Exception ignored){}src.delete();}
        }
        restoreProjectMusicTempDir.delete(); restoreProjectMusicTempDir=null;
    }

    private void discardStagedProjectMusicFiles() {
        if (restoreProjectMusicTempDir == null) return; File[] fs=restoreProjectMusicTempDir.listFiles(); if(fs!=null)for(File f:fs)f.delete(); restoreProjectMusicTempDir.delete(); restoreProjectMusicTempDir=null;
    }

    private class NativeBridge {
        @JavascriptInterface
        public boolean hasMusicPermission() {
            return hasAudioPermission();
        }

        @JavascriptInterface
        public void requestMusicPermission() {
            requestAudioPermission();
        }

        @JavascriptInterface
        public boolean hasMusicNotificationPermission() {
            return android.os.Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestMusicNotificationPermission() {
            if (android.os.Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATION_PERMISSION));
        }

        @JavascriptInterface
        public String getMusicLibrary() {
            return queryMusicLibraryJson();
        }

        // UI ordering and app-only hidden tracks apply to the playback queue as well.
        @JavascriptInterface
        public void setMusicLibraryPlaylist(String playlistJson) {
            try {
                JSONArray tracks = new JSONArray(playlistJson);
                if (tracks.length() > 30000) return;
                JSONArray allowed = new JSONArray();
                for (int i = 0; i < tracks.length(); i++) {
                    JSONObject track = tracks.optJSONObject(i);
                    if (track != null && track.optString("uri", "").startsWith("content://media/")) allowed.put(track);
                }
                musicLibraryCache = allowed.toString();
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void deleteDeviceMusic(String jsonUris) {
            runOnUiThread(() -> {
                if (deviceMusicDeletionPending) return;
                if (android.os.Build.VERSION.SDK_INT < 30) {
                    evalJs("window.onDeviceMusicDeleted&&window.onDeviceMusicDeleted(false,'휴대폰 직접 삭제는 Android 11 이상에서 지원합니다. 앱에서만 삭제를 이용해 주세요.')");
                    return;
                }
                try {
                    JSONArray input = new JSONArray(jsonUris);
                    if (input.length() < 1 || input.length() > 100) throw new IllegalArgumentException("한 번에 1~100곡을 선택해 주세요.");
                    java.util.ArrayList<Uri> uris = new java.util.ArrayList<>();
                    java.util.HashSet<String> seen = new java.util.HashSet<>();
                    for (int i = 0; i < input.length(); i++) {
                        Uri uri = Uri.parse(input.getString(i));
                        // Never accept paths, app-private files, or arbitrary content providers.
                        if (!"content".equals(uri.getScheme()) || !"media".equals(uri.getAuthority()) ||
                                !uri.getPath().matches("/external/audio/media/[0-9]+")) {
                            throw new IllegalArgumentException("기기 음악 저장소에 있는 곡만 삭제할 수 있습니다.");
                        }
                        if (seen.add(uri.toString())) uris.add(uri);
                    }
                    android.app.PendingIntent approval = MediaStore.createDeleteRequest(getContentResolver(), uris);
                    deviceMusicDeletionPending = true;
                    startIntentSenderForResult(approval.getIntentSender(), REQ_DELETE_DEVICE_MUSIC, null, 0, 0, 0);
                } catch (Exception e) {
                    deviceMusicDeletionPending = false;
                    String message = e.getMessage() == null ? "음악 삭제 요청에 실패했습니다." : e.getMessage();
                    evalJs("window.onDeviceMusicDeleted&&window.onDeviceMusicDeleted(false," + JSONObject.quote(message) + ")");
                }
            });
        }

        @JavascriptInterface
        public void playMusic(String uri) {
            startMusicInService(uri);
        }

        @JavascriptInterface
        public void playHealingSound(String assetPath, String id, String title) {
            if (id == null || !id.matches("^(medieval|zoo|campfire|sleep|sparkle|timeless|fairytail)$")) return;
            String expected;
            if ("medieval".equals(id)) expected = "extras/pastime/audio/custom/medieval_tale.mp3";
            else if ("zoo".equals(id)) expected = "extras/pastime/audio/custom/zoo_piano.mp3";
            else if ("campfire".equals(id)) expected = "extras/pastime/audio/custom/campfire_fantasy.mp3";
            else if ("sleep".equals(id)) expected = "extras/pastime/audio/custom/sleep_lullaby.mp3";
            else if ("sparkle".equals(id)) expected = "extras/pastime/audio/custom/sparkle_piano.mp3";
            else if ("timeless".equals(id)) expected = "extras/pastime/audio/custom/timeless_heart.mp3";
            else expected = "extras/pastime/audio/custom/fairy_tail.mp3";
            if (assetPath == null || !expected.equals(assetPath)) return;
            try {
                JSONArray arr = new JSONArray();
                JSONObject t = new JSONObject();
                String uri = "healing://" + id;
                t.put("uri", uri);
                t.put("title", title == null || title.trim().isEmpty() ? "힐링 사운드" : title);
                t.put("artist", "힐링 사운드");
                t.put("duration", 10000);
                arr.put(t);
                Intent i = musicServiceIntent(MusicPlaybackService.ACTION_PLAY_URI)
                        .putExtra("uri", uri)
                        .putExtra("playlist", arr.toString())
                        .putExtra("shuffle", false)
                        // Healing tracks loop at the MediaPlayer level; keep the normal music repeat mode untouched.
                        .putExtra("repeat", musicRepeatMode)
                        .putExtra("color", musicAccentColor)
                        .putExtra("dark", musicAppearanceDark);
                sendMusicService(i, true);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void pauseMusic() {
            if (MusicPlaybackService.isRunning()) sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_PAUSE), false);
        }

        @JavascriptInterface
        public void resumeMusic() {
            boolean running = MusicPlaybackService.isRunning();
            sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_RESUME), !running);
        }

        @JavascriptInterface
        public void nextMusic() {
            boolean running = MusicPlaybackService.isRunning();
            sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_NEXT), !running);
        }

        @JavascriptInterface
        public void previousMusic() {
            boolean running = MusicPlaybackService.isRunning();
            sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_PREVIOUS), !running);
        }

        @JavascriptInterface
        public void stopMusic() {
            if (MusicPlaybackService.isRunning()) sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_STOP), false);
        }

        @JavascriptInterface
        public boolean isMusicServiceRunning() {
            return MusicPlaybackService.isRunning();
        }

        @JavascriptInterface
        public String getMusicState() {
            return MusicPlaybackService.stateJson(MainActivity.this);
        }

        @JavascriptInterface
        public void seekMusic(int positionMs) {
            if (MusicPlaybackService.isRunning()) sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_SEEK).putExtra("position", Math.max(0, positionMs)), false);
        }

        @JavascriptInterface
        public int getMusicPosition() {
            return MusicPlaybackService.currentPosition();
        }

        @JavascriptInterface
        public int getMusicDuration() {
            return MusicPlaybackService.currentDuration();
        }

        @JavascriptInterface
        public boolean isMusicPlaying() {
            return MusicPlaybackService.isPlayingNow();
        }

        @JavascriptInterface
        public String getMusicCurrentUri() {
            return MusicPlaybackService.currentUri();
        }

        @JavascriptInterface
        public void setMusicMode(boolean shuffle, String repeat) {
            musicShuffleMode = shuffle;
            musicRepeatMode = ("all".equals(repeat) || "one".equals(repeat)) ? repeat : "off";
            MusicPlaybackService.persistMode(MainActivity.this, musicShuffleMode, musicRepeatMode);
            if (MusicPlaybackService.isRunning()) {
                sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_MODE)
                        .putExtra("shuffle", musicShuffleMode)
                        .putExtra("repeat", musicRepeatMode), false);
            }
        }

        @JavascriptInterface
        public void setMusicAppearance(String colorHex, boolean dark) {
            if (colorHex != null && colorHex.matches("^#[0-9a-fA-F]{6}$")) musicAccentColor = colorHex;
            musicAppearanceDark = dark;
            MusicPlaybackService.persistAppearance(MainActivity.this, musicAccentColor, musicAppearanceDark);
            if (MusicPlaybackService.isRunning()) {
                sendMusicService(musicServiceIntent(MusicPlaybackService.ACTION_APPEARANCE)
                        .putExtra("color", musicAccentColor)
                        .putExtra("dark", musicAppearanceDark), false);
            }
        }

        @JavascriptInterface
        public String importProjectMusic(String uriText) {
            try { return importProjectMusicUri(Uri.parse(uriText)).toString(); } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public String importProjectMusicById(String idText) {
            try {
                long id = Long.parseLong(idText == null ? "" : idText.trim());
                Uri uri = android.content.ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                return importProjectMusicUri(uri).toString();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void chooseProjectMusicFile() {
            runOnUiThread(() -> {
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("audio/*");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION); startActivityForResult(i, REQ_PROJECT_MUSIC);
            });
        }

        @JavascriptInterface
        public String getProjectMusicStatus(String metaJson) {
            try { JSONObject m=new JSONObject(metaJson); JSONObject o=new JSONObject(); boolean original=uriReadable(m.optString("sourceUri","")); File f=projectMusicFile(m.optString("internalMusicId","")); boolean internal=f!=null&&f.exists(); o.put("original",original);o.put("internal",internal);o.put("usingInternal",!original&&internal); return o.toString(); } catch(Exception e){return "{\"original\":false,\"internal\":false,\"usingInternal\":false}";}
        }

        @JavascriptInterface
        public void playProjectMusic(String metaJson) {
            try { JSONObject m=new JSONObject(metaJson); String uri=resolveProjectMusicUri(m); if(uri.isEmpty())return; JSONArray arr=new JSONArray(); JSONObject t=new JSONObject(); t.put("uri",uri); t.put("title",m.optString("title",m.optString("name","프로젝트 음악"))); t.put("artist",m.optString("artist","")); t.put("duration",Math.max(0,m.optLong("duration",0))); arr.put(t); Intent i=musicServiceIntent(MusicPlaybackService.ACTION_PLAY_URI).putExtra("uri",uri).putExtra("playlist",arr.toString()).putExtra("shuffle",false).putExtra("repeat","off").putExtra("color",musicAccentColor).putExtra("dark",musicAppearanceDark); sendMusicService(i,true); } catch(Exception ignored){}
        }

        @JavascriptInterface
        public boolean isProjectMusicPlaying(String metaJson) {
            try { JSONObject m=new JSONObject(metaJson); String uri=resolveProjectMusicUri(m); return !uri.isEmpty() && uri.equals(MusicPlaybackService.currentUri()) && MusicPlaybackService.isPlayingNow(); } catch(Exception e){return false;}
        }

        @JavascriptInterface
        public void exportProjectMusic(String internalId, String fileName, String mime) {
            File src=projectMusicFile(internalId); if(src==null||!src.exists())return;
            runOnUiThread(() -> {
                try { File tmp=File.createTempFile("project_music_export_", ".bin", getCacheDir()); try(InputStream in=new FileInputStream(src);OutputStream out=new FileOutputStream(tmp)){byte[] b=new byte[256*1024];int n;while((n=in.read(b))>=0)out.write(b,0,n);} pendingSaveFile=tmp;pendingProjectMusicExportId=internalId;pendingSaveName=(fileName==null||fileName.trim().isEmpty())?"music":fileName;pendingSaveMime=(mime==null||mime.isEmpty())?"audio/*":mime; Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(pendingSaveMime);intent.putExtra(Intent.EXTRA_TITLE,pendingSaveName);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);startActivityForResult(intent,REQ_SAVE); } catch(Exception ignored){}
            });
        }

        @JavascriptInterface
        public void deleteInternalProjectMusic(String internalId) { File f=projectMusicFile(internalId); if(f!=null&&f.exists())try{f.delete();}catch(Exception ignored){} }

        @JavascriptInterface
        public boolean hasInternalProjectMusic(String internalId) { File f=projectMusicFile(internalId); return f!=null&&f.exists(); }

        @JavascriptInterface
        public void commitRestoredInternalMusic() { commitRestoredProjectMusicFiles(); }

        @JavascriptInterface
        public void discardRestoredInternalMusic() { discardStagedProjectMusicFiles(); }

        @JavascriptInterface
        public boolean beginZipBackup(String json) {
            try {
                if (activeZipOut != null) { try { activeZipOut.close(); } catch (Exception ignored) { } }
                if (activeZipTemp != null) { try { activeZipTemp.delete(); } catch (Exception ignored) { } }
                activeProjectMusicBackupIds.clear();
                try { collectInternalMusicIds(new JSONObject(json == null ? "{}" : json), activeProjectMusicBackupIds); } catch (Exception ignored) { }
                activeZipTemp = File.createTempFile("storyhand_backup_", ".zip", getCacheDir());
                activeZipOut = new ZipOutputStream(new FileOutputStream(activeZipTemp));
                ZipEntry meta = new ZipEntry("backup.json");
                activeZipOut.putNextEntry(meta);
                activeZipOut.write((json == null ? "{}" : json).getBytes(StandardCharsets.UTF_8));
                activeZipOut.closeEntry();
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean addZipDataUrl(String id, String dataUrl) {
            if (activeZipOut == null || dataUrl == null || id == null) return false;
            try {
                int comma = dataUrl.indexOf(',');
                if (comma < 0) return false;
                String meta = dataUrl.substring(0, comma);
                String payload = dataUrl.substring(comma + 1);
                String mime = "application/octet-stream";
                if (meta.startsWith("data:")) {
                    int semi = meta.indexOf(';');
                    mime = meta.substring(5, semi > 5 ? semi : meta.length());
                }
                byte[] bytes = meta.contains(";base64")
                        ? Base64.decode(payload, Base64.DEFAULT)
                        : Uri.decode(payload).getBytes(StandardCharsets.UTF_8);
                ZipEntry entry = new ZipEntry("media/" + Uri.encode(id));
                entry.setComment(id + "\n" + mime);
                activeZipOut.putNextEntry(entry);
                activeZipOut.write(bytes);
                activeZipOut.closeEntry();
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean finishZipBackup(String fileName) {
            if (activeZipOut == null || activeZipTemp == null) return false;
            try {
                addProjectMusicFilesToActiveZip();
                activeZipOut.finish();
                activeZipOut.close();
                activeZipOut = null;

                // 새 ZIP을 먼저 완전히 생성하고 검증합니다. 실패하면 기존 정상 백업은 건드리지 않습니다.
                try (ZipFile verify = new ZipFile(activeZipTemp)) {
                    if (verify.getEntry("backup.json") == null) throw new Exception("backup.json 누락");
                }

                pendingSaveFile = activeZipTemp;
                activeZipTemp = null;
                pendingSaveName = (fileName == null || fileName.trim().isEmpty()) ? "Suni_Backup.zip" : fileName;
                pendingSaveMime = "application/zip";

                Uri treeUri = getBackupTreeUri();
                if (treeUri == null) {
                    evalJs("window.backupFolderPickRequested&&window.backupFolderPickRequested()");
                    launchBackupFolderPicker(false);
                } else {
                    new Thread(() -> savePendingZipToBackupFolder(treeUri)).start();
                }
                return true;
            } catch (Exception e) {
                try { if (activeZipTemp != null) activeZipTemp.delete(); } catch (Exception ignored) { }
                activeZipTemp = null;
                activeZipOut = null;
                return false;
            }
        }

        @JavascriptInterface
        public boolean hasBackupFolder() {
            return getBackupTreeUri() != null;
        }

        @JavascriptInterface
        public String getBackupFolderName() {
            Uri uri = getBackupTreeUri();
            if (uri == null) return "";
            String name = queryDisplayName(uri);
            return name == null ? "" : name;
        }

        @JavascriptInterface
        public void chooseBackupFolder() {
            launchBackupFolderPicker(true);
        }

        @JavascriptInterface
        public void chooseZipBackup() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/zip");
                startActivityForResult(intent, REQ_ZIP_IMPORT);
            });
        }

        @JavascriptInterface
        public void zipRestoreEntryAck() {
            sendNextRestoreEntry();
        }
        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || url.trim().isEmpty()) return;
            try {
                Uri uri = Uri.parse(url.trim());
                String scheme = uri.getScheme();
                if (!("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) return;
                runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                    } catch (Exception ignored) { }
                });
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void saveDataUrl(String fileName, String dataUrl) {
            if (dataUrl == null) return;
            int comma = dataUrl.indexOf(',');
            if (comma < 0) return;
            String meta = dataUrl.substring(0, comma);
            String payload = dataUrl.substring(comma + 1);
            String mime = "application/octet-stream";
            if (meta.startsWith("data:")) {
                int semi = meta.indexOf(';');
                mime = meta.substring(5, semi > 5 ? semi : meta.length());
            }
            try {
                byte[] bytes;
                if (meta.contains(";base64")) {
                    bytes = Base64.decode(payload, Base64.DEFAULT);
                } else {
                    bytes = Uri.decode(payload).getBytes(StandardCharsets.UTF_8);
                }
                final String m = mime;
                runOnUiThread(() -> saveBytes(fileName, m, bytes));
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void saveText(String fileName, String mime, String text) {
            byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
            runOnUiThread(() -> saveBytes(fileName, mime, bytes));
        }

        @JavascriptInterface
        public void beginPrintHtml(String title) {
            synchronized (printHtmlLock) {
                pendingPrintTitle = title == null ? "" : title;
                pendingPrintHtml = new StringBuilder();
            }
        }

        @JavascriptInterface
        public void appendPrintHtmlChunk(String chunk) {
            if (chunk == null) return;
            synchronized (printHtmlLock) {
                if (pendingPrintHtml == null) pendingPrintHtml = new StringBuilder();
                if (pendingPrintHtml.length() + chunk.length() > 24_000_000) {
                    pendingPrintHtml = null;
                    android.util.Log.e("CreativePDF", "PDF HTML exceeds bridge size limit");
                    return;
                }
                pendingPrintHtml.append(chunk);
            }
        }

        @JavascriptInterface
        public void finishPrintHtml() {
            final String title;
            final String html;
            synchronized (printHtmlLock) {
                title = pendingPrintTitle;
                html = pendingPrintHtml == null ? "" : pendingPrintHtml.toString();
                pendingPrintTitle = "";
                pendingPrintHtml = null;
            }
            printHtml(title, html);
        }

        @JavascriptInterface
        public void printHtml(String title, String html) {
            if (html == null || html.trim().isEmpty()) {
                runOnUiThread(() -> android.widget.Toast.makeText(MainActivity.this,
                        "PDF 내용이 비어 있습니다.", android.widget.Toast.LENGTH_LONG).show());
                return;
            }
            runOnUiThread(() -> {
                if (activePdfWebView != null) {
                    android.widget.Toast.makeText(MainActivity.this, "이전 PDF 인쇄 화면을 먼저 닫아 주세요.", android.widget.Toast.LENGTH_LONG).show();
                    return;
                }
                final WebView printView = new WebView(MainActivity.this);
                activePdfWebView = printView;
                printView.setBackgroundColor(Color.WHITE);
                printView.setAlpha(0.01f);
                printView.setClickable(false);
                printView.setFocusable(false);
                printView.getSettings().setJavaScriptEnabled(true);
                final FrameLayout root = (FrameLayout) getWindow().getDecorView().findViewById(android.R.id.content);
                root.addView(printView, new FrameLayout.LayoutParams(
                        getResources().getDisplayMetrics().widthPixels,
                        getResources().getDisplayMetrics().heightPixels));
                printView.setWebViewClient(new WebViewClient() {
                    private boolean started = false;
                    private int attempts = 0;
                    private void fail(String reason) {
                        android.util.Log.e("CreativePDF", reason);
                        android.widget.Toast.makeText(MainActivity.this, reason,
                                android.widget.Toast.LENGTH_LONG).show();
                        root.removeView(printView);
                        if (activePdfWebView == printView) activePdfWebView = null;
                        printView.destroy();
                    }
                    private void awaitContent(WebView view) {
                        if (started) return;
                        view.evaluateJavascript("(function(){var b=document.body;if(!b||!b.innerText.trim())return 'empty';var a=[].slice.call(document.images);return a.every(function(i){return i.complete})?'ready':'loading';})()", state -> {
                            if (started) return;
                            if ("\"ready\"".equals(state)) {
                                started = true;
                                // Allow a layout pass after images finish loading.
                                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                                    try {
                                        String job = (title == null || title.isEmpty()) ? "창작소 PDF" : title;
                                        PrintManager manager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                        android.print.PrintDocumentAdapter delegate = view.createPrintDocumentAdapter(job);
                                        manager.print(job, new android.print.PrintDocumentAdapter() {
                                            @Override public void onLayout(android.print.PrintAttributes oldAttrs, android.print.PrintAttributes newAttrs,
                                                    android.os.CancellationSignal signal, LayoutResultCallback callback, android.os.Bundle extras) {
                                                delegate.onLayout(oldAttrs, newAttrs, signal, callback, extras);
                                            }
                                            @Override public void onWrite(android.print.PageRange[] pages, android.os.ParcelFileDescriptor destination,
                                                    android.os.CancellationSignal signal, WriteResultCallback callback) {
                                                delegate.onWrite(pages, destination, signal, callback);
                                            }
                                            @Override public void onFinish() {
                                                delegate.onFinish();
                                                root.removeView(printView);
                                                if (activePdfWebView == printView) activePdfWebView = null;
                                                printView.destroy();
                                            }
                                        }, null);
                                    } catch (Exception e) { fail("PDF 인쇄 화면을 열지 못했습니다."); }
                                }, 350);
                            } else if (++attempts >= 40) {
                                fail("PDF 내용 또는 이미지 로딩에 실패했습니다.");
                            } else {
                                new Handler(Looper.getMainLooper()).postDelayed(() -> awaitContent(view), 250);
                            }
                        });
                    }
                    @Override public void onPageFinished(WebView view, String url) {
                        awaitContent(view);
                    }
                    @Override public void onReceivedError(WebView view, android.webkit.WebResourceRequest request,
                            android.webkit.WebResourceError error) {
                        if (request.isForMainFrame() && !started) { started = true; fail("PDF 문서를 불러오지 못했습니다."); }
                    }
                });
                printView.loadDataWithBaseURL("https://appassets.androidplatform.net/", html,
                        "text/html", "UTF-8", null);
            });
        }

        @JavascriptInterface
        public int getPdfPageCount(String dataUrl) {
            if (dataUrl == null) return 0;
            int comma = dataUrl.indexOf(',');
            if (comma < 0) return 0;
            File temp = null;
            ParcelFileDescriptor pfd = null;
            PdfRenderer renderer = null;
            try {
                String meta = dataUrl.substring(0, comma);
                String payload = dataUrl.substring(comma + 1);
                byte[] bytes = meta.contains(";base64")
                        ? Base64.decode(payload, Base64.DEFAULT)
                        : Uri.decode(payload).getBytes(StandardCharsets.ISO_8859_1);
                temp = File.createTempFile("creative_studio_count_", ".pdf", getCacheDir());
                try (FileOutputStream out = new FileOutputStream(temp)) { out.write(bytes); }
                pfd = ParcelFileDescriptor.open(temp, ParcelFileDescriptor.MODE_READ_ONLY);
                renderer = new PdfRenderer(pfd);
                return renderer.getPageCount();
            } catch (Exception ignored) {
                return 0;
            } finally {
                try { if (renderer != null) renderer.close(); } catch (Exception ignored) { }
                try { if (pfd != null) pfd.close(); } catch (Exception ignored) { }
                try { if (temp != null) temp.delete(); } catch (Exception ignored) { }
            }
        }

        @JavascriptInterface
        public String renderPdfPage(String dataUrl, int pageIndex) {
            if (dataUrl == null) return "";
            int comma = dataUrl.indexOf(',');
            if (comma < 0) return "";
            File temp = null;
            ParcelFileDescriptor pfd = null;
            PdfRenderer renderer = null;
            PdfRenderer.Page page = null;
            try {
                String meta = dataUrl.substring(0, comma);
                String payload = dataUrl.substring(comma + 1);
                byte[] bytes = meta.contains(";base64")
                        ? Base64.decode(payload, Base64.DEFAULT)
                        : Uri.decode(payload).getBytes(StandardCharsets.ISO_8859_1);
                temp = File.createTempFile("creative_studio_page_", ".pdf", getCacheDir());
                try (FileOutputStream out = new FileOutputStream(temp)) { out.write(bytes); }
                pfd = ParcelFileDescriptor.open(temp, ParcelFileDescriptor.MODE_READ_ONLY);
                renderer = new PdfRenderer(pfd);
                if (pageIndex < 0 || pageIndex >= renderer.getPageCount()) return "";
                page = renderer.openPage(pageIndex);
                int maxWidth = 760;
                float scale = Math.min(1.6f, maxWidth / (float)Math.max(1, page.getWidth()));
                int width = Math.max(1, Math.round(page.getWidth() * scale));
                int height = Math.max(1, Math.round(page.getHeight() * scale));
                Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                bitmap.eraseColor(Color.WHITE);
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 88, png);
                bitmap.recycle();
                return "data:image/png;base64," + Base64.encodeToString(png.toByteArray(), Base64.NO_WRAP);
            } catch (Exception ignored) {
                return "";
            } finally {
                try { if (page != null) page.close(); } catch (Exception ignored) { }
                try { if (renderer != null) renderer.close(); } catch (Exception ignored) { }
                try { if (pfd != null) pfd.close(); } catch (Exception ignored) { }
                try { if (temp != null) temp.delete(); } catch (Exception ignored) { }
            }
        }

        @JavascriptInterface
        public String renderPdfPreview(String dataUrl) {
            if (dataUrl == null) return "";
            int comma = dataUrl.indexOf(',');
            if (comma < 0) return "";
            File temp = null;
            ParcelFileDescriptor pfd = null;
            PdfRenderer renderer = null;
            PdfRenderer.Page page = null;
            try {
                String meta = dataUrl.substring(0, comma);
                String payload = dataUrl.substring(comma + 1);
                byte[] bytes = meta.contains(";base64")
                        ? Base64.decode(payload, Base64.DEFAULT)
                        : Uri.decode(payload).getBytes(StandardCharsets.ISO_8859_1);
                temp = File.createTempFile("creative_studio_preview_", ".pdf", getCacheDir());
                try (FileOutputStream out = new FileOutputStream(temp)) {
                    out.write(bytes);
                }
                pfd = ParcelFileDescriptor.open(temp, ParcelFileDescriptor.MODE_READ_ONLY);
                renderer = new PdfRenderer(pfd);
                if (renderer.getPageCount() < 1) return "";
                page = renderer.openPage(0);
                int maxWidth = 1000;
                float scale = Math.min(2.0f, maxWidth / (float)Math.max(1, page.getWidth()));
                int width = Math.max(1, Math.round(page.getWidth() * scale));
                int height = Math.max(1, Math.round(page.getHeight() * scale));
                Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                bitmap.eraseColor(Color.WHITE);
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                ByteArrayOutputStream png = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 92, png);
                bitmap.recycle();
                return "data:image/png;base64," + Base64.encodeToString(png.toByteArray(), Base64.NO_WRAP);
            } catch (Exception ignored) {
                return "";
            } finally {
                try { if (page != null) page.close(); } catch (Exception ignored) { }
                try { if (renderer != null) renderer.close(); } catch (Exception ignored) { }
                try { if (pfd != null) pfd.close(); } catch (Exception ignored) { }
                try { if (temp != null) temp.delete(); } catch (Exception ignored) { }
            }
        }

        @JavascriptInterface
        public void setSystemBars(boolean darkMode) {
            appDarkMode = darkMode;
            getSharedPreferences("creative_studio_prefs", MODE_PRIVATE)
                    .edit().putBoolean("dark_mode", darkMode).apply();
            runOnUiThread(() -> {
                int color = Color.parseColor(darkMode ? "#17171B" : "#F5F4F2");
                getWindow().setStatusBarColor(color);
                getWindow().setNavigationBarColor(color);
                int flags = getWindow().getDecorView().getSystemUiVisibility();
                if (darkMode) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (android.os.Build.VERSION.SDK_INT >= 26) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (android.os.Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                getWindow().getDecorView().setSystemUiVisibility(flags);
            });
        }
    }
}
