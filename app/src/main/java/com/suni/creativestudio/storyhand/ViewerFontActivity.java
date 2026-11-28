package com.suni.creativestudio.storyhand;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.Typeface;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.TextPaint;
import android.text.style.MetricAffectingSpan;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.PopupMenu;
import android.view.Menu;

public class ViewerFontActivity extends Activity {
    private Typeface viewerFont;
    private Typeface normalFont() {
        if(viewerFont!=null)return viewerFont;
        String key=getSharedPreferences("creative_studio_prefs",MODE_PRIVATE).getString("viewer_font","system");
        String asset=null;
        switch(key){
            case "mono": asset="fonts/BMKkubulimTTF.ttf";break;
            case "light": asset="fonts/Cafe24Oneprettynight-v2.0.ttf";break;
            case "condensed": asset="fonts/HangeulNuriR.ttf";break;
        }
        try { viewerFont=asset!=null?Typeface.createFromAsset(getAssets(),asset):Typeface.create("serif".equals(key)?"serif":"sans-serif",Typeface.NORMAL); }
        catch(Exception e){viewerFont=Typeface.DEFAULT;}
        return viewerFont;
    }
    private void applyFont(View view){
        if(view instanceof TextView){
            TextView t=(TextView)view;
            int style=t.getTypeface()==null?Typeface.NORMAL:t.getTypeface().getStyle();
            Typeface desired=Typeface.create(normalFont(),style);
            if(!desired.equals(t.getTypeface()))t.setTypeface(desired);
        }
        if(view instanceof ViewGroup){ViewGroup g=(ViewGroup)view;for(int i=0;i<g.getChildCount();i++)applyFont(g.getChildAt(i));}
    }
    @Override public void onContentChanged(){
        super.onContentChanged();
        View root=findViewById(android.R.id.content);
        if(root!=null){applyFont(root);root.getViewTreeObserver().addOnGlobalLayoutListener(()->applyFont(root));}
    }
    protected AlertDialog.Builder fontDialog(){
        return new AlertDialog.Builder(this){
            @Override public AlertDialog show(){
                AlertDialog dialog=super.show();
                if(dialog.getWindow()!=null){View decor=dialog.getWindow().getDecorView();applyFont(decor);decor.getViewTreeObserver().addOnGlobalLayoutListener(()->applyFont(decor));}
                return dialog;
            }
        };
    }
    protected void showFontMenu(PopupMenu popup){
        Menu menu=popup.getMenu();
        for(int i=0;i<menu.size();i++){
            android.view.MenuItem item=menu.getItem(i);
            SpannableString title=new SpannableString(item.getTitle());
            title.setSpan(new MetricAffectingSpan(){
                @Override public void updateDrawState(TextPaint p){p.setTypeface(normalFont());}
                @Override public void updateMeasureState(TextPaint p){p.setTypeface(normalFont());}
            },0,title.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            item.setTitle(title);
        }
        popup.show();
    }
}
