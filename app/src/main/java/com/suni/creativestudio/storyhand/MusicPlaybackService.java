package com.suni.creativestudio.storyhand;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.MediaMetadataRetriever;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.view.KeyEvent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Native music engine for the MP3 experiment branch.
 * Playback state belongs to this foreground service, not the WebView/Activity.
 */
public class MusicPlaybackService extends Service {
    public static final String ACTION_PLAY_URI = "storyhand.music.PLAY_URI";
    public static final String ACTION_TOGGLE = "storyhand.music.TOGGLE";
    public static final String ACTION_PAUSE = "storyhand.music.PAUSE";
    public static final String ACTION_RESUME = "storyhand.music.RESUME";
    public static final String ACTION_NEXT = "storyhand.music.NEXT";
    public static final String ACTION_PREVIOUS = "storyhand.music.PREVIOUS";
    public static final String ACTION_SEEK = "storyhand.music.SEEK";
    public static final String ACTION_MODE = "storyhand.music.MODE";
    public static final String ACTION_APPEARANCE = "storyhand.music.APPEARANCE";
    public static final String ACTION_STOP = "storyhand.music.STOP";

    private static final String CHANNEL_ID = "storyhand_music_playback";
    private static final int NOTIFICATION_ID = 4127;
    private static final String PREFS = "storyhand_music_state_v2";
    private static final String KEY_URI = "uri";
    private static final String KEY_POSITION = "position";
    private static final String KEY_PLAYLIST = "playlist";
    private static final String KEY_SHUFFLE = "shuffle";
    private static final String KEY_REPEAT = "repeat";
    private static final String KEY_COLOR = "color";
    private static final String KEY_DARK = "dark";

    private static MusicPlaybackService instance;

    private final List<Track> playlist = new ArrayList<>();
    private final Handler stateHandler = new Handler(Looper.getMainLooper());
    private final Runnable stateSaver = new Runnable() {
        @Override public void run() {
            if (isPlayingNow()) persistState();
            stateHandler.postDelayed(this, 5000L);
        }
    };

