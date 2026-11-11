package com.suni.creativestudio.storyhand;

import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.*;
import java.util.*;

final class ProjectAlarm {
    static final String STORE="project_alarms_v1", CHANNEL="project_alarm_v1", ACTION="com.suni.creativestudio.PROJECT_ALARM";
    private ProjectAlarm(){}
    static JSONObject get(Context c,String id){try{return new JSONObject(c.getSharedPreferences(STORE,0).getString(id,"{}"));}catch(Exception e){return new JSONObject();}}
    static void channel(Context c){
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"프로젝트 알람",NotificationManager.IMPORTANCE_DEFAULT);
            ch.setSound(null,null);ch.enableVibration(true);ch.setVibrationPattern(new long[]{0,250,150,250});
            ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(ch);
        }
    }
    static int code(String id){return id.hashCode() & 0x7fffffff;}
    static PendingIntent pending(Context c,String id,int flags){
        Intent i=new Intent(c,ProjectAlarmReceiver.class).setAction(ACTION).setData(android.net.Uri.parse("creative-alarm://"+android.net.Uri.encode(id))).putExtra("id",id);
        return PendingIntent.getBroadcast(c,code(id),i,flags|PendingIntent.FLAG_IMMUTABLE);
    }
    static void cancel(Context c,String id){
        ((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(pending(c,id,PendingIntent.FLAG_UPDATE_CURRENT));
    }
    static long next(JSONObject x,long now){
        if(!x.optBoolean("enabled",false))return -1;
        int hour=x.optInt("hour",-1),minute=x.optInt("minute",-1);
        if(hour<0||hour>23||minute<0||minute>59)return -1;
        Calendar d=Calendar.getInstance();d.setTimeInMillis(now);d.set(Calendar.HOUR_OF_DAY,hour);d.set(Calendar.MINUTE,minute);d.set(Calendar.SECOND,0);d.set(Calendar.MILLISECOND,0);
        String mode=x.optString("repeat","once");
        if("once".equals(mode)){
            String date=x.optString("date","");try{
                String[] p=date.split("-");if(p.length!=3)return -1;
                d.setLenient(false);d.set(Integer.parseInt(p[0]),Integer.parseInt(p[1])-1,Integer.parseInt(p[2]));long time=d.getTimeInMillis();return time>now?time:-1;
            }catch(Exception e){return -1;}
        }
        for(int n=0;n<8;n++){
            if(d.getTimeInMillis()>now && ("daily".equals(mode)||("weekly".equals(mode)&&((x.optInt("days",0)&(1<<((d.get(Calendar.DAY_OF_WEEK)+5)%7)))!=0))))return d.getTimeInMillis();
            d.add(Calendar.DATE,1);
        }
        return -1;
    }
    static String save(Context c,String json){
        try{
            JSONObject x=new JSONObject(json);String id=x.getString("id");
            if(id.isEmpty())return "잘못된 프로젝트입니다.";
            long at=next(x,System.currentTimeMillis());
            if(x.optBoolean("enabled",false)&&at<0)return "알람 날짜 또는 시간을 확인해 주세요.";
            cancel(c,id);
            x.put("nextAt",at);
            c.getSharedPreferences(STORE,0).edit().putString(id,x.toString()).apply();
            if(at>0)return schedule(c,id,at);
            return "ok";
        }catch(Exception e){return "알람 저장에 실패했습니다.";}
    }
    static String schedule(Context c,String id,long at){
        try{
            AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pi=pending(c,id,PendingIntent.FLAG_UPDATE_CURRENT);
            if(Build.VERSION.SDK_INT>=31&&am.canScheduleExactAlarms())am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            else if(Build.VERSION.SDK_INT>=23)am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            else am.set(AlarmManager.RTC_WAKEUP,at,pi);
            return "ok";
        }catch(Exception e){return "알람 예약이 제한되었습니다. 기기 설정을 확인해 주세요.";}
    }
    static void remove(Context c,String id){cancel(c,id);c.getSharedPreferences(STORE,0).edit().remove(id).apply();}
    static void restore(Context c){
        Map<String,?> all=c.getSharedPreferences(STORE,0).getAll();
        for(String id:all.keySet()){
            JSONObject x=get(c,id);long at=next(x,System.currentTimeMillis());
            if(at<0){if(x.optBoolean("enabled",false)&&"once".equals(x.optString("repeat"))) {try{x.put("enabled",false);c.getSharedPreferences(STORE,0).edit().putString(id,x.toString()).apply();}catch(Exception ignored){}}continue;}
            schedule(c,id,at);
        }
    }
    static void fire(Context c,String id){
        JSONObject x=get(c,id);if(!x.optBoolean("enabled",false))return;
        long now=System.currentTimeMillis(),at=x.optLong("nextAt",-1);
        if(at<0||Math.abs(now-at)>20*60*1000)return;
        String name=x.optString("name","프로젝트"),message=x.optString("message","").trim();
        if(message.isEmpty())message="설정한 "+name+(name.contains("프로젝트")?"":" 프로젝트")+" 알람 시간입니다.";
        channel(c);
        Intent launch=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("alarm_project_id",id);
        PendingIntent open=PendingIntent.getActivity(c,code(id),launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,CHANNEL):new Notification.Builder(c);
        b.setSmallIcon(com.suni.creativestudio.storyhand.R.mipmap.ic_launcher).setContentTitle(name).setContentText(message).setAutoCancel(false).setContentIntent(open).setOnlyAlertOnce(true);
        if(Build.VERSION.SDK_INT<26)b.setVibrate(new long[]{0,250,150,250}).setSound(null);
        if(Build.VERSION.SDK_INT<33||c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)
            ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id,0,b.build());
        try{
            if("once".equals(x.optString("repeat"))){x.put("enabled",false);x.put("nextAt",-1);}
            else{long next=next(x,now+1000);x.put("nextAt",next);if(next>0)schedule(c,id,next);}
            c.getSharedPreferences(STORE,0).edit().putString(id,x.toString()).apply();
        }catch(Exception ignored){}
    }
}
