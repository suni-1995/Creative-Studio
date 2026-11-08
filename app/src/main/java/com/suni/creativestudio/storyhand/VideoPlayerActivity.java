package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.util.Locale;

/** Standalone foreground video playback. No project or music dependencies. */
public class VideoPlayerActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable hideControls = () -> setControlsVisible(false);
    private final Runnable progressTick = new Runnable() {
        @Override public void run() {
            if (prepared) {
                try {
                    int at = video.getCurrentPosition(), duration = Math.max(0, video.getDuration());
                    if (!dragging) { seek.setMax(Math.max(1, duration)); seek.setProgress(Math.max(0, at)); }
                    time.setText(format(at) + " / " + format(duration));
                    play.setText(video.isPlaying() ? "Ⅱ" : "▶");
                    if (video.isPlaying() && SystemClock.elapsedRealtime() - lastSaved >= 5000) savePosition(at);
                } catch (Exception ignored) { }
            }
            handler.postDelayed(this, 500);
        }
    };
    private JSONArray entries = new JSONArray();
    private int index = -1;
    private String id = "";
    private VideoView video;
    private FrameLayout frame;
    private LinearLayout overlay, bottom, center;
    private TextView heading, time;
    private SeekBar seek;
    private TextView play, fullscreenButton;
    private boolean prepared, loading, ended, dragging, fullscreen, controlsVisible = true;
    private boolean orientationChange, playingBeforeOrientation;
    private long lastSaved;
    private int lastKnownPosition;
    private int videoWidth, videoHeight;
    private int foreground, background;
    private int dp(int value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }
    private android.content.SharedPreferences prefs() { return getSharedPreferences("video_library_only", MODE_PRIVATE); }
    private String key() { return "position_" + id; }
    private String format(int milliseconds) {
        int seconds = Math.max(0, milliseconds) / 1000;
        return seconds >= 3600 ? String.format(Locale.getDefault(), "%d:%02d:%02d", seconds/3600, seconds/60%60, seconds%60)
            : String.format(Locale.getDefault(), "%02d:%02d", seconds/60, seconds%60);
    }
    private GradientDrawable pill(int color) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(12)); return d;
    }
    private TextView label(String text, int size) {
        TextView t = new TextView(this); t.setText(text); t.setTextColor(Color.WHITE);
        t.setTextSize(size); t.setGravity(Gravity.CENTER); return t;
    }
    private TextView control(String text, LinearLayout parent, int weight, View.OnClickListener action) {
        TextView t = label(text, 18);
        t.setBackground(pill(0x88000000));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, dp(42), weight);
        p.setMargins(dp(5),0,dp(5),0); parent.addView(t,p);
        t.setOnClickListener(v -> { action.onClick(v); showControls(); });
        return t;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        try { entries = new JSONArray(prefs().getString("videos","[]")); } catch (Exception ignored) { }
        String selected = getIntent().getStringExtra("video_id");
        for (int i=0;i<entries.length();i++) {
            JSONObject e=entries.optJSONObject(i);
            if (e!=null && e.optString("id").equals(selected)) { index=i; break; }
        }
        if (index<0) { Toast.makeText(this,"영상을 찾을 수 없습니다.",Toast.LENGTH_LONG).show(); finish(); return; }
        boolean dark=getSharedPreferences("creative_studio_prefs",MODE_PRIVATE).getBoolean("dark_mode",false);
        background=dark?0xFF17171B:0xFFF5F4F2;
        foreground=dark?Color.WHITE:0xFF242328;
        frame=new FrameLayout(this); frame.setBackgroundColor(Color.BLACK);
        video=new VideoView(this);
        // Never set a background on VideoView: an opaque SurfaceView background can cover decoded frames.
        frame.addView(video,new FrameLayout.LayoutParams(-1,-1,Gravity.CENTER));
        overlay=new LinearLayout(this); overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setBackgroundColor(0x22000000);
        frame.addView(overlay,new FrameLayout.LayoutParams(-1,-1));
        heading=label("",16); heading.setGravity(Gravity.CENTER_VERTICAL|Gravity.START);
        heading.setPadding(dp(18),dp(8),dp(18),0); heading.setMaxLines(2);
        overlay.addView(heading,new LinearLayout.LayoutParams(-1,dp(46)));
        Space topSpace=new Space(this); overlay.addView(topSpace,new LinearLayout.LayoutParams(1,0,1));
        center=new LinearLayout(this); center.setGravity(Gravity.CENTER); center.setPadding(dp(10),0,dp(10),0);
        overlay.addView(center,new LinearLayout.LayoutParams(-1,dp(50)));
        control("◀Ⅰ",center,1,v->move(-1));
        control("↶10",center,1,v->jump(-10000));
        play=control("▶",center,1,v->toggle());
        control("10↷",center,1,v->jump(10000));
        control("Ⅰ▶",center,1,v->move(1));
        Space bottomSpace=new Space(this); overlay.addView(bottomSpace,new LinearLayout.LayoutParams(1,0,1));
        bottom=new LinearLayout(this); bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(12),0,dp(12),dp(4));
        bottom.setBackgroundColor(0x33000000);
        overlay.addView(bottom,new LinearLayout.LayoutParams(-1,-2));
        seek=new SeekBar(this); seek.setPadding(0,0,0,0); seek.setMaxHeight(dp(2));
        seek.setProgressTintList(android.content.res.ColorStateList.valueOf(0xFFB5A9D3));
        seek.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(0x66FFFFFF));
        bottom.addView(seek,new LinearLayout.LayoutParams(-1,dp(22)));
        LinearLayout actions=new LinearLayout(this); actions.setGravity(Gravity.CENTER_VERTICAL);
        bottom.addView(actions,new LinearLayout.LayoutParams(-1,dp(32)));
        time=label("00:00 / 00:00",12); time.setGravity(Gravity.CENTER_VERTICAL|Gravity.START);
        actions.addView(time,new LinearLayout.LayoutParams(0,-1,1));
        TextView restart=label("처음부터",12); restart.setPadding(dp(10),0,dp(10),0);
        actions.addView(restart,new LinearLayout.LayoutParams(-2,-1));
        restart.setOnClickListener(v->{ if(prepared){ prefs().edit().remove(key()).apply(); lastKnownPosition=0; ended=false; video.seekTo(0); video.start(); } showControls(); });
        fullscreenButton=label("⛶",22); fullscreenButton.setPadding(dp(12),0,dp(12),0);
        actions.addView(fullscreenButton,new LinearLayout.LayoutParams(-2,-1));
        fullscreenButton.setOnClickListener(v->{ setFullscreen(!fullscreen); showControls(); });
        setContentView(frame);
        // Taps on the empty overlay area reveal or dismiss the controls.
        overlay.setOnClickListener(v->{ if(controlsVisible) setControlsVisible(false); else showControls(); });
        frame.setOnClickListener(v->showControls());
        frame.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,oright,ob)->updateOverlayBounds());
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onStartTrackingTouch(SeekBar s) { dragging=true; handler.removeCallbacks(hideControls); }
            public void onProgressChanged(SeekBar s,int value,boolean user) { if(user) time.setText(format(value)+" / "+format(video.getDuration())); }
            public void onStopTrackingTouch(SeekBar s) { if(prepared){ video.seekTo(s.getProgress()); savePosition(s.getProgress()); } dragging=false; showControls(); }
        });
        video.setOnPreparedListener(mp->{
            prepared=true; loading=false; ended=false;
            videoWidth=mp.getVideoWidth(); videoHeight=mp.getVideoHeight();
            updateOverlayBounds();
            int saved=prefs().getInt(key(),0), duration=video.getDuration();
            if(saved>0 && duration>0 && saved<duration-1000) { video.seekTo(saved); lastKnownPosition=saved; }
            video.start(); showControls();
        });
        video.setOnCompletionListener(mp->{
            prepared=false; loading=false; ended=true;
            prefs().edit().remove(key()).apply(); lastKnownPosition=0;
            if(index+1<entries.length()) open(index+1);
            else { prepared=true; play.setText("▶"); showControls(); Toast.makeText(this,"마지막 영상 재생이 끝났습니다.",Toast.LENGTH_SHORT).show(); }
        });
        video.setOnErrorListener((mp,what,errorCode)->{
            prepared=false; loading=false;
            Toast.makeText(this,"영상 화면을 재생할 수 없습니다. 파일 형식 또는 코덱을 확인해 주세요.",Toast.LENGTH_LONG).show();
            showControls(); return true;
        });
        handler.post(progressTick);
        open(index);
    }
    private void savePosition(int position) {
        if(id.isEmpty() || ended) return;
        if(position<=0 && lastKnownPosition>1000) return;
        lastKnownPosition=Math.max(0,position);
        prefs().edit().putInt(key(),lastKnownPosition).commit();
        lastSaved=SystemClock.elapsedRealtime();
    }
    private void checkpoint() {
        if(prepared && !ended) try { int pos=video.getCurrentPosition(); if(pos>0) savePosition(pos); } catch(Exception ignored) { }
    }
    private void open(int target) {
        if(target<0 || target>=entries.length() || loading) return;
        checkpoint(); prepared=false; loading=true; ended=false; index=target;
        JSONObject item=entries.optJSONObject(target);
        if(item==null){ loading=false; return; }
        id=item.optString("id");
        lastKnownPosition=prefs().getInt(key(),0);
        heading.setText(item.optString("title","동영상"));
        File file=new File(new File(getFilesDir(),"video_library"),item.optString("file"));
        if(!file.isFile()){ loading=false; Toast.makeText(this,"저장된 영상 파일이 없습니다.",Toast.LENGTH_LONG).show(); return; }
        try { video.stopPlayback(); video.setVideoPath(file.getAbsolutePath()); video.requestFocus(); }
        catch(Exception e){ loading=false; Toast.makeText(this,"영상 열기에 실패했습니다.",Toast.LENGTH_LONG).show(); }
        showControls();
    }
    private void toggle() {
        if(!prepared) return;
        if(video.isPlaying()){ checkpoint(); video.pause(); }
        else { if(ended){ video.seekTo(0); ended=false; } video.start(); }
        play.setText(video.isPlaying()?"Ⅱ":"▶");
    }
    private void jump(int delta) {
        if(!prepared) return;
        int pos=Math.max(0,Math.min(video.getDuration(),video.getCurrentPosition()+delta));
        video.seekTo(pos); savePosition(pos);
    }
    private void move(int delta) {
        int next=index+delta;
        if(next>=0 && next<entries.length()) open(next);
        else Toast.makeText(this,delta>0?"마지막 영상입니다.":"첫 번째 영상입니다.",Toast.LENGTH_SHORT).show();
    }
    private void updateOverlayBounds() {
        if(frame==null || overlay==null || videoWidth<=0 || videoHeight<=0) return;
        int w=frame.getWidth(), h=frame.getHeight();
        if(w<=0 || h<=0) return;
        float scale=Math.min((float)w/videoWidth,(float)h/videoHeight);
        int displayW=Math.max(1,Math.round(videoWidth*scale));
        int displayH=Math.max(1,Math.round(videoHeight*scale));
        FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(displayW,displayH,Gravity.CENTER);
        overlay.setLayoutParams(p);
    }
    private void setControlsVisible(boolean visible) {
        controlsVisible=visible;
        overlay.setVisibility(visible?View.VISIBLE:View.GONE);
        handler.removeCallbacks(hideControls);
        if(visible && !dragging) handler.postDelayed(hideControls,5000);
    }
    private void showControls() { setControlsVisible(true); }
    private void setFullscreen(boolean enable) {
        fullscreen=enable;
        orientationChange=true;
        playingBeforeOrientation=prepared && video.isPlaying();
        if(enable) {
            getWindow().getDecorView().setSystemUiVisibility(5894|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(0);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
        fullscreenButton.setText(enable?"⛶":"⛶");
    }
    @Override public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config);
        orientationChange=false;
        frame.post(this::updateOverlayBounds);
        if(playingBeforeOrientation && prepared) video.start();
        playingBeforeOrientation=false;
    }
    @Override public void onBackPressed() {
        if(fullscreen) { setFullscreen(false); showControls(); } else { checkpoint(); super.onBackPressed(); }
    }
    @Override protected void onPause() {
        super.onPause();
        if(prepared){ checkpoint(); if(!orientationChange) video.pause(); }
    }
    @Override protected void onDestroy() {
        // onPause/onBackPressed already persisted the last valid frame; a torn-down surface may report zero.
        handler.removeCallbacks(progressTick); handler.removeCallbacks(hideControls);
        video.stopPlayback(); getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onDestroy();
    }
}