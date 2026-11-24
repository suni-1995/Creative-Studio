package com.suni.creativestudio.storyhand;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.zip.*;
import java.nio.charset.Charset;

public class DocumentLibraryActivity extends Activity {
  static final int PICK=101, EXPORT=102, EXPORT_ALL=103;
  final String PREF="document_library_v1";
  JSONArray books=new JSONArray();
  LinearLayout root, list, selectionBar;
  TextView selectionCount;
  boolean selectionMode=false;
  final LinkedHashSet<String> selected=new LinkedHashSet<>();
  int bg, surface, ink, muted, line, accent;
  boolean dark, busy=false;
  TextView importStatus;
  ProgressBar importProgress;
  long importTotal=0;
  int importIndex=0;
  String exportId=null, currentBook=null;
  ArrayList<String> pages=new ArrayList<>();
  int page=0;
  int volumeStart=0, volumeEnd=0;
  String volumeName="";
  String sharedVolumeRoot="";
  int renderedEnd=0, renderedStart=0;
  boolean shifting=false;
  boolean vertical=false;
  int viewMode=0, half=0;
  boolean spread=false, lastHalf=false;
  Bitmap pageBitmap;
  int bitmapPage=-1;
  File bitmapZip;
  int loadGeneration=0;
  SeekBar pageSeek;
  TextView seekLabel;
  File currentZip;
  Button folderButton;
  LinearLayout reader;
  ScrollView scroll;
  int dp(int v){return (int)(v*getResources().getDisplayMetrics().density+.5f);}
  GradientDrawable shape(int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(13));d.setStroke(dp(1),line);return d;}
  TextView text(String s,int size,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(ink);if(bold)t.setTypeface(null,1);t.setGravity(Gravity.CENTER_VERTICAL);return t;}
  Button button(String s,Runnable action){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(12);b.setTextColor(ink);b.setBackground(shape(surface));b.setOnClickListener(v->action.run());return b;}
  void load(){try{books=new JSONArray(getSharedPreferences(PREF,0).getString("books","[]"));}catch(Exception e){books=new JSONArray();}}
  void save(){getSharedPreferences(PREF,0).edit().putString("books",books.toString()).apply();}
  File folder(){File f=new File(getFilesDir(),"document_library");f.mkdirs();return f;}
  File file(JSONObject b){String id=b.optString("id");if(!id.matches("[0-9a-fA-F-]{36}"))return null;return new File(folder(),id+".zip");}
  JSONObject book(String id){for(int i=0;i<books.length();i++){JSONObject b=books.optJSONObject(i);if(b!=null&&id.equals(b.optString("id")))return b;}return null;}
  void colors(){dark=getSharedPreferences("creative_studio_prefs",0).getBoolean("dark_mode",false);bg=Color.parseColor(dark?"#17171B":"#F5F4F2");surface=Color.parseColor(dark?"#211F25":"#FFFFFF");ink=Color.parseColor(dark?"#F2F1F5":"#242328");muted=Color.parseColor(dark?"#A6A2AD":"#77737D");line=Color.parseColor(dark?"#38353F":"#E5E2DF");accent=Color.parseColor(dark?"#8F83AB":"#5D5870");getWindow().setStatusBarColor(bg);getWindow().setNavigationBarColor(bg);getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);}
  @Override public void onCreate(Bundle b){super.onCreate(b);colors();load();vertical=false;home();}
  void shell(String title){root=new LinearLayout(this);root.setOrientation(1);root.setPadding(dp(16),dp(12),dp(16),dp(12));root.setBackgroundColor(bg);setContentView(root);TextView h=text(title,23,true);root.addView(h,new LinearLayout.LayoutParams(-1,dp(52)));}
  void toggleSelection(String id){selectionMode=true;if(!selected.add(id))selected.remove(id);home();}
  void exitSelection(){selectionMode=false;selected.clear();home();}
  void selectAll(){for(int i=0;i<books.length();i++){JSONObject b=books.optJSONObject(i);if(b!=null)selected.add(b.optString("id"));}home();}
  void confirmSelectedDelete(){
    if(selected.isEmpty()){toast("선택한 문서가 없습니다.");return;}
    new AlertDialog.Builder(this).setTitle("선택 문서 삭제").setMessage(selected.size()+"개 ZIP 문서를 앱에서 삭제할까요? 원본은 삭제되지 않습니다.")
      .setNegativeButton("취소",null).setPositiveButton("삭제",(d,w)->{
        JSONArray kept=new JSONArray();int failed=0;
        for(int i=0;i<books.length();i++){
          JSONObject b=books.optJSONObject(i);if(b==null)continue;
          String id=b.optString("id");
          if(!selected.contains(id)){kept.put(b);continue;}
          File target=file(b);
          if(target==null||(target.exists()&&!target.delete())){failed++;kept.put(b);continue;}
          getSharedPreferences(PREF,0).edit().remove("page_"+id).apply();
        }
        books=kept;save();if(failed>0)toast(failed+"개 문서를 삭제하지 못했습니다.");exitSelection();
      }).show();
  }
  void selectionFooter(){
    selectionBar=new LinearLayout(this);selectionBar.setOrientation(1);selectionBar.setPadding(dp(10),dp(10),dp(10),dp(10));selectionBar.setBackground(shape(surface));
    selectionCount=text(selected.size()+"개 선택",15,true);selectionBar.addView(selectionCount,new LinearLayout.LayoutParams(-1,dp(32)));
    LinearLayout actions=new LinearLayout(this);selectionBar.addView(actions);
    for(String label:new String[]{"취소","전체선택","삭제하기"}){
      Button b=button(label,()->{if(label.equals("취소"))exitSelection();else if(label.equals("전체선택"))selectAll();else confirmSelectedDelete();});
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.rightMargin=dp(5);actions.addView(b,p);
    }
    root.addView(selectionBar);selectionBar.setVisibility(selectionMode?View.VISIBLE:View.GONE);
  }
  void row(LinearLayout parent,String title,String subtitle,Runnable action,String menuId){
    LinearLayout box=new LinearLayout(this);box.setGravity(Gravity.CENTER_VERTICAL);box.setPadding(dp(12),dp(5),dp(8),dp(5));box.setBackground(shape(surface));if(menuId!=null&&selected.contains(menuId)){GradientDrawable chosen=shape(surface);chosen.setStroke(dp(2),accent);box.setBackground(chosen);TextView tick=text("✓",19,true);tick.setTextColor(Color.WHITE);tick.setGravity(Gravity.CENTER);GradientDrawable circle=new GradientDrawable();circle.setColor(accent);circle.setCornerRadius(dp(30));tick.setBackground(circle);LinearLayout.LayoutParams tp=new LinearLayout.LayoutParams(dp(32),dp(32));tp.rightMargin=dp(12);box.addView(tick,tp);}if(menuId!=null){box.setOnLongClickListener(v->{toggleSelection(menuId);return true;});box.setOnClickListener(v->{if(selectionMode)toggleSelection(menuId);});}LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(76));lp.bottomMargin=dp(8);parent.addView(box,lp);
    LinearLayout label=new LinearLayout(this);label.setOrientation(1);TextView a=text(title,15,true);a.setSingleLine(true);a.setEllipsize(android.text.TextUtils.TruncateAt.END);label.addView(a);TextView s=text(subtitle,12,false);s.setTextColor(muted);label.addView(s);box.addView(label,new LinearLayout.LayoutParams(0,-2,1));label.setOnClickListener(v->{if(selectionMode&&menuId!=null)toggleSelection(menuId);else action.run();});if(menuId!=null)label.setOnLongClickListener(v->{toggleSelection(menuId);return true;});
    if(menuId!=null){Button read=button("읽기",()->{if(selectionMode)toggleSelection(menuId);else action.run();});LinearLayout.LayoutParams readParams=new LinearLayout.LayoutParams(dp(64),dp(48));readParams.rightMargin=dp(6);box.addView(read,readParams);Button more=button("⋮",()->{});more.setOnClickListener(v->{if(selectionMode)toggleSelection(menuId);else bookMenuPopup(more,menuId);});more.setOnLongClickListener(v->{toggleSelection(menuId);return true;});box.addView(more,new LinearLayout.LayoutParams(dp(48),dp(48)));}
  }
  void home(){loadGeneration++;pageBitmap=null;bitmapPage=-1;currentBook=null;shell("문서뷰어");LinearLayout bar=new LinearLayout(this);root.addView(bar);Button add=button("＋ ZIP 등록",()->pick());bar.addView(add,new LinearLayout.LayoutParams(0,dp(48),1));Button all=button("전체 다운로드",()->exportAll());LinearLayout.LayoutParams allParams=new LinearLayout.LayoutParams(0,dp(48),1);allParams.leftMargin=dp(8);bar.addView(all,allParams);importStatus=text("",13,false);importStatus.setTextColor(muted);importStatus.setVisibility(busy?View.VISIBLE:View.GONE);root.addView(importStatus);importProgress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);importProgress.setMax(100);importProgress.setVisibility(busy?View.VISIBLE:View.GONE);root.addView(importProgress,new LinearLayout.LayoutParams(-1,dp(8)));ScrollView sc=new ScrollView(this);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));list=new LinearLayout(this);list.setPadding(0,dp(12),0,0);list.setOrientation(1);sc.addView(list);if(books.length()==0)list.addView(text("등록된 ZIP이 없습니다.",14,false));LinkedHashMap<String,ArrayList<JSONObject>> grouped=new LinkedHashMap<>();for(int i=0;i<books.length();i++){JSONObject b=books.optJSONObject(i);if(b==null)continue;String group=b.optString("group","미분류");if(!grouped.containsKey(group))grouped.put(group,new ArrayList<>());grouped.get(group).add(b);}for(String group:grouped.keySet()){TextView heading=text("📚 "+group,18,true);heading.setPadding(0,dp(14),0,dp(8));list.addView(heading);ArrayList<JSONObject> volumes=grouped.get(group);volumes.sort((a,b)->natural(a.optString("title"),b.optString("title")));for(JSONObject b:volumes){String id=b.optString("id");row(list,b.optString("title"),"ZIP · "+b.optInt("count")+"장",()->openBook(id),id);}}selectionFooter();}
  static int natural(String a,String b){java.util.regex.Matcher x=java.util.regex.Pattern.compile("\\d+|\\D+").matcher(a.toLowerCase(Locale.ROOT)),y=java.util.regex.Pattern.compile("\\d+|\\D+").matcher(b.toLowerCase(Locale.ROOT));while(x.find()&&y.find()){String p=x.group(),q=y.group();int c;if(p.matches("\\d+")&&q.matches("\\d+")){c=Integer.compare(p.length(),q.length());if(c==0)c=p.compareTo(q);}else c=p.compareTo(q);if(c!=0)return c;}return a.compareToIgnoreCase(b);}
  void pick(){if(busy)return;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/zip");i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);startActivityForResult(i,PICK);}
  @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null)return;if(request==PICK){ArrayList<Uri> u=new ArrayList<>();if(data.getClipData()!=null)for(int i=0;i<data.getClipData().getItemCount();i++)u.add(data.getClipData().getItemAt(i).getUri());else if(data.getData()!=null)u.add(data.getData());importQueue(u,0);}else if(request==EXPORT&&exportId!=null&&data.getData()!=null){JSONObject b=book(exportId);exportId=null;if(b!=null)copyOut(b,data.getData());}else if(request==EXPORT_ALL&&data.getData()!=null)allToFolder(data.getData());}
  String display(Uri u){String n="문서.zip";try(android.database.Cursor c=getContentResolver().query(u,new String[]{android.provider.OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())n=c.getString(0);}catch(Exception ignored){}return n;}
  void importQueue(ArrayList<Uri> queue,int index){if(index>=queue.size()){busy=false;home();return;}busy=true;Uri uri=queue.get(index);String name=display(uri);if(importStatus==null||importProgress==null)home();importIndex=index+1;importStatus.setVisibility(View.VISIBLE);importProgress.setVisibility(View.VISIBLE);importProgress.setProgress(0);importStatus.setText("ZIP 등록 "+(index+1)+"/"+queue.size()+" · "+name+" · 준비 중");long total=-1;try(android.database.Cursor c=getContentResolver().query(uri,new String[]{android.provider.OpenableColumns.SIZE},null,null,null)){if(c!=null&&c.moveToFirst()&&!c.isNull(0))total=c.getLong(0);}catch(Exception ignored){}final long expected=total;String id=UUID.randomUUID().toString();File dest=new File(folder(),id+".zip"),tmp=new File(folder(),id+".partial");new Thread(()->{try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(tmp)){if(in==null)throw new IOException("파일 읽기 실패");byte[] buf=new byte[65536];int n;long copied=0;int last=-1;while((n=in.read(buf))!=-1){out.write(buf,0,n);copied+=n;int percent=expected>0?(int)Math.min(99,copied*100/expected):-1;if(percent!=last){last=percent;final int progress=percent;runOnUiThread(()->{if(importStatus!=null)importStatus.setText("ZIP 등록 "+(index+1)+"/"+queue.size()+" · "+name+" · "+(progress<0?"복사 중":progress+"%"));if(importProgress!=null){importProgress.setIndeterminate(progress<0);if(progress>=0)importProgress.setProgress(progress);}});}}runOnUiThread(()->{if(importStatus!=null)importStatus.setText("ZIP 검사 중 · "+name);if(importProgress!=null)importProgress.setIndeterminate(true);});if(!tmp.renameTo(dest))throw new IOException("파일 저장 실패");ArrayList<String> entries=entries(dest);if(entries.isEmpty())throw new IOException("이미지 파일이 없습니다");JSONObject b=new JSONObject();b.put("id",id);b.put("title",name.replaceFirst("(?i)\\.zip$",""));b.put("group",name.replaceFirst("(?i)([ _-]*\\d+\\s*권)?\\.zip$","").trim());b.put("count",entries.size());runOnUiThread(()->{books.put(b);save();importQueue(queue,index+1);});}catch(Exception e){dest.delete();tmp.delete();runOnUiThread(()->{toast(name+": "+e.getMessage());importQueue(queue,index+1);});}}).start();}
  // ZIP UTF-8 flags still take precedence; MS949 handles older Korean archives.
  ZipFile openZip(File zip)throws IOException{return new ZipFile(zip,Charset.forName("MS949"));}
  ArrayList<String> entries(File zip)throws IOException{ArrayList<String> a=new ArrayList<>();try(ZipFile z=openZip(zip)){Enumeration<? extends ZipEntry> en=z.entries();while(en.hasMoreElements()){ZipEntry e=en.nextElement();String n=e.getName();if(!e.isDirectory()&&n.matches("(?i).*\\.(jpg|jpeg|png)$")&&!n.startsWith("__MACOSX/"))a.add(n);}}a.sort(DocumentLibraryActivity::natural);return a;}
  void openBook(String id){JSONObject b=book(id);if(b==null)return;File f=file(b);if(f==null||!f.exists()){toast("ZIP 파일이 없습니다.");return;}currentBook=id;currentZip=f;new Thread(()->{try{ArrayList<String> p=entries(f);runOnUiThread(()->{pages=p;detectVolumeRoot();pages.sort((left,right)->natural(relativeVolumePath(left),relativeVolumePath(right)));page=Math.min(Math.max(0,getSharedPreferences(PREF,0).getInt("page_"+id,0)),Math.max(0,pages.size()-1));vertical=false;viewMode=0;half=0;lastHalf=false;setVolume(page);volumeScreen(b);});}catch(Exception e){runOnUiThread(()->toast("ZIP을 읽지 못했습니다."));}}).start();}
  // A single wrapper directory around several stories is not itself a volume.
  void detectVolumeRoot(){
    sharedVolumeRoot="";
    if(pages.isEmpty())return;
    String first=pages.get(0);
    int slash=first.indexOf('/');
    if(slash<=0)return;
    String prefix=first.substring(0,slash+1);
    HashSet<String> childFolders=new HashSet<>();
    for(String name:pages){
      if(!name.startsWith(prefix))return;
      String relative=name.substring(prefix.length());
      int childSlash=relative.indexOf('/');
      if(childSlash<=0)return;
      childFolders.add(relative.substring(0,childSlash));
    }
    if(childFolders.size()>1)sharedVolumeRoot=prefix;
  }
  String relativeVolumePath(String name){return name.startsWith(sharedVolumeRoot)?name.substring(sharedVolumeRoot.length()):name;}
  String folderName(int index){String n=relativeVolumePath(pages.get(index));int slash=n.indexOf('/');return slash>0?n.substring(0,slash):"";}
  void setVolume(int index){
    if(pages.isEmpty()){volumeStart=volumeEnd=0;volumeName="";return;}
    volumeName=folderName(Math.max(0,Math.min(index,pages.size()-1)));
    volumeStart=0;volumeEnd=pages.size();
    if(!volumeName.isEmpty()){
      for(int i=0;i<pages.size();i++)if(folderName(i).equals(volumeName)){volumeStart=i;break;}
      volumeEnd=volumeStart;while(volumeEnd<pages.size()&&folderName(volumeEnd).equals(volumeName))volumeEnd++;
    }
    page=Math.max(volumeStart,Math.min(page,volumeEnd-1));
  }
  void goVolume(int direction){
    if(pages.isEmpty())return;
    int target=direction>0?volumeEnd:volumeStart-1;
    if(target<0||target>=pages.size()){toast("더 이상 권이 없습니다.");return;}
    page=target;half=0;lastHalf=false;setVolume(page);remember();volumeScreen(book(currentBook));
  }
  void volumeScreen(JSONObject b){
    if(b==null)return;
    shell(b.optString("title")+(volumeName.isEmpty()?"":" · "+volumeName));
    LinearLayout controls=new LinearLayout(this);controls.setGravity(Gravity.CENTER_VERTICAL);root.addView(controls);
    Button back=button("← 서재",()->home()),mode=button(viewMode==0?"일반 보기":viewMode==1?"분할 보기 (좌→우)":"분할 보기 (우→좌)",()->{}),folders=button("권 목록",()->chooseFolder(b,folderButton));folderButton=folders;
    mode.setOnClickListener(v->{PopupMenu menu=new PopupMenu(this,mode);String[] labels={"일반 보기","분할 보기 (좌→우)","분할 보기 (우→좌)"};for(int i=0;i<labels.length;i++){final int choice=i;menu.getMenu().add(0,i,i,labels[i]).setCheckable(true).setChecked(viewMode==i).setOnMenuItemClickListener(item->{viewMode=choice;half=0;lastHalf=false;volumeScreen(b);return true;});}menu.show();});
    LinearLayout.LayoutParams first=new LinearLayout.LayoutParams(0,dp(48),1);first.rightMargin=dp(8);controls.addView(back,first);
    LinearLayout.LayoutParams middle=new LinearLayout.LayoutParams(0,dp(48),1);middle.rightMargin=dp(8);controls.addView(mode,middle);
    controls.addView(folders,new LinearLayout.LayoutParams(0,dp(48),1));
    reader=new LinearLayout(this);reader.setOrientation(1);reader.setGravity(Gravity.CENTER_HORIZONTAL);
    LinearLayout.LayoutParams viewportParams=new LinearLayout.LayoutParams(-1,0,1);
    viewportParams.topMargin=dp(16);
    if(vertical){
      scroll=new ScrollView(this);
      root.addView(scroll,viewportParams);
      scroll.addView(reader);
    }else{
      scroll=null;
      android.widget.FrameLayout viewport=new android.widget.FrameLayout(this);
      root.addView(viewport,viewportParams);
      viewport.addView(reader,new android.widget.FrameLayout.LayoutParams(-1,-1));
    }
    pageSeek=null;seekLabel=null;
    if(!vertical){
      LinearLayout seekRow=new LinearLayout(this);seekRow.setGravity(Gravity.CENTER_VERTICAL);
      LinearLayout.LayoutParams seekRowParams=new LinearLayout.LayoutParams(-1,dp(48));seekRowParams.topMargin=dp(8);root.addView(seekRow,seekRowParams);
      pageSeek=new SeekBar(this);pageSeek.setMax(Math.max(0,volumeEnd-volumeStart-1));
      seekRow.addView(pageSeek,new LinearLayout.LayoutParams(0,dp(44),1));
      seekLabel=text("",12,false);seekLabel.setTextColor(muted);seekLabel.setGravity(Gravity.CENTER);
      seekRow.addView(seekLabel,new LinearLayout.LayoutParams(dp(78),-1));
      pageSeek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
        public void onStartTrackingTouch(SeekBar bar){}
        public void onProgressChanged(SeekBar bar,int progress,boolean fromUser){
          if(fromUser)seekLabel.setText((progress+1)+" / "+(volumeEnd-volumeStart));
        }
        public void onStopTrackingTouch(SeekBar bar){
          int target=volumeStart+bar.getProgress();
          if(target!=page||half!=0){page=target;half=0;lastHalf=false;remember();renderPages();}
        }
      });
    }
    renderPages();
  }
  void chooseFolder(JSONObject b,View anchor){
    ArrayList<String> folders=new ArrayList<>();
    for(int index=0;index<pages.size();index++){String folder=folderName(index);if(!folder.isEmpty()&&!folders.contains(folder))folders.add(folder);}
    folders.sort(DocumentLibraryActivity::natural);
    if(folders.isEmpty()){toast("폴더로 나뉜 권이 없습니다.");return;}
    PopupMenu popup=new PopupMenu(this,anchor);
    for(int i=0;i<folders.size();i++){final String folder=folders.get(i);popup.getMenu().add(folder).setOnMenuItemClickListener(item->{for(int j=0;j<pages.size();j++)if(folder.equals(folderName(j))){page=j;half=0;lastHalf=false;setVolume(page);remember();volumeScreen(b);break;}return true;});}
    popup.show();
  }
  void remember(){if(currentBook!=null)getSharedPreferences(PREF,0).edit().putInt("page_"+currentBook,page).apply();}
  void renderPages(){
    if(scroll!=null)scroll.setOnScrollChangeListener((View.OnScrollChangeListener)null);
    reader.removeAllViews();if(pages.isEmpty())return;
    if(!vertical&&pageSeek!=null){pageSeek.setProgress(Math.max(0,page-volumeStart));seekLabel.setText((page-volumeStart+1)+" / "+(volumeEnd-volumeStart));}
    reader.setPadding(0,vertical?dp(24):0,0,vertical?dp(20):0);
    reader.setGravity(vertical?Gravity.CENTER_HORIZONTAL:Gravity.CENTER);
    if(vertical){
      // Keep a bounded, reversible window. Pages removed at the top must be
      // restored when scrolling upward, rather than permanently discarded.
      renderedEnd=page;
      renderedStart=page;
      appendWindow();
      scroll.setOnScrollChangeListener((View.OnScrollChangeListener)(v,x,y,ox,oy)->{
        if(shifting)return;
        View child=scroll.getChildAt(0);if(child==null)return;
        if(child.getHeight()-y-scroll.getHeight()<dp(700)&&renderedEnd<volumeEnd)appendWindow();
        if(y<dp(650)&&renderedStart>volumeStart)prependWindow();
        if(reader.getChildCount()>9&&y>dp(1800)&&renderedEnd<volumeEnd){
          View first=reader.getChildAt(0);int height=first.getHeight();
          if(height>0){
            shifting=true;reader.removeViewAt(0);renderedStart++;page=renderedStart;remember();
            scroll.post(()->{scroll.scrollTo(0,Math.max(0,y-height));shifting=false;});
          }
        }
      });
    }else{
      // Keep page mode within the available viewport, including the seek bar.
      // The image takes only the remaining height instead of expanding the ScrollView.
      ImageView image=new ImageView(this);
      image.setAdjustViewBounds(false);
      image.setScaleType(ImageView.ScaleType.FIT_CENTER);
      reader.addView(image,new LinearLayout.LayoutParams(-1,0,1));
      TextView info=text("",14,false);reader.addView(info,new LinearLayout.LayoutParams(-1,dp(22)));
      LinearLayout bar=new LinearLayout(this);reader.addView(bar);
      Button prev=button("◀ 이전",()->movePage(-1)),next=button("다음 ▶",()->movePage(1));
      showPage(image,info,prev,next);
      LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.rightMargin=dp(8);bar.addView(prev,p);bar.addView(next,new LinearLayout.LayoutParams(0,dp(48),1));
    }
  }
  void movePage(int direction){
    if(spread&&viewMode!=0&&((direction>0&&half==0)||(direction<0&&half==1))){
      half=direction>0?1:0;renderPages();return;
    }
    int target=page+direction;
    if(target<volumeStart||target>=volumeEnd){
      int adjacent=direction>0?volumeEnd:volumeStart-1;
      if(adjacent<0||adjacent>=pages.size()){toast("더 이상 권이 없습니다.");return;}
      page=adjacent;setVolume(page);half=0;lastHalf=direction<0;remember();volumeScreen(book(currentBook));return;
    }
    page=target;half=0;lastHalf=direction<0;remember();renderPages();
  }
  void showPage(ImageView image,TextView info,Button prev,Button next){
    final int generation=++loadGeneration,index=page;
    final File zip=currentZip;
    final String name=pages.get(index);
    spread=false;prev.setEnabled(false);next.setEnabled(false);
    info.setText((page-volumeStart+1)+" / "+(volumeEnd-volumeStart));
    if(pageBitmap!=null&&bitmapPage==index&&zip.equals(bitmapZip)){
      displayPage(pageBitmap,image,info,prev,next);return;
    }
    pageBitmap=null;bitmapPage=-1;
    new Thread(()->{
      Bitmap bmp=null;
      try(ZipFile z=openZip(zip)){
        ZipEntry entry=z.getEntry(name);
        if(entry!=null){
          BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;
          try(InputStream in=z.getInputStream(entry)){BitmapFactory.decodeStream(in,null,o);}
          o.inSampleSize=1;int maxWidth=3200;
          while(o.outWidth/o.inSampleSize>maxWidth||o.outHeight/o.inSampleSize>3000)o.inSampleSize*=2;
          o.inJustDecodeBounds=false;
          try(InputStream in=z.getInputStream(entry)){bmp=BitmapFactory.decodeStream(in,null,o);}
        }
      }catch(Exception ignored){}
      final Bitmap result=bmp;
      runOnUiThread(()->{
        if(generation!=loadGeneration||currentBook==null){if(result!=null)result.recycle();return;}
        if(result==null){info.setText("이미지를 읽지 못했습니다.");prev.setEnabled(true);next.setEnabled(true);return;}
        pageBitmap=result;bitmapPage=index;bitmapZip=zip;displayPage(result,image,info,prev,next);
      });
    }).start();
  }
  void displayPage(Bitmap bmp,ImageView image,TextView info,Button prev,Button next){
    spread=viewMode!=0&&bmp.getWidth()>bmp.getHeight();
    if(lastHalf){half=spread?1:0;lastHalf=false;}
    if(!spread)half=0;
    if(spread){
      boolean right=viewMode==1?half==1:half==0;
      int mid=bmp.getWidth()/2;
      image.setImageBitmap(Bitmap.createBitmap(bmp,right?mid:0,0,right?bmp.getWidth()-mid:mid,bmp.getHeight()));
      info.setText((page-volumeStart+1)+" / "+(volumeEnd-volumeStart)+" · "+(right?"오른쪽":"왼쪽"));
    }else image.setImageBitmap(bmp);
    prev.setEnabled(true);next.setEnabled(true);
  }
  void appendWindow(){
    int end=Math.min(renderedEnd+2,volumeEnd);
    while(renderedEnd<end)addImage(renderedEnd++);
    if(renderedEnd==volumeEnd){
      LinearLayout nav=new LinearLayout(this);nav.setPadding(0,dp(20),0,dp(12));reader.addView(nav);
      Button previous=button("◀ 이전 권",()->goVolume(-1)),next=button("다음 권 ▶",()->goVolume(1));
      previous.setEnabled(volumeStart>0);next.setEnabled(volumeEnd<pages.size());
      LinearLayout.LayoutParams left=new LinearLayout.LayoutParams(0,dp(52),1);left.rightMargin=dp(8);nav.addView(previous,left);nav.addView(next,new LinearLayout.LayoutParams(0,dp(52),1));
    }
  }
  void prependWindow(){
    if(shifting||renderedStart<=volumeStart)return;
    // Insert before the first visible page, retaining the user's viewport.
    shifting=true;
    int oldY=scroll.getScrollY();
    int oldHeight=reader.getHeight();
    int start=Math.max(volumeStart,renderedStart-2);
    for(int i=renderedStart-1;i>=start;i--)addImageAt(i,0);
    renderedStart=start;page=start;remember();
    reader.requestLayout();
    reader.post(()->{
      int delta=Math.max(0,reader.getHeight()-oldHeight);
      scroll.scrollTo(0,oldY+delta);
      shifting=false;
    });
  }
  void addImageAt(int index,int position){
    ImageView image=new ImageView(this);image.setAdjustViewBounds(true);image.setScaleType(ImageView.ScaleType.FIT_CENTER);
    LinearLayout.LayoutParams imageParams=new LinearLayout.LayoutParams(-1,-2);if(vertical)imageParams.bottomMargin=5;reader.addView(image,position,imageParams);
    loadImage(index,image);
  }
  void addImage(int index){ImageView image=new ImageView(this);image.setAdjustViewBounds(true);image.setScaleType(ImageView.ScaleType.FIT_CENTER);LinearLayout.LayoutParams imageParams=new LinearLayout.LayoutParams(-1,-2);if(vertical)imageParams.bottomMargin=5;reader.addView(image,imageParams);loadImage(index,image);}
  void loadImage(int index,ImageView image){String name=pages.get(index);File zip=currentZip;new Thread(()->{try(ZipFile z=openZip(zip)){ZipEntry e=z.getEntry(name);if(e==null)return;BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;try(InputStream in=z.getInputStream(e)){BitmapFactory.decodeStream(in,null,o);}o.inSampleSize=1;while(o.outWidth/o.inSampleSize>1600||o.outHeight/o.inSampleSize>3000)o.inSampleSize*=2;o.inJustDecodeBounds=false;Bitmap bmp;try(InputStream in=z.getInputStream(e)){bmp=BitmapFactory.decodeStream(in,null,o);}runOnUiThread(()->{if(image.getParent()!=null)image.setImageBitmap(bmp);else if(bmp!=null)bmp.recycle();});}catch(Exception ignored){} }).start();}
  void bookMenuPopup(View anchor,String id){
    JSONObject b=book(id);if(b==null)return;
    PopupMenu menu=new PopupMenu(this,anchor);
    menu.getMenu().add("작품 묶기 / 이름 변경").setOnMenuItemClickListener(item->{edit(b);return true;});
    menu.getMenu().add("ZIP 다운로드").setOnMenuItemClickListener(item->{exportOne(id);return true;});
    menu.getMenu().add("삭제").setOnMenuItemClickListener(item->{new AlertDialog.Builder(this).setMessage("이 ZIP을 앱에서 삭제할까요?").setNegativeButton("취소",null).setPositiveButton("삭제",(x,y)->{File f=file(b);if(f!=null)f.delete();JSONArray next=new JSONArray();for(int j=0;j<books.length();j++)if(!id.equals(books.optJSONObject(j).optString("id")))next.put(books.optJSONObject(j));books=next;save();home();}).show();return true;});
    menu.show();
  }
  void edit(JSONObject b){LinearLayout form=new LinearLayout(this);form.setPadding(dp(18),0,dp(18),0);form.setOrientation(1);EditText title=new EditText(this),group=new EditText(this);title.setSingleLine(true);group.setSingleLine(true);title.setText(b.optString("title"));group.setText(b.optString("group"));title.setHint("권 이름");group.setHint("작품 이름");form.addView(title);form.addView(group);new AlertDialog.Builder(this).setTitle("작품 / 권 편집").setView(form).setNegativeButton("취소",null).setPositiveButton("저장",(d,w)->{try{b.put("title",title.getText().toString());b.put("group",group.getText().toString());save();home();}catch(Exception ignored){}}).show();}
  void exportOne(String id){exportId=id;JSONObject b=book(id);if(b==null)return;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/zip");i.putExtra(Intent.EXTRA_TITLE,b.optString("title")+".zip");startActivityForResult(i,EXPORT);}
  void copyOut(JSONObject b,Uri uri){File src=file(b);new Thread(()->{try(InputStream in=new FileInputStream(src);OutputStream out=getContentResolver().openOutputStream(uri)){byte[] buf=new byte[65536];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);runOnUiThread(()->toast("다운로드 완료"));}catch(Exception e){runOnUiThread(()->toast("다운로드 실패: "+e.getMessage()));}}).start();}
  void exportAll(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);startActivityForResult(i,EXPORT_ALL);}
  void allToFolder(Uri tree){new Thread(()->{int success=0;try{Uri parent=DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));HashSet<String> used=new HashSet<>();for(int i=0;i<books.length();i++){JSONObject b=books.optJSONObject(i);File src=file(b);if(src==null||!src.exists())continue;String name=(b.optString("group")+" - "+b.optString("title")).replaceAll("[\\\\/:*?\"<>|]","_")+".zip";String base=name;int n=2;while(!used.add(name.toLowerCase(Locale.ROOT)))name=base.replace(".zip"," ("+(n++)+").zip");Uri dest=DocumentsContract.createDocument(getContentResolver(),parent,"application/zip",name);if(dest==null)continue;try(InputStream in=new FileInputStream(src);OutputStream out=getContentResolver().openOutputStream(dest)){byte[] buf=new byte[65536];int len;while((len=in.read(buf))!=-1)out.write(buf,0,len);success++;}}int total=success;runOnUiThread(()->toast(total+"개 ZIP 다운로드 완료"));}catch(Exception e){runOnUiThread(()->toast("다운로드 중 오류: "+e.getMessage()));}}).start();}
  void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
  @Override public void onBackPressed(){if(selectionMode){exitSelection();return;}if(currentBook!=null)home();else super.onBackPressed();}
}