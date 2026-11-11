/* Project alarms: UI extension; native AlarmManager owns scheduling. */
(function(){
'use strict';
if(!window.Android||typeof Android.saveProjectAlarm!=='function')return;
function project(){return db.projects.find(p=>p.id===currentProjectId)}
function sync(p){if(!p)return;try{const s=Android.getProjectAlarm(p.id);if(s&&s!=='{}'){const a=JSON.parse(s);if(p.alarm&&JSON.stringify(p.alarm)!==JSON.stringify(a)){p.alarm=a;persist()}else if(!p.alarm)p.alarm=a;}else if(p.alarm){Android.saveProjectAlarm(JSON.stringify({...p.alarm,id:p.id,name:p.name}));}}catch(e){}}
function card(){const p=project(),el=document.getElementById('projectAlarmCard');if(!p||!el)return;sync(p);const a=p.alarm||{};el.innerHTML='<div class="toolbar"><h3 style="margin:0">🔔 알람</h3><button onclick="openProjectAlarm()">'+(a.enabled?'수정':'설정')+'</button></div><div class="meta">'+(a.enabled?esc(String(a.hour).padStart(2,'0')+':'+String(a.minute).padStart(2,'0'))+' · '+({once:'한 번만',daily:'매일',weekly:'특정 요일'}[a.repeat]||'한 번만'):'알람 사용 안 함')+'</div>';}
window.openProjectAlarm=function(){const p=project();if(!p)return;sync(p);const a=p.alarm||{},now=new Date(),date=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
const days=['월','화','수','목','금','토','일'];
openModal('<div class="stack"><h2>프로젝트 알람</h2><label>알람 사용 <select id="alarmEnabled"><option value="true" '+(a.enabled?'selected':'')+'>사용</option><option value="false" '+(!a.enabled?'selected':'')+'>사용 안 함</option></select></label><label>알람 시간 <input id="alarmTime" type="time" value="'+String(a.hour??9).padStart(2,'0')+':'+String(a.minute??0).padStart(2,'0')+'"></label><label>반복 <select id="alarmRepeat" onchange="projectAlarmRepeatChanged()"><option value="once">한 번만</option><option value="daily">매일</option><option value="weekly">특정 요일</option></select></label><label id="alarmDateWrap">실행 날짜 <input id="alarmDate" type="date" value="'+esc(a.date||date)+'"></label><div id="alarmDaysWrap" style="display:none"><div class="meta">반복 요일</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+days.map((d,i)=>'<label style="display:inline-flex;gap:4px;align-items:center"><input type="checkbox" class="alarmDay" value="'+i+'" '+((a.days||0)&(1<<i)?'checked':'')+'>'+d+'</label>').join('')+'</div></div><label>알람 문구 (선택) <textarea id="alarmMessage" placeholder="설정한 '+esc(p.name)+' 알람 시간입니다.">'+esc(a.message||'')+'</textarea></label><div class="right"><button onclick="closeModal()">취소</button><button class="primary" onclick="saveProjectAlarm()">저장</button></div></div>');
document.getElementById('alarmRepeat').value=a.repeat||'once';projectAlarmRepeatChanged();};
window.projectAlarmRepeatChanged=function(){const weekly=document.getElementById('alarmRepeat').value==='weekly';document.getElementById('alarmDaysWrap').style.display=weekly?'block':'none';document.getElementById('alarmDateWrap').style.display=document.getElementById('alarmRepeat').value==='once'?'block':'none';};
window.saveProjectAlarm=function(){const p=project();if(!p)return;const time=document.getElementById('alarmTime').value.split(':'),repeat=document.getElementById('alarmRepeat').value,enabled=document.getElementById('alarmEnabled').value==='true',days=[...document.querySelectorAll('.alarmDay:checked')].reduce((m,e)=>m|(1<<Number(e.value)),0),date=document.getElementById('alarmDate').value;
if(time.length!==2||repeat==='weekly'&&enabled&&!days){alert('알람 시간과 반복 요일을 확인해 주세요.');return;}
const a={id:p.id,name:p.name,enabled,hour:Number(time[0]),minute:Number(time[1]),repeat,days,date,message:document.getElementById('alarmMessage').value};
const result=Android.saveProjectAlarm(JSON.stringify(a));if(result!=='ok'){alert(result);return;}p.alarm=a;persist();closeModal();card();
if(enabled&&typeof Android.hasProjectAlarmNotificationPermission==='function'&&!Android.hasProjectAlarmNotificationPermission()){Android.requestProjectAlarmNotificationPermission();alert('알림 권한을 허용해야 상단 알림이 표시됩니다.');}
if(enabled&&typeof Android.isProjectAlarmExact==='function'&&!Android.isProjectAlarmExact())alert('이 기기에서는 정확한 알람 권한이 없어 실행 시간이 지연될 수 있습니다.');
};
const oldOpen=openProject;openProject=function(id){oldOpen(id);if(currentProjectId===id)card();};
const oldTrash=trashProject;trashProject=function(id){const exists=db.projects.some(p=>p.id===id);oldTrash(id);if(exists&&!db.projects.some(p=>p.id===id))Android.removeProjectAlarm(id);};
const oldRestore=restoreTrash;restoreTrash=function(id){oldRestore(id);db.projects.forEach(p=>{if(p.alarm)Android.saveProjectAlarm(JSON.stringify({...p.alarm,id:p.id,name:p.name}));});};
const oldImport=importData;importData=function(e){oldImport(e);setTimeout(()=>{db.projects.forEach(p=>{if(p.alarm)Android.saveProjectAlarm(JSON.stringify({...p.alarm,id:p.id,name:p.name}));});},1500);};
window.openAlarmProjectFromNotification=function(id){if(!id)return;const p=db.projects.find(x=>x.id===id);if(p){try{openProject(id)}catch(e){}}};
if(currentProjectId)card();
})();