    private MediaPlayer player;
    private MediaSession mediaSession;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private boolean prepared = false;
    private int currentIndex = -1;
    private boolean shuffle = false;
    private String repeatMode = "off";
    private int accentColor = Color.parseColor("#5D5870");
    private String accentColorText = "#5d5870";
    private boolean darkMode = false;
    private String playlistJson = "[]";
    private int pendingSeekPosition = 0;
    private Bitmap currentArtwork;
    private boolean currentArtworkFallback = false;
    private boolean noisyReceiverRegistered = false;
    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                // Headphones/Bluetooth audio was disconnected and playback would fall back to the speaker.
                // Pause immediately, but keep the service/session alive so the user can resume explicitly.
                pausePlayback();
            }
        }
    };

    private static class Track {
        String uri;
        String title;
        String artist;
        long duration;
    }

    public static boolean isRunning() { return instance != null; }
    public static boolean isPlayingNow() {
        try { return instance != null && instance.player != null && instance.prepared && instance.player.isPlaying(); }
        catch (Exception e) { return false; }
    }
    public static int currentPosition() {
        try { return instance != null && instance.player != null && instance.prepared ? instance.player.getCurrentPosition() : 0; }
        catch (Exception e) { return 0; }
    }
    public static int currentDuration() {
        try { return instance != null && instance.player != null && instance.prepared ? instance.player.getDuration() : 0; }
        catch (Exception e) { return 0; }
    }
    public static String currentUri() {
        Track t = instance == null ? null : instance.currentTrack();
        return t == null || t.uri == null ? "" : t.uri;
    }

    public static String stateJson(Context context) {
        try {
            JSONObject o = new JSONObject();
            if (instance != null) {
                o.put("running", true);
                o.put("playing", isPlayingNow());
                Track ct = instance.currentTrack();
                o.put("uri", currentUri());
                o.put("title", ct == null ? "" : ct.title);
                o.put("artist", ct == null ? "" : ct.artist);
                o.put("position", instance.prepared ? currentPosition() : Math.max(0, instance.pendingSeekPosition));
                o.put("duration", instance.prepared ? currentDuration() : (ct == null ? 0 : Math.max(0, ct.duration)));
                o.put("shuffle", instance.shuffle);
                o.put("repeat", instance.repeatMode);
                return o.toString();
            }
            SharedPreferences p = context.getSharedPreferences(PREFS, MODE_PRIVATE);
            o.put("running", false);
            o.put("playing", false); // never auto-play merely because the app was relaunched
            String savedUri = p.getString(KEY_URI, "");
            o.put("uri", savedUri);
            String savedTitle = "", savedArtist = ""; long savedDuration = 0;
            try { JSONArray a = new JSONArray(p.getString(KEY_PLAYLIST, "[]")); for(int i=0;i<a.length();i++){JSONObject t=a.optJSONObject(i);if(t!=null&&savedUri.equals(t.optString("uri",""))){savedTitle=t.optString("title","");savedArtist=t.optString("artist","");savedDuration=Math.max(0,t.optLong("duration",0));break;}} } catch(Exception ignored){}
            o.put("title", savedTitle); o.put("artist", savedArtist);
            o.put("position", Math.max(0, p.getInt(KEY_POSITION, 0)));
            o.put("duration", savedDuration);
            o.put("shuffle", p.getBoolean(KEY_SHUFFLE, false));
            o.put("repeat", normalizeRepeatStatic(p.getString(KEY_REPEAT, "off")));
            return o.toString();
        } catch (Exception e) {
            return "{\"running\":false,\"playing\":false,\"uri\":\"\",\"title\":\"\",\"artist\":\"\",\"position\":0,\"duration\":0,\"shuffle\":false,\"repeat\":\"off\"}";
        }
    }

    public static void persistMode(Context context, boolean shuffle, String repeat) {
        context.getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putBoolean(KEY_SHUFFLE, shuffle)
                .putString(KEY_REPEAT, normalizeRepeatStatic(repeat))
                .apply();
    }

    public static void persistAppearance(Context context, String color, boolean dark) {
        SharedPreferences.Editor e = context.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_DARK, dark);
        if (color != null && color.matches("^#[0-9a-fA-F]{6}$")) e.putString(KEY_COLOR, color);
        e.apply();
    }

    private static String normalizeRepeatStatic(String mode) {
        return "all".equals(mode) || "one".equals(mode) ? mode : "off";
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        createChannel();
        restoreSavedStateIntoMemory();
        createMediaSession();
        registerNoisyReceiver();
        stateHandler.postDelayed(stateSaver, 5000L);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (action == null) return START_NOT_STICKY;
        switch (action) {
            case ACTION_PLAY_URI:
                applyPlaylistJson(intent.getStringExtra("playlist"));
                shuffle = intent.getBooleanExtra("shuffle", shuffle);
                repeatMode = normalizeRepeat(intent.getStringExtra("repeat"));
                applyAppearance(intent);
                pendingSeekPosition = 0;
                playUri(intent.getStringExtra("uri"), 0);
                break;
            case ACTION_TOGGLE:
                if (isPlayingNow()) pausePlayback(); else resumePlayback();
                break;
            case ACTION_PAUSE:
                pausePlayback();
                break;
            case ACTION_RESUME:
                resumePlayback();
                break;
            case ACTION_NEXT:
                ensureForegroundPlaceholder();
                playNext(false);
                break;
            case ACTION_PREVIOUS:
                ensureForegroundPlaceholder();
                playPrevious();
                break;
            case ACTION_SEEK:
                if (player != null && prepared) {
                    try {
                        player.seekTo(Math.max(0, intent.getIntExtra("position", 0)));
                        updateSessionState();
                        persistState();
                    } catch (Exception ignored) { }
                } else {
                    pendingSeekPosition = Math.max(0, intent.getIntExtra("position", 0));
                    persistState();
                }
                break;
            case ACTION_MODE:
                shuffle = intent.getBooleanExtra("shuffle", shuffle);
                repeatMode = normalizeRepeat(intent.getStringExtra("repeat"));
                persistState();
                updateNotification();
                break;
            case ACTION_APPEARANCE:
                applyAppearance(intent);
                if (currentArtworkFallback && currentTrack() != null) {
                    currentArtwork = createFallbackArtwork(currentTrack());
                    updateMetadata();
                }
                persistState();
                updateNotification();
                break;
            case ACTION_STOP:
                stopPlaybackAndService();
                break;
        }
        return START_NOT_STICKY;
    }


    private void registerNoisyReceiver() {
        if (noisyReceiverRegistered) return;
        try {
            IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(noisyReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(noisyReceiver, filter);
            }
            noisyReceiverRegistered = true;
        } catch (Exception ignored) { }
    }

    private void unregisterNoisyReceiver() {
        if (!noisyReceiverRegistered) return;
        try { unregisterReceiver(noisyReceiver); } catch (Exception ignored) { }
        noisyReceiverRegistered = false;
    }

    private void createMediaSession() {
        mediaSession = new MediaSession(this, "StoryhandMusic");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public boolean onMediaButtonEvent(Intent mediaButtonIntent) {
                KeyEvent key = mediaButtonIntent == null ? null : mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                if (key == null) return super.onMediaButtonEvent(mediaButtonIntent);
                if (key.getAction() != KeyEvent.ACTION_DOWN) return true;
                switch (key.getKeyCode()) {
                    case KeyEvent.KEYCODE_MEDIA_PLAY:
                        resumePlayback();
                        return true;
                    case KeyEvent.KEYCODE_MEDIA_PAUSE:
                        pausePlayback();
                        return true;
                    case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                    case KeyEvent.KEYCODE_HEADSETPHOOK:
                        if (isPlayingNow()) pausePlayback(); else resumePlayback();
                        return true;
                    case KeyEvent.KEYCODE_MEDIA_NEXT:
                        playNext(false);
                        return true;
                    case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                        playPrevious();
                        return true;
                    default:
                        return super.onMediaButtonEvent(mediaButtonIntent);
                }
            }
            @Override public void onPlay() { resumePlayback(); }
            @Override public void onPause() { pausePlayback(); }
            @Override public void onSkipToNext() { playNext(false); }
            @Override public void onSkipToPrevious() { playPrevious(); }
            @Override public void onSeekTo(long pos) {
                if (player != null && prepared) {
                    try { player.seekTo((int)Math.max(0, Math.min(Integer.MAX_VALUE, pos))); updateSessionState(); persistState(); }
                    catch (Exception ignored) { }
                }
            }
            @Override public void onStop() { stopPlaybackAndService(); }
        });
        mediaSession.setActive(true);
        updateSessionState();
    }

    private void restoreSavedStateIntoMemory() {
        SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
        playlistJson = p.getString(KEY_PLAYLIST, "[]");
        applyPlaylistJson(playlistJson);
        shuffle = p.getBoolean(KEY_SHUFFLE, false);
        repeatMode = normalizeRepeat(p.getString(KEY_REPEAT, "off"));
        pendingSeekPosition = Math.max(0, p.getInt(KEY_POSITION, 0));
        accentColorText = p.getString(KEY_COLOR, "#5d5870");
        try { accentColor = Color.parseColor(accentColorText); } catch (Exception ignored) { accentColor = Color.parseColor("#5D5870"); }
        darkMode = p.getBoolean(KEY_DARK, false);
        String uri = p.getString(KEY_URI, "");
        currentIndex = indexForUri(uri);
    }

    private void applyPlaylistJson(String json) {
        if (json == null || json.trim().isEmpty()) return;
        try {
            JSONArray arr = new JSONArray(json);
            playlist.clear();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                Track t = new Track();
                t.uri = o.optString("uri", "");
                t.title = o.optString("title", "제목 없음");
                t.artist = o.optString("artist", "");
                t.duration = Math.max(0, o.optLong("duration", 0));
                if (!t.uri.isEmpty()) playlist.add(t);
            }
            playlistJson = json;
        } catch (Exception ignored) { }
    }

    private void applyAppearance(Intent intent) {
        String hex = intent.getStringExtra("color");
        darkMode = intent.getBooleanExtra("dark", darkMode);
        if (hex != null && !hex.trim().isEmpty()) {
            try {
                accentColor = Color.parseColor(hex);
                accentColorText = hex;
            } catch (Exception ignored) { }
        }
    }

    private String normalizeRepeat(String mode) { return normalizeRepeatStatic(mode); }

    private int indexForUri(String uri) {
        if (uri == null) return -1;
        for (int i = 0; i < playlist.size(); i++) if (uri.equals(playlist.get(i).uri)) return i;
        return -1;
    }

    private Track currentTrack() {
        return currentIndex >= 0 && currentIndex < playlist.size() ? playlist.get(currentIndex) : null;
    }

    private void playUri(String uriText, int seekPosition) {
        if (uriText == null || uriText.trim().isEmpty()) return;
        int idx = indexForUri(uriText);
        if (idx >= 0) currentIndex = idx;
        else {
            Track t = new Track();
            t.uri = uriText;
            t.title = "재생 중인 음악";
            playlist.add(t);
            currentIndex = playlist.size() - 1;
        }
        prepareCurrent(true, Math.max(0, seekPosition));
    }

    private java.io.File materializeHealingAsset(String assetPath) throws java.io.IOException {
        java.io.File dir = new java.io.File(getCacheDir(), "healing_audio");
        if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("Cannot create healing audio cache");
        String name = new java.io.File(assetPath).getName();
        java.io.File dst = new java.io.File(dir, name);
        if (dst.exists() && dst.length() > 0) return dst;
        try (java.io.InputStream in = getAssets().open(assetPath); java.io.OutputStream out = new java.io.FileOutputStream(dst)) {
            byte[] buf = new byte[32768]; int n;
            while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
        }
        return dst;
    }

    private String healingAssetPath(String uri) {
        if (uri == null || !uri.startsWith("healing://")) return null;
        String id = uri.substring("healing://".length());
        if ("medieval".equals(id)) return "extras/pastime/audio/custom/medieval_tale.mp3";
        if ("zoo".equals(id)) return "extras/pastime/audio/custom/zoo_piano.mp3";
        if ("campfire".equals(id)) return "extras/pastime/audio/custom/campfire_fantasy.mp3";
        if ("sleep".equals(id)) return "extras/pastime/audio/custom/sleep_lullaby.mp3";
        if ("sparkle".equals(id)) return "extras/pastime/audio/custom/sparkle_piano.mp3";
        if ("timeless".equals(id)) return "extras/pastime/audio/custom/timeless_heart.mp3";
        if ("fairytail".equals(id)) return "extras/pastime/audio/custom/fairy_tail.mp3";
        return null;
    }

    private void prepareCurrent(boolean autoStart, int seekPosition) {
        Track track = currentTrack();
        if (track == null) return;
        releasePlayer();
        pendingSeekPosition = Math.max(0, seekPosition);
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            if (track.uri != null && track.uri.startsWith("healing://")) {
                String assetPath = healingAssetPath(track.uri);
                if (assetPath == null) throw new IllegalArgumentException("Unknown healing sound");
                java.io.File local = materializeHealingAsset(assetPath);
                player.setDataSource(local.getAbsolutePath());
                player.setLooping(true);
            } else {
                player.setDataSource(this, Uri.parse(track.uri));
            }
            player.setOnPreparedListener(mp -> {
                prepared = true;
                if (pendingSeekPosition > 0) {
                    try { mp.seekTo(Math.min(pendingSeekPosition, Math.max(0, mp.getDuration() - 250))); } catch (Exception ignored) { }
                }
                pendingSeekPosition = 0;
                if (autoStart) {
                    requestAudioFocus();
                    mp.start();
                }
                currentArtwork = null;
                currentArtworkFallback = false;
                updateMetadata();
                updateSessionState();
                persistState();
                updateNotification();
                if (track.uri == null || !track.uri.startsWith("healing://")) loadCurrentArtworkAsync(track.uri);
            });
            player.setOnCompletionListener(mp -> playNext(true));
            player.setOnErrorListener((mp, what, extra) -> {
                prepared = false;
                persistState();
                updateSessionState();
                updateNotification();
                return true;
            });
            player.prepareAsync();
            startForeground(NOTIFICATION_ID, buildNotification(false));
        } catch (Exception e) {
            releasePlayer();
            updateNotification();
        }
    }

    private void ensureForegroundPlaceholder() {
        try { startForeground(NOTIFICATION_ID, buildNotification(isPlayingNow())); } catch (Exception ignored) { }
    }

    private void resumePlayback() {
        if (player == null || !prepared) {
            if (currentTrack() == null) restoreSavedStateIntoMemory();
            Track t = currentTrack();
            if (t != null) {
                SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
                int savedPosition = Math.max(0, p.getInt(KEY_POSITION, pendingSeekPosition));
                prepareCurrent(true, savedPosition);
            }
            return;
        }
        try {
            requestAudioFocus();
            player.start();
            updateSessionState();
            persistState();
            updateNotification();
        } catch (Exception ignored) { }
    }

    private void pausePlayback() {
        if (player != null && prepared) {
            try { if (player.isPlaying()) player.pause(); } catch (Exception ignored) { }
        }
        abandonAudioFocus();
        persistState();
        updateSessionState();
        updateNotification();
    }

    private void playNext(boolean fromCompletion) {
        if (playlist.isEmpty()) restoreSavedStateIntoMemory();
        if (playlist.isEmpty()) return;
        if (fromCompletion && "one".equals(repeatMode)) {
            prepareCurrent(true, 0);
            return;
        }
        int next;
        if (shuffle && playlist.size() > 1) {
            next = currentIndex;
            while (next == currentIndex) next = ThreadLocalRandom.current().nextInt(playlist.size());
        } else next = currentIndex + 1;
        if (next >= playlist.size()) {
            if ("all".equals(repeatMode) || !fromCompletion) next = 0;
            else {
                try { if (player != null) player.seekTo(0); } catch (Exception ignored) { }
                pendingSeekPosition = 0;
                pausePlayback();
                return;
            }
        }
        currentIndex = Math.max(0, next);
        prepareCurrent(true, 0);
    }

    private void playPrevious() {
        if (playlist.isEmpty()) restoreSavedStateIntoMemory();
        if (playlist.isEmpty()) return;
        if (player != null && prepared) {
            try {
                if (player.getCurrentPosition() > 5000) {
                    player.seekTo(0);
                    persistState();
                    updateSessionState();
                    return;
                }
            } catch (Exception ignored) { }
        }
        int prev;
        if (shuffle && playlist.size() > 1) {
            prev = currentIndex;
            while (prev == currentIndex) prev = ThreadLocalRandom.current().nextInt(playlist.size());
        } else {
            prev = currentIndex - 1;
            if (prev < 0) prev = playlist.size() - 1;
        }
        currentIndex = Math.max(0, prev);
        prepareCurrent(true, 0);
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                if (focusRequest == null) {
                    focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                    .build())
                            .setOnAudioFocusChangeListener(change -> {
                                if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) pausePlayback();
                            }).build();
                }
                audioManager.requestAudioFocus(focusRequest);
            } else {
                audioManager.requestAudioFocus(change -> {
                    if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) pausePlayback();
                }, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        } catch (Exception ignored) { }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        try { if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest); }
        catch (Exception ignored) { }
    }

    private void loadCurrentArtworkAsync(String expectedUri) {
        new Thread(() -> {
            Bitmap art = null;
            MediaMetadataRetriever r = new MediaMetadataRetriever();
            try {
                r.setDataSource(this, Uri.parse(expectedUri));
                byte[] data = r.getEmbeddedPicture();
                if (data != null && data.length > 0) {
                    BitmapFactory.Options bounds = new BitmapFactory.Options();
                    bounds.inJustDecodeBounds = true;
                    BitmapFactory.decodeByteArray(data, 0, data.length, bounds);
                    int sample = 1;
                    while (bounds.outWidth / sample > 512 || bounds.outHeight / sample > 512) sample *= 2;
                    BitmapFactory.Options opts = new BitmapFactory.Options();
                    opts.inSampleSize = Math.max(1, sample);
                    art = BitmapFactory.decodeByteArray(data, 0, data.length, opts);
                }
            } catch (Exception ignored) { }
            finally { try { r.release(); } catch (Exception ignored) { } }
            final Bitmap ready = art;
            final boolean hasEmbeddedArtwork = ready != null;
            stateHandler.post(() -> {
                Track now = currentTrack();
                if (now == null || !expectedUri.equals(now.uri)) return;
                currentArtworkFallback = !hasEmbeddedArtwork;
                currentArtwork = hasEmbeddedArtwork ? ready : createFallbackArtwork(now);
                updateMetadata();
                updateNotification();
            });
        }, "StoryhandAlbumArt").start();
    }

    /**
     * Generates a quiet, app-themed fallback cover only when the audio file has no embedded artwork.
     * The current project/theme accent is intentionally subtle so it works in notification and lock-screen media UI.
     */
    private Bitmap createFallbackArtwork(Track track) {
        final int size = 768;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        int base = accentColor;
        int c1;
        int c2;
        int c3;
        if (darkMode) {
            c1 = mixColor(base, Color.rgb(24, 23, 30), 0.64f);
            c2 = mixColor(base, Color.rgb(48, 45, 58), 0.38f);
            c3 = mixColor(base, Color.rgb(112, 105, 125), 0.26f);
        } else {
            c1 = mixColor(base, Color.WHITE, 0.78f);
            c2 = mixColor(base, Color.WHITE, 0.55f);
            c3 = mixColor(base, Color.rgb(66, 62, 74), 0.10f);
        }

        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setShader(new LinearGradient(0, 0, size, size, new int[]{c1, c2, c3}, new float[]{0f, .58f, 1f}, Shader.TileMode.CLAMP));
        canvas.drawRect(0, 0, size, size, bg);

        // Soft glass-like shapes: deliberately faint so the result stays calm rather than decorative.
        Paint haze = new Paint(Paint.ANTI_ALIAS_FLAG);
        haze.setColor(darkMode ? Color.argb(24, 255, 255, 255) : Color.argb(32, 255, 255, 255));
        canvas.drawCircle(size * .82f, size * .18f, size * .34f, haze);
        haze.setColor(darkMode ? Color.argb(18, 255, 255, 255) : Color.argb(22, 255, 255, 255));
        canvas.drawCircle(size * .16f, size * .86f, size * .42f, haze);

        Paint frame = new Paint(Paint.ANTI_ALIAS_FLAG);
        frame.setStyle(Paint.Style.STROKE);
        frame.setStrokeWidth(2f);
        frame.setColor(darkMode ? Color.argb(42, 255, 255, 255) : Color.argb(40, 255, 255, 255));
        canvas.drawRoundRect(new RectF(48, 48, size - 48, size - 48), 42, 42, frame);

        Paint note = new Paint(Paint.ANTI_ALIAS_FLAG);
        note.setTextAlign(Paint.Align.CENTER);
        note.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        note.setTextSize(174f);
        note.setColor(darkMode ? Color.argb(222, 255, 255, 255) : Color.argb(212, 255, 255, 255));
        Paint.FontMetrics fm = note.getFontMetrics();
        float noteY = size * .47f - (fm.ascent + fm.descent) / 2f;
        canvas.drawText("♪", size / 2f, noteY, note);

        // A tiny restrained signature line gives the cover an album-like finish without repeating the song title.
        Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
        line.setStrokeWidth(4f);
        line.setStrokeCap(Paint.Cap.ROUND);
        line.setColor(darkMode ? Color.argb(92, 255, 255, 255) : Color.argb(78, 255, 255, 255));
        canvas.drawLine(size * .39f, size * .69f, size * .61f, size * .69f, line);

        return bitmap;
    }

    private int mixColor(int a, int b, float amountOfB) {
        float t = Math.max(0f, Math.min(1f, amountOfB));
        int r = Math.round(Color.red(a) * (1f - t) + Color.red(b) * t);
        int g = Math.round(Color.green(a) * (1f - t) + Color.green(b) * t);
        int bl = Math.round(Color.blue(a) * (1f - t) + Color.blue(b) * t);
        return Color.rgb(r, g, bl);
    }

    private void updateMetadata() {
        if (mediaSession == null) return;
        Track t = currentTrack();
        if (t == null) return;
        long duration = currentDuration();
        if (duration <= 0) duration = t.duration;
        MediaMetadata.Builder b = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, t.title == null ? "제목 없음" : t.title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, t.artist == null ? "" : t.artist)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, Math.max(0, duration));
        if (currentArtwork != null) b.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentArtwork);
        mediaSession.setMetadata(b.build());
    }

    private void updateSessionState() {
        if (mediaSession == null) return;
        boolean playing = isPlayingNow();
        int state = playing ? PlaybackState.STATE_PLAYING : (prepared || currentTrack() != null ? PlaybackState.STATE_PAUSED : PlaybackState.STATE_NONE);
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE |
                PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO | PlaybackState.ACTION_STOP;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setActions(actions)
                .setState(state, player != null && prepared ? currentPosition() : pendingSeekPosition, playing ? 1f : 0f)
                .build());
    }

    private PendingIntent serviceAction(String action, int requestCode) {
        Intent i = new Intent(this, MusicPlaybackService.class).setAction(action);
        return PendingIntent.getService(this, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification buildNotification(boolean playing) {
        Track t = currentTrack();
        String title = t == null ? "음악 플레이어" : (t.title == null || t.title.isEmpty() ? "제목 없음" : t.title);
        String artist = t == null || t.artist == null || t.artist.isEmpty() ? "창작소 : 내 손안에 이야기" : t.artist;
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(this, 20, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        b.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(artist)
                .setContentIntent(contentIntent)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(playing)
                .setOnlyAlertOnce(true)
                .setColor(accentColor)
                .setCategory(Notification.CATEGORY_TRANSPORT)
                .setDeleteIntent(serviceAction(ACTION_STOP, 24))
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "이전", serviceAction(ACTION_PREVIOUS, 21)).build())
                .addAction(new Notification.Action.Builder(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "일시정지" : "재생", serviceAction(ACTION_TOGGLE, 22)).build())
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "다음", serviceAction(ACTION_NEXT, 23)).build())
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "종료", serviceAction(ACTION_STOP, 24)).build());
        if (currentArtwork != null) b.setLargeIcon(currentArtwork);
        if (mediaSession != null) b.setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken()).setShowActionsInCompactView(0, 1, 2));
        if (Build.VERSION.SDK_INT >= 26) b.setColorized(false);
        return b.build();
    }

    private void updateNotification() {
        if (currentTrack() == null) return;
        boolean playing = isPlayingNow();
        updateMetadata();
        updateSessionState();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(playing));
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "음악 재생", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("창작소 음악 백그라운드 재생 컨트롤");
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
    }

    private void persistState() {
        Track t = currentTrack();
        int pos = pendingSeekPosition;
        if (player != null && prepared) {
            try { pos = Math.max(0, player.getCurrentPosition()); } catch (Exception ignored) { }
        }
        pendingSeekPosition = Math.max(0, pos);
        SharedPreferences.Editor e = getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(KEY_URI, t == null || t.uri == null ? "" : t.uri)
                .putInt(KEY_POSITION, Math.max(0, pos))
                .putString(KEY_PLAYLIST, playlistJson == null ? "[]" : playlistJson)
                .putBoolean(KEY_SHUFFLE, shuffle)
                .putString(KEY_REPEAT, repeatMode)
                .putString(KEY_COLOR, accentColorText)
                .putBoolean(KEY_DARK, darkMode);
        e.apply();
    }

    private void releasePlayer() {
        prepared = false;
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) { }
            try { player.release(); } catch (Exception ignored) { }
            player = null;
        }
    }

    private void stopPlaybackAndService() {
        persistState();
        abandonAudioFocus();
        releasePlayer();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Swiping the Activity away is not an explicit music stop. Keep playback service alive if playing.
        persistState();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        persistState();
        stateHandler.removeCallbacks(stateSaver);
        unregisterNoisyReceiver();
        releasePlayer();
        if (mediaSession != null) {
            try { mediaSession.setActive(false); mediaSession.release(); } catch (Exception ignored) { }
            mediaSession = null;
        }
        if (instance == this) instance = null;
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
