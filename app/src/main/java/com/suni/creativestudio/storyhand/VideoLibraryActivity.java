package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.ViewGroup;
import android.widget.PopupMenu;
import android.view.View;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.util.UUID;

/** Isolated local video library. No project data or ZIP backup integration. */
public class VideoLibraryActivity extends Activity {
    private static final int PICK_VIDEO = 8401;
    private static final String PREFS = "video_library_only";
    private static final String KEY = "videos";
    private final Object lock = new Object();
    private JSONArray videos = new JSONArray();
    private LinearLayout list;
    private TextView progressLabel;
    private ProgressBar progressBar;
    private volatile boolean cancelled;
    private volatile boolean copying;
    private File currentTemp;
    private LinearLayout root;
    private boolean dark;
    private int background, surface, foreground, secondary, stroke, accent;
    private Button addButton;
    private String importingName = "";
    private volatile int importingPercent = -1;

    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + .5f); }
    private GradientDrawable rounded(int color, int border, int radius) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(dp(radius));
        if (border != Color.TRANSPARENT) shape.setStroke(dp(1), border);
        return shape;
    }
    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER_VERTICAL);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }
    private void colors() {
        dark = getSharedPreferences("creative_studio_prefs", MODE_PRIVATE).getBoolean("dark_mode", false);
        background = Color.parseColor(dark ? "#17171B" : "#F5F4F2");
        surface = Color.parseColor(dark ? "#211F25" : "#FFFFFF");
        foreground = Color.parseColor(dark ? "#F2F1F5" : "#242328");
        secondary = Color.parseColor(dark ? "#A6A2AD" : "#77737D");
        stroke = Color.parseColor(dark ? "#38353F" : "#E5E2DF");
        accent = Color.parseColor(dark ? "#8F83AB" : "#5D5870");
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);
        int flags = getWindow().getDecorView().getSystemUiVisibility();
        if (dark) flags &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        else flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        colors();
        try { videos = new JSONArray(getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY, "[]")); }
        catch (Exception ignored) { videos = new JSONArray(); }
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(background);
        root.setPadding(dp(18), dp(18), dp(18), dp(12));

        TextView title = text("동영상 플레이어", 23, foreground, true);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(-1, dp(52));
        titleParams.bottomMargin = dp(12);
        root.addView(title, titleParams);

        addButton = new Button(this);
        addButton.setText("＋  동영상 등록");
        addButton.setAllCaps(false);
        addButton.setTextColor(Color.WHITE);
        addButton.setBackground(rounded(accent, Color.TRANSPARENT, 14));
        addButton.setOnClickListener(v -> chooseVideo());
        LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(-1, dp(52));
        addParams.bottomMargin = dp(14);
        root.addView(addButton, addParams);

        progressLabel = text("", 13, secondary, false);
        progressLabel.setVisibility(View.GONE);
        root.addView(progressLabel);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        root.addView(progressBar);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        render();
    }

    private void chooseVideo() {
        if (copying) return;
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("video/*");
        try { startActivityForResult(pick, PICK_VIDEO); }
        catch (Exception e) { toast("파일 선택기를 열 수 없습니다."); }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_VIDEO && result == RESULT_OK && data != null && data.getData() != null) {
            importVideo(data.getData());
        }
    }

    private String displayName(Uri uri) {
        String name = "동영상";
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) name = c.getString(0);
        } catch (Exception ignored) { }
        return name == null || name.trim().isEmpty() ? "동영상" : name;
    }

    private long fileSize(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst() && !c.isNull(0)) return c.getLong(0);
        } catch (Exception ignored) { }
        return -1;
    }

    private void importVideo(Uri uri) {
        if (copying) return;
        copying = true;
        cancelled = false;
        importingPercent = 0;
        addButton.setEnabled(false);
        final String name = displayName(uri);
        importingName = name;
        render();
        final long total = fileSize(uri);
        progressLabel.setVisibility(View.VISIBLE);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.VISIBLE);
        progressLabel.setText("등록 중: " + name + " (0%)");
        new Thread(() -> {
            File directory = new File(getFilesDir(), "video_library");
            File temp = null;
            try {
                if (!directory.exists() && !directory.mkdirs()) throw new IOException("저장 폴더 생성 실패");
                String id = UUID.randomUUID().toString();
                temp = new File(directory, id + ".partial");
                currentTemp = temp;
                long copied = 0;
                byte[] buffer = new byte[65536];
                try (InputStream input = getContentResolver().openInputStream(uri);
                     OutputStream output = new FileOutputStream(temp)) {
                    if (input == null) throw new IOException("파일을 읽을 수 없습니다.");
                    int n;
                    while ((n = input.read(buffer)) != -1) {
                        if (cancelled) throw new IOException("등록 취소");
                        output.write(buffer, 0, n);
                        copied += n;
                        final int percent = total > 0 ? (int)Math.min(99, copied * 100 / total) : -1;
                        runOnUiThread(() -> {
                            if (percent >= 0) { importingPercent = percent; progressBar.setProgress(percent); progressLabel.setText("등록 중: " + name + " (" + percent + "%)"); render(); }
                            else progressLabel.setText("등록 중: " + name + " (" + readable(tempLength()) + ")");
                        });
                    }
                    output.flush();
                }
                if (cancelled) throw new IOException("등록 취소");
                File completed = new File(directory, id + ".video");
                if (!temp.renameTo(completed)) throw new IOException("파일 확정 실패");
                JSONObject record = new JSONObject();
                record.put("id", id);
                record.put("title", name);
                record.put("file", completed.getName());
                synchronized (lock) { videos.put(record); save(); }
                runOnUiThread(() -> { importingPercent = 100; progressBar.setProgress(100); progressLabel.setText("등록 완료 (100%)"); render(); });
            } catch (Exception e) {
                if (temp != null) temp.delete();
                String reason = cancelled ? "등록을 취소했습니다." : "등록 실패: " + e.getMessage();
                runOnUiThread(() -> { progressLabel.setText(reason); toast(reason); });
            } finally {
                currentTemp = null;
                copying = false;
                runOnUiThread(() -> { addButton.setEnabled(true); progressBar.setVisibility(View.GONE); progressLabel.setVisibility(View.GONE); importingName = ""; importingPercent = -1; render(); });
            }
        }).start();
    }

    private long tempLength() { File f = currentTemp; return f == null ? 0 : f.length(); }
    private String readable(long bytes) { return (bytes / (1024 * 1024)) + " MB"; }
    private void save() { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY, videos.toString()).apply(); }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }

    private void render() {
        list.removeAllViews();
        if (copying && !importingName.isEmpty()) addVideoRow(importingName, null, importingPercent);
        if (videos.length() == 0 && !copying) {
            TextView empty = text("등록된 영상이 없습니다.", 14, secondary, false);
            empty.setPadding(dp(14), dp(22), dp(14), dp(22));
            list.addView(empty);
        }
        for (int i = 0; i < videos.length(); i++) {
            JSONObject item = videos.optJSONObject(i);
            if (item != null) addVideoRow(item.optString("title", "동영상"), item.optString("id"), -1);
        }
    }

    private void addVideoRow(String name, String id, int percent) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(14), dp(8), dp(10), dp(8));
        card.setBackground(rounded(surface, stroke, 16));
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(-1, dp(78));
        cardParams.bottomMargin = dp(10);
        list.addView(card, cardParams);

        TextView nameView = text(name, 15, foreground, true);
        nameView.setMaxLines(2);
        nameView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        card.addView(nameView, new LinearLayout.LayoutParams(0, -1, 1));

        Button play = new Button(this);
        play.setAllCaps(false);
        play.setText(percent >= 0 ? percent + "%" : "재생");
        play.setTextColor(foreground);
        play.setTextSize(13);
        play.setMinWidth(0);
        play.setMinimumWidth(0);
        play.setPadding(dp(8), 0, dp(8), 0);
        play.setBackground(rounded(dark ? Color.parseColor("#302D36") : Color.parseColor("#EFEDE9"), Color.TRANSPARENT, 10));
        play.setEnabled(percent < 0);
        play.setOnClickListener(v -> toast("재생 기능은 2차 개발에서 연결됩니다."));
        LinearLayout.LayoutParams playParams = new LinearLayout.LayoutParams(dp(65), dp(42));
        playParams.leftMargin = dp(8);
        card.addView(play, playParams);

        if (id != null) {
            TextView more = text("⋮", 27, foreground, true);
            more.setGravity(Gravity.CENTER);
            more.setContentDescription("영상 더보기");
            LinearLayout.LayoutParams moreParams = new LinearLayout.LayoutParams(dp(42), dp(48));
            card.addView(more, moreParams);
            more.setOnClickListener(v -> {
                PopupMenu popup = new PopupMenu(this, more);
                popup.getMenu().add("이름 수정").setOnMenuItemClickListener(menu -> { rename(id); return true; });
                popup.getMenu().add("삭제").setOnMenuItemClickListener(menu -> { confirmDelete(id); return true; });
                popup.show();
            });
        }
    }

    private int indexOf(String id) {
        for (int i = 0; i < videos.length(); i++) {
            JSONObject item = videos.optJSONObject(i);
            if (item != null && id.equals(item.optString("id"))) return i;
        }
        return -1;
    }

    private void rename(String id) {
        int i = indexOf(id);
        if (i < 0) return;
        EditText edit = new EditText(this);
        edit.setSingleLine(true);
        edit.setText(videos.optJSONObject(i).optString("title"));
        new AlertDialog.Builder(this).setTitle("영상 제목 수정").setView(edit)
            .setNegativeButton("취소", null).setPositiveButton("저장", (d, w) -> {
                String value = edit.getText().toString().trim();
                if (value.isEmpty()) { toast("제목을 입력해 주세요."); return; }
                try { videos.optJSONObject(indexOf(id)).put("title", value); save(); render(); }
                catch (Exception e) { toast("제목을 저장하지 못했습니다."); }
            }).show();
    }

    private void confirmDelete(String id) {
        new AlertDialog.Builder(this).setTitle("영상 삭제")
            .setMessage("앱에 복사된 영상 파일을 삭제합니다. 원본 파일은 삭제하지 않습니다.")
            .setNegativeButton("취소", null).setPositiveButton("삭제", (d, w) -> delete(id)).show();
    }

    private void delete(String id) {
        int i = indexOf(id);
        if (i < 0) return;
        JSONObject item = videos.optJSONObject(i);
        File file = new File(new File(getFilesDir(), "video_library"), item.optString("file"));
        if (file.exists() && !file.delete()) { toast("영상 파일 삭제에 실패했습니다."); return; }
        videos.remove(i);
        save();
        render();
    }

    @Override public void onBackPressed() {
        if (copying) {
            new AlertDialog.Builder(this).setMessage("영상 등록을 취소하시겠습니까?")
                .setNegativeButton("계속 등록", null)
                .setPositiveButton("등록 취소", (d, w) -> cancelled = true).show();
            return;
        }
        super.onBackPressed();
    }
}
