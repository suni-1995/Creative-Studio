package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.provider.DocumentsContract;
import android.content.ClipData;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Locale;
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
    private static final int EXPORT_VIDEO = 8402;
    private static final int EXPORT_FOLDER = 8403;
    private final ArrayList<Uri> importQueue = new ArrayList<>();
    private boolean batchImport = false;
    private String sortMode = "newest";
    private Button exportAllButton, folderButton;
    private TextView screenTitle;
    private JSONObject folders = new JSONObject();
    private String activeFolder = "", exportScope = null;
    private boolean exporting;
    private Spinner sortSpinner;
    private String pendingExportId;
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
    private TextView importingAction;
    private final java.util.LinkedHashSet<String> selected = new java.util.LinkedHashSet<>();
    private boolean selectionMode = false;
    private LinearLayout selectionBar;
    private TextView selectionCount;

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
        try { folders = new JSONObject(getSharedPreferences(PREFS, MODE_PRIVATE).getString("folders","{}")); } catch(Exception ignored) {}
        if(state!=null){activeFolder=state.getString("folder","");exportScope=state.getString("exportScope");pendingExportId=state.getString("pendingExportId");}
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(background);
        root.setPadding(dp(18), dp(18), dp(18), dp(12));

        TextView title = text("동영상 플레이어", 23, foreground, true); screenTitle=title;
        title.setOnClickListener(v->{if(!copying&&!activeFolder.isEmpty()){activeFolder="";exitSelection();}});
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(-1, dp(52));
        titleParams.bottomMargin = dp(12);
        root.addView(title, titleParams);

        LinearLayout topActions = new LinearLayout(this);
        topActions.setOrientation(LinearLayout.HORIZONTAL);
        addButton = new Button(this);
        addButton.setText("＋  동영상 등록");
        addButton.setAllCaps(false);
        addButton.setTextColor(Color.WHITE);
        addButton.setBackground(rounded(accent, Color.TRANSPARENT, 14));
        addButton.setOnClickListener(v -> chooseVideo());
        LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(0, dp(52), 1);
        topActions.addView(addButton, addParams);
        exportAllButton = new Button(this);
        exportAllButton.setText("전체 다운로드");
        exportAllButton.setAllCaps(false);
        exportAllButton.setTextSize(12);
        exportAllButton.setTextColor(foreground);
        exportAllButton.setBackground(rounded(surface, stroke, 14));
        exportAllButton.setOnClickListener(v -> chooseExportFolder());
        LinearLayout.LayoutParams exportParams = new LinearLayout.LayoutParams(0, dp(52), 1);
        exportParams.leftMargin = dp(8);
        topActions.addView(exportAllButton, exportParams);
        LinearLayout.LayoutParams topParams = new LinearLayout.LayoutParams(-1, dp(52));
        topParams.bottomMargin = dp(10);
        root.addView(topActions, topParams);
        folderButton=new Button(this);folderButton.setAllCaps(false);folderButton.setTextColor(foreground);folderButton.setBackground(rounded(surface,stroke,12));folderButton.setText("＋ 폴더 생성");folderButton.setOnClickListener(v->editFolder(null));LinearLayout.LayoutParams folderParams=new LinearLayout.LayoutParams(-1,dp(44));folderParams.bottomMargin=dp(8);root.addView(folderButton,folderParams);
        sortSpinner = new Spinner(this);
        String[] sortOptions = {"최신 등록순", "오래된 등록순", "이름 오름차순", "이름 내림차순"};
        ArrayAdapter<String> sortAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, sortOptions) {
            @Override public View getView(int position, View convertView, ViewGroup parent) {
                View view = super.getView(position, convertView, parent);
                if (view instanceof TextView) ((TextView) view).setTextColor(foreground);
                return view;
            }
            @Override public View getDropDownView(int position, View convertView, ViewGroup parent) {
                View view = super.getDropDownView(position, convertView, parent);
                if (view instanceof TextView) {
                    ((TextView) view).setTextColor(foreground);
                    view.setBackgroundColor(surface);
                }
                return view;
            }
        };
        sortAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        sortSpinner.setAdapter(sortAdapter);
        sortSpinner.setBackground(rounded(surface, stroke, 10));
        sortSpinner.setSelection(0);
        sortSpinner.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            public void onNothingSelected(android.widget.AdapterView<?> parent) { }
            public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                sortMode = new String[]{"newest", "oldest", "nameAsc", "nameDesc"}[position];
                if (list != null) render();
            }
        });
        LinearLayout.LayoutParams sortParams = new LinearLayout.LayoutParams(-1, dp(44));
        sortParams.bottomMargin = dp(8);
        root.addView(sortSpinner, sortParams);

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
        selectionBar = new LinearLayout(this);
        selectionBar.setOrientation(LinearLayout.VERTICAL);
        selectionBar.setPadding(dp(12),dp(10),dp(12),dp(10));
        selectionBar.setBackground(rounded(surface,stroke,16));
        selectionCount = text("",15,foreground,true);
        selectionBar.addView(selectionCount,new LinearLayout.LayoutParams(-1,dp(34)));
        LinearLayout actions = new LinearLayout(this);
        for (String label : new String[]{"취소","전체선택","삭제하기"}) {
            Button b = new Button(this); b.setAllCaps(false); b.setText(label); b.setTextSize(12);
            b.setTextColor(foreground); b.setBackground(rounded(surface,stroke,12));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0,dp(48),1);p.rightMargin=dp(5);
            actions.addView(b,p);
            b.setOnClickListener(v->{ if(label.equals("취소")) exitSelection(); else if(label.equals("전체선택")) selectAll(); else confirmSelectedDelete(); });
        }
        selectionBar.addView(actions);
        root.addView(selectionBar,new LinearLayout.LayoutParams(-1,-2));
        selectionBar.setVisibility(View.GONE);
        setContentView(root);
        cleanupPartialFiles();
        render();
    }

    private File videoDirectory() { return new File(getFilesDir(), "video_library"); }
    private File safeVideoFile(String id, String filename) {
        if (id == null || filename == null || !filename.equals(id + ".video")) return null;
        try { UUID.fromString(id); } catch (IllegalArgumentException e) { return null; }
        return new File(videoDirectory(), filename);
    }
    private void cleanupPartialFiles() {
        File[] files = videoDirectory().listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isFile() && file.getName().endsWith(".partial")) file.delete();
        }
    }

    private void chooseVideo() {
        if (copying || exporting || selectionMode) return;
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("video/*");
        pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        try { startActivityForResult(pick, PICK_VIDEO); }
        catch (Exception e) { toast("파일 선택기를 열 수 없습니다."); }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_VIDEO && result == RESULT_OK && data != null) {
            importQueue.clear();
            ClipData clip = data.getClipData();
            if (clip != null) {
                for (int i = 0; i < clip.getItemCount(); i++) importQueue.add(clip.getItemAt(i).getUri());
            } else if (data.getData() != null) importQueue.add(data.getData());
            batchImport = !importQueue.isEmpty();
            importNextVideo();
        } else if (request == EXPORT_FOLDER) {
            if (result == RESULT_OK && data != null && data.getData() != null) exportAllVideos(data.getData());
        } else if (request == EXPORT_VIDEO) {
            String id = pendingExportId;
            pendingExportId = null;
            if (result == RESULT_OK && data != null && data.getData() != null && id != null) {
                exportVideo(id, data.getData());
            }
        }
    }

    private void importNextVideo() {
        if (importQueue.isEmpty()) { batchImport = false; return; }
        Uri next = importQueue.remove(0);
        importVideo(next);
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
        exportAllButton.setEnabled(false);
        final String name = displayName(uri);
        importingName = name;
        render();
        final long total = fileSize(uri);
        if (total > 0 && getFilesDir().getUsableSpace() < total + 1024L * 1024L) {
            copying = false; importingName = ""; importingPercent = -1;
            addButton.setEnabled(true); exportAllButton.setEnabled(true); render(); toast("영상 저장 공간이 부족합니다."); importNextVideo(); return;
        }
        progressLabel.setVisibility(View.VISIBLE);
        progressBar.setProgress(0);
        progressBar.setVisibility(View.VISIBLE);
        progressLabel.setText("등록 중: " + name + " (0%)");
        new Thread(() -> {
            File directory = videoDirectory();
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
                            if (percent >= 0) { importingPercent = percent; progressBar.setProgress(percent); progressLabel.setText("등록 중: " + name + " (" + percent + "%)"); if (importingAction != null) importingAction.setText(percent + "%"); }
                            else progressLabel.setText("등록 중: " + name + " (" + readable(tempLength()) + ")");
                        });
                    }
                    output.flush();
                }
                if (cancelled) throw new IOException("등록 취소");
                if (copied <= 0) throw new IOException("빈 영상 파일입니다.");
                if (total >= 0 && copied != total) throw new IOException("복사된 파일 크기가 원본과 다릅니다.");
                File completed = new File(directory, id + ".video");
                if (!temp.renameTo(completed)) throw new IOException("파일 확정 실패");
                JSONObject record = new JSONObject();
                record.put("id", id);
                record.put("title", name);
                record.put("file", completed.getName());
                record.put("folder", activeFolder);
                synchronized (lock) {
                    JSONArray updated = new JSONArray(videos.toString());
                    updated.put(record);
                    if (!getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY, updated.toString()).commit()) {
                        completed.delete(); throw new IOException("영상 목록 저장 실패");
                    }
                    videos = updated;
                }
                runOnUiThread(() -> { importingPercent = 100; progressBar.setProgress(100); progressLabel.setText("등록 완료 (100%)"); render(); });
            } catch (Exception e) {
                if (temp != null) temp.delete();
                String reason = cancelled ? "등록을 취소했습니다." : "등록 실패: " + e.getMessage();
                runOnUiThread(() -> { progressLabel.setText(reason); toast(reason); });
            } finally {
                currentTemp = null;
                copying = false;
                runOnUiThread(() -> { addButton.setEnabled(true); exportAllButton.setEnabled(true); progressBar.setVisibility(View.GONE); progressLabel.setVisibility(View.GONE); importingName = ""; importingPercent = -1; render(); importNextVideo(); });
            }
        }).start();
    }

    private long tempLength() { File f = currentTemp; return f == null ? 0 : f.length(); }
    private String readable(long bytes) { return (bytes / (1024 * 1024)) + " MB"; }
    private boolean save() { return getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY, videos.toString()).commit(); }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }

    private void toggleSelection(String id) {
        if(copying || exporting)return;
        if (!selectionMode) selectionMode=true;
        if (!selected.add(id)) selected.remove(id);
        render();
    }
    private void exitSelection() { selectionMode=false;selected.clear();render(); }
    private void selectAll() {
        selected.clear();
        if(activeFolder.isEmpty()) for(String id:folderIds())selected.add("folder:"+id);
        for(JSONObject o:orderedVideos())selected.add(o.optString("id"));
        render();
    }
    private void confirmSelectedDelete() {
        if(copying||exporting)return;
        if(selected.isEmpty()){toast("선택한 영상이 없습니다.");return;}
        new AlertDialog.Builder(this).setTitle("선택 영상 삭제").setMessage(selected.size()+"개 선택 항목을 삭제할까요? 폴더 안의 영상도 모두 삭제됩니다. 원본은 삭제되지 않습니다.")
            .setNegativeButton("취소",null).setPositiveButton("삭제",(d,w)->{
                int failures=0;
                java.util.LinkedHashSet<String> targets=new java.util.LinkedHashSet<>();
                for(String key:selected){if(key.startsWith("folder:")){String folder=key.substring(7);for(int j=0;j<videos.length();j++){JSONObject o=videos.optJSONObject(j);if(o!=null&&folder.equals(o.optString("folder")))targets.add(o.optString("id"));}}else targets.add(key);}
                for(String id:targets){
                    int i=indexOf(id);if(i<0)continue;
                    JSONObject o=videos.optJSONObject(i);
                    File file=o==null?null:safeVideoFile(id,o.optString("file"));
                    if(file==null||(file.exists()&&!file.delete())){failures++;continue;}
                    videos.remove(i);
                    getSharedPreferences(PREFS,MODE_PRIVATE).edit().remove("position_"+id).commit();
                }
                for(String key:selected)if(key.startsWith("folder:")&&folderCount(key.substring(7))==0)folders.remove(key.substring(7));
                if(!save() || !saveFolders())toast("목록 저장에 실패했습니다.");
                if(failures>0)toast(failures+"개 영상을 삭제하지 못했습니다.");
                exitSelection();
            }).show();
    }
    private void render() {
        list.removeAllViews();
        screenTitle.setText(activeFolder.isEmpty()?"동영상 플레이어":"‹  "+folders.optString(activeFolder));
        folderButton.setVisibility(activeFolder.isEmpty()?View.VISIBLE:View.GONE);folderButton.setEnabled(!copying&&!exporting);
        if(activeFolder.isEmpty())for(String folder:folderIds())addFolderRow(folder);
        if(selectionBar!=null){selectionBar.setVisibility(selectionMode?View.VISIBLE:View.GONE);selectionCount.setText(selected.size()+"개 선택");}
        importingAction = null;
        if (copying && !importingName.isEmpty()) addVideoRow(importingName, null, importingPercent);
        if (orderedVideos().isEmpty() && (!activeFolder.isEmpty()||folders.length()==0) && !copying) {
            TextView empty = text("등록된 영상이 없습니다.", 14, secondary, false);
            empty.setPadding(dp(14), dp(22), dp(14), dp(22));
            list.addView(empty);
        }
        for (JSONObject item : orderedVideos()) addVideoRow(item.optString("title", "동영상"), item.optString("id"), -1);
    }
    private ArrayList<JSONObject> orderedVideos(){
        ArrayList<JSONObject> ordered = new ArrayList<>();
        for (int i = 0; i < videos.length(); i++) {JSONObject o=videos.optJSONObject(i);if(o!=null&&activeFolder.equals(o.optString("folder")))ordered.add(o); }
        if ("oldest".equals(sortMode)) { /* stored in registration order */ }
        else if ("nameAsc".equals(sortMode) || "nameDesc".equals(sortMode)) {
            Collections.sort(ordered, (a, b) -> a.optString("title").compareToIgnoreCase(b.optString("title")));
            if ("nameDesc".equals(sortMode)) Collections.reverse(ordered);
        } else Collections.reverse(ordered);
        return ordered;
    }

    private void addVideoRow(String name, String id, int percent) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        boolean checked = id!=null && selected.contains(id);
        card.setPadding(dp(14), dp(8), dp(10), dp(8));
        card.setBackground(rounded(surface, checked?accent:stroke, 16));
        if(checked){TextView tick=text("✓",19,Color.WHITE,true);tick.setGravity(Gravity.CENTER);tick.setBackground(rounded(accent,Color.TRANSPARENT,30));LinearLayout.LayoutParams tp=new LinearLayout.LayoutParams(dp(32),dp(32));tp.rightMargin=dp(12);card.addView(tick,tp);}
        if(id!=null){card.setOnLongClickListener(v->{toggleSelection(id);return true;});card.setOnClickListener(v->{if(selectionMode)toggleSelection(id);});}
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(-1, dp(78));
        cardParams.bottomMargin = dp(10);
        list.addView(card, cardParams);

        TextView nameView = text(name, 15, foreground, true);
        nameView.setMaxLines(2);
        nameView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        card.addView(nameView, new LinearLayout.LayoutParams(0, -1, 1));
        if(id!=null){nameView.setOnLongClickListener(v->{toggleSelection(id);return true;});nameView.setOnClickListener(v->{if(selectionMode)toggleSelection(id);});}

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
        if (id == null) importingAction = play;
        play.setOnClickListener(v -> {
            if (id == null || copying || exporting) return;
            if(selectionMode){toggleSelection(id);return;}
            Intent intent = new Intent(this, VideoPlayerActivity.class);
            intent.putExtra("video_id", id);
            ArrayList<String> playlist=new ArrayList<>();for(JSONObject o:orderedVideos())playlist.add(o.optString("id"));intent.putStringArrayListExtra("playlist",playlist);
            startActivity(intent);
        });
        LinearLayout.LayoutParams playParams = new LinearLayout.LayoutParams(dp(65), dp(42));
        playParams.leftMargin = dp(8);
        card.addView(play, playParams);

        if (id != null) {
            TextView more = text("⋮", 27, foreground, true);
            more.setGravity(Gravity.CENTER);
            more.setContentDescription("영상 더보기");
            LinearLayout.LayoutParams moreParams = new LinearLayout.LayoutParams(dp(42), dp(48));
            card.addView(more, moreParams);
            more.setOnLongClickListener(v->{toggleSelection(id);return true;});
            more.setOnClickListener(v -> {
                if(copying||exporting)return;
                if(selectionMode){toggleSelection(id);return;}
                PopupMenu popup = new PopupMenu(this, more);
                popup.getMenu().add("폴더 이동").setOnMenuItemClickListener(menu->{moveVideo(id);return true;});
                popup.getMenu().add("이름 수정").setOnMenuItemClickListener(menu -> { rename(id); return true; });
                popup.getMenu().add("삭제").setOnMenuItemClickListener(menu -> { confirmDelete(id); return true; });
                popup.getMenu().add("다운로드").setOnMenuItemClickListener(menu -> { chooseExportDestination(id); return true; });
                popup.show();
            });
        }
    }


    private boolean saveFolders(){return getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString("folders",folders.toString()).commit();}
    private ArrayList<String> folderIds(){ArrayList<String> ids=new ArrayList<>();java.util.Iterator<String> it=folders.keys();while(it.hasNext())ids.add(it.next());Collections.sort(ids,(a,b)->folders.optString(a).compareToIgnoreCase(folders.optString(b)));return ids;}
    private int folderCount(String id){int n=0;for(int i=0;i<videos.length();i++){JSONObject o=videos.optJSONObject(i);if(o!=null&&id.equals(o.optString("folder")))n++;}return n;}
    private void editFolder(String id){
        if(copying||exporting)return;
        EditText input=new EditText(this);input.setSingleLine(true);if(id!=null)input.setText(folders.optString(id));
        new AlertDialog.Builder(this).setTitle(id==null?"폴더 생성":"폴더 이름 수정").setView(input).setNegativeButton("취소",null).setPositiveButton("저장",(d,w)->{
            String name=input.getText().toString().trim();if(name.isEmpty()||name.contains("/")||name.contains("\\")||name.equals(".")||name.equals("..")){toast("올바른 폴더 이름을 입력해 주세요.");return;}
            try{folders.put(id==null?UUID.randomUUID().toString():id,name);if(!saveFolders())toast("폴더 저장 실패");render();}catch(Exception e){toast("폴더 저장 실패");}
        }).show();
    }
    private void moveVideo(String id){
        ArrayList<String> ids=folderIds();ids.add(0,"");ArrayList<String> names=new ArrayList<>();for(String f:ids)names.add(f.isEmpty()?"폴더 없음":folders.optString(f));
        new AlertDialog.Builder(this).setTitle("폴더 이동").setItems(names.toArray(new String[0]),(d,w)->{int i=indexOf(id);if(i<0)return;try{videos.optJSONObject(i).put("folder",ids.get(w));if(!save())toast("이동 저장 실패");render();}catch(Exception e){toast("이동 실패");}}).show();
    }
    private void addFolderRow(String id){
        String key="folder:"+id;LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER_VERTICAL);row.setPadding(dp(14),dp(8),dp(10),dp(8));row.setBackground(rounded(surface,selected.contains(key)?accent:stroke,16));
        LinearLayout.LayoutParams rp=new LinearLayout.LayoutParams(-1,dp(78));rp.bottomMargin=dp(10);list.addView(row,rp);
        if(selected.contains(key)){TextView tick=text("✓",19,Color.WHITE,true);tick.setGravity(Gravity.CENTER);tick.setBackground(rounded(accent,Color.TRANSPARENT,30));row.addView(tick,new LinearLayout.LayoutParams(dp(32),dp(32)));}
        TextView label=text(folders.optString(id),17,foreground,true);label.setPadding(dp(8),0,dp(8),0);label.setMaxLines(2);label.setEllipsize(android.text.TextUtils.TruncateAt.END);row.addView(label,new LinearLayout.LayoutParams(0,-1,1));
        TextView count=text("영상 "+folderCount(id)+"개",12,secondary,false);count.setGravity(Gravity.CENTER_VERTICAL|Gravity.END);count.setSingleLine(true);row.addView(count,new LinearLayout.LayoutParams(-2,-1));
        View.OnClickListener open=v->{if(copying||exporting)return;if(selectionMode)toggleSelection(key);else{activeFolder=id;render();}};row.setOnClickListener(open);label.setOnClickListener(open);count.setOnClickListener(open);count.setOnLongClickListener(v->{toggleSelection(key);return true;});row.setOnLongClickListener(v->{toggleSelection(key);return true;});label.setOnLongClickListener(v->{toggleSelection(key);return true;});
        TextView more=text("⋮",27,foreground,true);more.setGravity(Gravity.CENTER);row.addView(more,new LinearLayout.LayoutParams(dp(42),dp(48)));more.setOnClickListener(v->{if(copying||exporting)return;if(selectionMode){toggleSelection(key);return;}PopupMenu menu=new PopupMenu(this,more);menu.getMenu().add("이름 수정").setOnMenuItemClickListener(m->{editFolder(id);return true;});menu.getMenu().add("다운로드").setOnMenuItemClickListener(m->{if(folderCount(id)==0)toast("다운로드할 영상이 없습니다.");else chooseExportFolder(id);return true;});menu.getMenu().add("삭제").setOnMenuItemClickListener(m->{selected.clear();selected.add(key);selectionMode=true;render();confirmSelectedDelete();return true;});menu.show();});
    }
    private void chooseExportFolder() { chooseExportFolder(activeFolder.isEmpty()?null:activeFolder); }
    private void chooseExportFolder(String scope) {
        if (copying || exporting) return;
        exportScope=scope;
        if (videos.length() == 0) { toast("다운로드할 영상이 없습니다."); return; }
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try { startActivityForResult(intent, EXPORT_FOLDER); }
        catch (Exception e) { toast("저장 폴더 선택기를 열 수 없습니다."); }
    }

    private void exportAllVideos(Uri treeUri) {
        if (copying) return;
        copying = true;
        addButton.setEnabled(false);
        exportAllButton.setEnabled(false);
        final JSONArray snapshot;
        try { snapshot = new JSONArray();for(int i=0;i<videos.length();i++){JSONObject o=videos.optJSONObject(i);if(o!=null&&(exportScope==null||exportScope.equals(o.optString("folder"))))snapshot.put(new JSONObject(o.toString()));} }
        catch (Exception e) { copying = false; addButton.setEnabled(true); exportAllButton.setEnabled(true); toast("영상 목록을 읽을 수 없습니다."); return; }
        exporting=true;
        final JSONObject folderSnapshot;try{folderSnapshot=new JSONObject(folders.toString());}catch(Exception e){copying=false;exporting=false;addButton.setEnabled(true);exportAllButton.setEnabled(true);return;}
        progressLabel.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.VISIBLE);
        progressBar.setProgress(0);
        new Thread(() -> {
            int succeeded = 0, failed = 0;
            java.util.HashSet<String> names = new java.util.HashSet<>();
            try {
                Uri parent = DocumentsContract.buildDocumentUriUsingTree(treeUri, DocumentsContract.getTreeDocumentId(treeUri));
                java.util.HashMap<String,Uri> destinations=new java.util.HashMap<>();
                for (int i = 0; i < snapshot.length(); i++) {
                    JSONObject item = snapshot.optJSONObject(i);
                    if (item == null) { failed++; continue; }
                    String id = item.optString("id");
                    File source = safeVideoFile(id, item.optString("file"));
                    if (source == null || !source.isFile()) { failed++; continue; }
                    String name = item.optString("title", "동영상").trim();
                    name = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                    if (name.isEmpty()) name = "동영상";
                    if (!name.toLowerCase(Locale.ROOT).matches(".*\\.(mp4|mkv|avi|mov|webm|m4v|3gp)$")) name += ".mp4";
                    String base = name, extension = "";
                    int dot = name.lastIndexOf('.');
                    if (dot > 0) { base = name.substring(0, dot); extension = name.substring(dot); }
                    String unique = name;
                    int number = 2;
                    while (!names.add(unique.toLowerCase(Locale.ROOT))) unique = base + " (" + number++ + ")" + extension;
                    Uri output = null;
                    try {
                        String group=item.optString("folder");Uri target=parent;
                        if(!group.isEmpty()){target=destinations.get(group);if(target==null){target=DocumentsContract.createDocument(getContentResolver(),parent,DocumentsContract.Document.MIME_TYPE_DIR,folderSnapshot.optString(group,"동영상"));if(target==null)throw new IOException("폴더 생성 실패");destinations.put(group,target);}}
                        output = DocumentsContract.createDocument(getContentResolver(), target, "video/*", unique);
                        if (output == null) throw new IOException("파일 생성 실패");
                        try (InputStream in = new FileInputStream(source);
                             OutputStream out = getContentResolver().openOutputStream(output, "w")) {
                            if (out == null) throw new IOException("출력 파일 열기 실패");
                            byte[] buffer = new byte[65536];
                            int n;
                            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                            out.flush();
                        }
                        succeeded++;
                    } catch (Exception e) {
                        failed++;
                        if (output != null) try { DocumentsContract.deleteDocument(getContentResolver(), output); } catch (Exception ignored) { }
                    }
                    final int done = i + 1;
                    runOnUiThread(() -> {
                        progressBar.setProgress(done * 100 / snapshot.length());
                        progressLabel.setText("전체 다운로드 " + done + " / " + snapshot.length());
                    });
                }
            } catch (Exception e) { failed += snapshot.length() - succeeded - failed; }
            final int ok = succeeded, errors = failed;
            runOnUiThread(() -> {
                copying = false; exporting=false;
                addButton.setEnabled(true);
                exportAllButton.setEnabled(true);
                progressLabel.setVisibility(View.GONE);
                progressBar.setVisibility(View.GONE);
                toast("다운로드 완료 " + ok + "개 · 실패 " + errors + "개");
            });
        }).start();
    }

    private void chooseExportDestination(String id) {
        int i = indexOf(id);
        if (i < 0) { toast("영상을 찾을 수 없습니다."); return; }
        JSONObject item = videos.optJSONObject(i);
        if (item == null || safeVideoFile(id, item.optString("file")) == null) {
            toast("영상 파일 정보가 올바르지 않습니다."); return;
        }
        String title = item.optString("title", "동영상").trim();
        if (title.isEmpty()) title = "동영상";
        if (!title.toLowerCase(java.util.Locale.ROOT).matches(".*\\.(mp4|mkv|avi|mov|webm|m4v|3gp)$")) title += ".mp4";
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("video/*");
        intent.putExtra(Intent.EXTRA_TITLE, title);
        pendingExportId = id;
        try { startActivityForResult(intent, EXPORT_VIDEO); }
        catch (Exception e) { pendingExportId = null; toast("저장 위치 선택기를 열 수 없습니다."); }
    }

    private void exportVideo(String id, Uri destination) {
        int i = indexOf(id);
        if (i < 0) { toast("영상을 찾을 수 없습니다."); return; }
        JSONObject item = videos.optJSONObject(i);
        if (item == null) return;
        File source = safeVideoFile(id, item.optString("file"));
        if (source == null || !source.isFile()) { toast("저장된 영상 파일이 없습니다."); return; }
        toast("영상 다운로드를 시작합니다.");
        new Thread(() -> {
            boolean success = false;
            String error = "";
            try (InputStream in = new FileInputStream(source);
                 OutputStream out = getContentResolver().openOutputStream(destination, "w")) {
                if (out == null) throw new IOException("저장 위치에 쓸 수 없습니다.");
                byte[] buffer = new byte[65536];
                int read;
                long total = 0;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                    total += read;
                }
                out.flush();
                if (total != source.length()) throw new IOException("복사 크기가 일치하지 않습니다.");
                success = true;
            } catch (Exception e) {
                error = e.getMessage() == null ? "파일 저장 오류" : e.getMessage();
            }
            final boolean saved = success;
            final String message = saved ? "영상 다운로드가 완료됐습니다." : "다운로드 실패: " + error;
            runOnUiThread(() -> toast(message));
        }).start();
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
                try { videos.optJSONObject(indexOf(id)).put("title", value); if (!save()) throw new IOException("목록 저장 실패"); render(); }
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
        File file = safeVideoFile(id, item.optString("file"));
        if (file == null) { toast("영상 파일 경로가 올바르지 않습니다."); return; }
        if (file.exists() && !file.delete()) { toast("영상 파일 삭제에 실패했습니다."); return; }
        videos.remove(i);
        if (!save()) { toast("영상 목록 저장에 실패했습니다."); return; }
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove("position_" + id).commit();
        render();
    }

    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putString("folder",activeFolder);out.putString("exportScope",exportScope);out.putString("pendingExportId",pendingExportId);}
    @Override public void onBackPressed() {
        if(exporting){toast("다운로드가 완료될 때까지 기다려 주세요.");return;}
        if (copying) {
            new AlertDialog.Builder(this).setMessage("영상 등록을 취소하시겠습니까?")
                .setNegativeButton("계속 등록", null)
                .setPositiveButton("등록 취소", (d, w) -> cancelled = true).show();
            return;
        }
        if(selectionMode){exitSelection();return;}
        if(!activeFolder.isEmpty()){activeFolder="";render();return;}
        super.onBackPressed();
    }
}
