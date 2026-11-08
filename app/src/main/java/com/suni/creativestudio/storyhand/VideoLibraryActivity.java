package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
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

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        try { videos = new JSONArray(getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY, "[]")); }
        catch (Exception ignored) { videos = new JSONArray(); }
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(20, 24, 20, 16);
        TextView title = new TextView(this);
        title.setText("동영상 플레이어 · 보관함");
        title.setTextSize(21);
        root.addView(title);
        Button add = new Button(this);
        add.setText("동영상 등록");
        add.setOnClickListener(v -> chooseVideo());
        root.addView(add);
        progressLabel = new TextView(this);
        root.addView(progressLabel);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);
        root.addView(progressBar);
        ScrollView scroll = new ScrollView(this);
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
        final String name = displayName(uri);
        final long total = fileSize(uri);
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
                            if (percent >= 0) { progressBar.setProgress(percent); progressLabel.setText("등록 중: " + name + " (" + percent + "%)"); }
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
                runOnUiThread(() -> { progressBar.setProgress(100); progressLabel.setText("등록 완료 (100%)"); render(); });
            } catch (Exception e) {
                if (temp != null) temp.delete();
                String reason = cancelled ? "등록을 취소했습니다." : "등록 실패: " + e.getMessage();
                runOnUiThread(() -> { progressLabel.setText(reason); toast(reason); });
            } finally {
                currentTemp = null;
                copying = false;
                runOnUiThread(() -> progressBar.setVisibility(View.GONE));
            }
        }).start();
    }

    private long tempLength() { File f = currentTemp; return f == null ? 0 : f.length(); }
    private String readable(long bytes) { return (bytes / (1024 * 1024)) + " MB"; }
    private void save() { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY, videos.toString()).apply(); }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }

    private void render() {
        list.removeAllViews();
        if (videos.length() == 0) {
            TextView empty = new TextView(this);
            empty.setText("등록된 영상이 없습니다.");
            empty.setPadding(8, 30, 8, 20);
            list.addView(empty);
        }
        for (int i = 0; i < videos.length(); i++) {
            JSONObject item = videos.optJSONObject(i);
            if (item == null) continue;
            final String id = item.optString("id");
            TextView title = new TextView(this);
            title.setText(item.optString("title", "동영상"));
            title.setTextSize(16);
            title.setPadding(8, 16, 8, 4);
            list.addView(title);
            LinearLayout actions = new LinearLayout(this);
            actions.setGravity(Gravity.START);
            Button play = new Button(this);
            play.setText("재생");
            play.setOnClickListener(v -> toast("재생 기능은 2차 개발에서 연결됩니다."));
            actions.addView(play);
            Button rename = new Button(this);
            rename.setText("제목 수정");
            rename.setOnClickListener(v -> rename(id));
            actions.addView(rename);
            Button delete = new Button(this);
            delete.setText("삭제");
            delete.setOnClickListener(v -> confirmDelete(id));
            actions.addView(delete);
            list.addView(actions);
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
