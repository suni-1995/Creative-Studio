package com.suni.creativestudio.storyhand;
import android.content.*;
public class ProjectAlarmReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context c,Intent i){
  if(ProjectAlarm.ACTION.equals(i.getAction()))ProjectAlarm.fire(c,i.getStringExtra("id"));
  else if(Intent.ACTION_BOOT_COMPLETED.equals(i.getAction())||Intent.ACTION_MY_PACKAGE_REPLACED.equals(i.getAction())||Intent.ACTION_TIME_CHANGED.equals(i.getAction())||Intent.ACTION_TIMEZONE_CHANGED.equals(i.getAction()))ProjectAlarm.restore(c);
 }
}
