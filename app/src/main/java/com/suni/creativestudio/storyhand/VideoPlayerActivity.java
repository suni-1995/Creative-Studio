package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.util.Locale;

/** Independent, foreground-only local video player. */
public class VideoPlayerActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private JSONArray videos = new JSONArray();
    private int index = -1;
    private VideoView video;
    private SeekBar seek;
    private TextView title, clock;
    private LinearLayout root, controls;
    private Button toggle, full;
    private boolean prepared, switching, fullscreen, seeking, ended;
    private boolean orientationTransition, restartAfterOrientation;
    private long lastSaved;
    private String currentId = "";
    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            if (prepared && video != null) {
                try {
                    int position = video.getCurrentPosition();
                    int duration = video.getDuration();
                    if (!seeking) seek.setProgress(Math.max(0, position));
                    seek.setMax(Math.max(1, duration));
                    clock.setText(time(position) + " / " + time(duration));
                    toggle.setText(video.isPlaying() ? "일시정지" : "재생");
                    if (video.isPlaying() && android.os.SystemClock.elapsedRealtime() - lastSaved > 5000) savePosition(position);
                } catch (Exception ignored) { }
            }
            handler.postDelayed(this, 500);
        }
    };
    private int dp(int n) { return (int)(n * getResources().getDisplayMetrics().density + .5f); }
    private GradientDrawable bg(int color) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(12)); return d; }
    private Button button(String label, LinearLayout parent, View.OnClickListener action) {
        Button b = new Button(this); b.setText(label); b.setAllCaps(false); b.setTextSize(12);
        b.setTextColor(Color.WHITE); b.setBackground(bg(Color.rgb(88,81,110)));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, dp(46), 1); p.setMargins(dp(2),0,dp(2),0);
        parent.addView(b,p); b.setOnClickListener(action); return b;
    }
    private String time(int ms) {
        int s = Math.max(0,ms)/1000;
        return s>=3600 ? String.format(Locale.getDefault(),"%d:%02d:%02d",s/3600,(s/60)%60,s%60)
                       : String.format(Locale.getDefault(),"%02d:%02d",s/60,s%60);
    }
    private android.content.SharedPreferences prefs() { return getSharedPreferences("video_library_only",MODE_PRIVATE); }
    private String positionKey(String id) { return "position_" + id; }
    private void savePosition(int position) {
        if (currentId.isEmpty() || ended) return;
        prefs().edit().putInt(positionKey(currentId), Math.max(0,position)).apply();
        lastSaved = android.os.SystemClock.elapsedRealtime();
    }
    private void checkpoint() {
        if (prepared && !ended && video != null) {
            try { savePosition(video.getCurrentPosition()); } catch (Exception ignored) { }
        }
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        try { videos = new JSONArray(prefs().getString("videos","[]")); } catch (Exception ignored) { }
        String requested = getIntent().getStringExtra("video_id");
        for (int i=0;i<videos.length();i++) {
            JSONObject item=videos.optJSONObject(i);
            if (item!=null && item.optString("id").equals(requested)) { index=i; break; }
        }
        if (index<0) { Toast.makeText(this,"영상을 찾을 수 없습니다.",Toast.LENGTH_LONG).show(); finish(); return; }
        boolean dark = getSharedPreferences("creative_studio_prefs",MODE_PRIVATE).getBoolean("dark_mode",false);
        int surface = dark ? Color.rgb(23,23,27) : Color.rgb(245,244,242);
        int ink = dark ? Color.WHITE : Color.rgb(36,35,40);
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(10),dp(12),dp(10),dp(12)); root.setBackgroundColor(surface);
        title = new TextView(this); title.setTextColor(ink); title.setTextSize(19);
        title.setGravity(Gravity.CENTER_VERTICAL); title.setMaxLines(2);
        root.addView(title,new LinearLayout.LayoutParams(-1,dp(60)));
        video = new VideoView(this); video.setBackgroundColor(Color.BLACK);
        root.addView(video,new LinearLayout.LayoutParams(-1,0,1));
        controls = new LinearLayout(this); controls.setOrientation(LinearLayout.VERTICAL);
        seek = new SeekBar(this); controls.addView(seek,new LinearLayout.LayoutParams(-1,dp(40)));
        clock = new TextView(this); clock.setTextColor(ink); clock.setGravity(Gravity.CENTER);
        controls.addView(clock,new LinearLayout.LayoutParams(-1,dp(28)));
        LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER);
        controls.addView(row);
        button("이전",row,v->move(-1));
        button("-10초",row,v->jump(-10000));
        toggle=button("일시정지",row,v->{ if (!prepared) return; if (video.isPlaying()) { video.pause(); checkpoint(); } else { if (ended) { video.seekTo(0); ended=false; } video.start(); } toggle.setText(video.isPlaying()?"일시정지":"재생"); });
        button("+10초",row,v->jump(10000));
        button("다음",row,v->move(1));
        LinearLayout extra = new LinearLayout(this); controls.addView(extra);
        button("처음부터",extra,v->{ if (!prepared) return; prefs().edit().remove(positionKey(currentId)).apply(); video.seekTo(0); ended=false; video.start(); });
        full=button("전체화면",extra,v->setFullscreen(!fullscreen));
        root.addView(controls);
        setContentView(root);
        video.setOnClickListener(v->controls.setVisibility(controls.getVisibility()==View.VISIBLE?View.GONE:View.VISIBLE));
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onStartTrackingTouch(SeekBar bar) { seeking=true; }
            public void onProgressChanged(SeekBar bar,int progress,boolean user) { if (user) clock.setText(time(progress)+" / "+time(video.getDuration())); }
            public void onStopTrackingTouch(SeekBar bar) { if (prepared) { video.seekTo(bar.getProgress()); checkpoint(); } seeking=false; }
        });
        video.setOnPreparedListener(mp->{
            prepared=true; switching=false; ended=false;
            int duration=video.getDuration();
            int saved=prefs().getInt(positionKey(currentId),0);
            if (saved>0 && duration>0 && saved<duration-1000) video.seekTo(saved);
            video.start();
            toggle.setText(video.isPlaying() ? "일시정지" : "재생");
        });
        video.setOnCompletionListener(mp->{
            prepared=false; ended=true; switching=false;
            prefs().edit().remove(positionKey(currentId)).apply();
            if (index+1<videos.length()) open(index+1); else { prepared=true; toggle.setText("재생"); Toast.makeText(this,"마지막 영상 재생이 끝났습니다.",Toast.LENGTH_SHORT).show(); }
        });
        video.setOnErrorListener((mp,what,extra)->{
            prepared=false; switching=false;
            Toast.makeText(this,"영상을 재생할 수 없습니다. 파일 또는 형식을 확인해 주세요.",Toast.LENGTH_LONG).show();
            return true;
        });
        handler.post(ticker);
        open(index);
    }
    private void open(int target) {
        if (target<0 || target>=videos.length() || switching) return;
        checkpoint();
        prepared=false; ended=false; switching=true; index=target;
        JSONObject item=videos.optJSONObject(index);
        if (item==null) { switching=false; return; }
        currentId=item.optString("id");
        title.setText(item.optString("title","동영상"));
        File file=new File(new File(getFilesDir(),"video_library"),item.optString("file"));
        if (!file.isFile()) {
            switching=false; Toast.makeText(this,"저장된 영상 파일이 없습니다.",Toast.LENGTH_LONG).show(); return;
        }
        try { video.stopPlayback(); video.setVideoPath(file.getAbsolutePath()); video.requestFocus(); }
        catch (Exception e) { switching=false; Toast.makeText(this,"영상 열기에 실패했습니다.",Toast.LENGTH_LONG).show(); }
    }
    private void move(int delta) {
        int target=index+delta;
        if (target>=0 && target<videos.length()) open(target);
        else Toast.makeText(this,delta>0?"마지막 영상입니다.":"첫 번째 영상입니다.",Toast.LENGTH_SHORT).show();
    }
    private void jump(int delta) {
        if (!prepared) return;
        video.seekTo(Math.max(0,Math.min(video.getDuration(),video.getCurrentPosition()+delta)));
        checkpoint();
    }
    private void setFullscreen(boolean value) {
        orientationTransition=true;
        restartAfterOrientation=prepared && video.isPlaying();
        fullscreen=value;
        if (value) {
            getWindow().getDecorView().setSystemUiVisibility(5894 | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            title.setVisibility(View.GONE);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(0);
            title.setVisibility(View.VISIBLE);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
        full.setText(value?"전체화면 종료":"전체화면");
    }
    @Override public void onBackPressed() {
        if (fullscreen) setFullscreen(false); else super.onBackPressed();
    }
    @Override public void onConfigurationChanged(android.content.res.Configuration config) {
        super.onConfigurationChanged(config);
        // The activity instance and VideoView are retained across rotation.
        if (orientationTransition) { orientationTransition=false; if (restartAfterOrientation && prepared) video.start(); restartAfterOrientation=false; }
    }
    @Override protected void onPause() {
        super.onPause();
        if (video!=null && prepared) { checkpoint(); if (!orientationTransition) video.pause(); }
    }
    @Override protected void onResume() {
        super.onResume();
        // Background playback is intentionally disabled; resume only by user action.

    }
    @Override protected void onDestroy() {
        checkpoint(); handler.removeCallbacks(ticker);
        if (video!=null) video.stopPlayback();
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onDestroy();
    }
}