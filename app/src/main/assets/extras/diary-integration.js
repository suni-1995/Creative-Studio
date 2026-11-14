/* Diary project integration. Other project types retain their original editors. */
(function(){
'use strict';
const baseNormalize=normalize;
normalize=function(data){data=baseNormalize(data);if(!Array.isArray(data.diarySchedules))data.diarySchedules=[];return data};
if(!Array.isArray(db.diarySchedules))db.diarySchedules=[];
const isDiary=()=>currentProjectType()==='diary';
const schedules=()=>db.diarySchedules.filter(x=>x.project===currentProjectId);
const timeline=()=>db.timeline.filter(x=>x.project===currentProjectId);
const findTimeline=id=>db.timeline.find(x=>x.id===id&&x.project===currentProjectId);
const selected=()=>diaryCalendarSelected||diaryCalendarToday();
const native=()=>window.Android&&typeof Android.saveProjectAlarm==='function';
const alarmId=x=>'diary-schedule:'+x.id;
function alarm(x){
 if(!native())return '알림 기능을 사용할 수 없습니다.';
 const [hour,minute]=String(x.time||'00:00').split(':').map(Number);
 return Android.saveProjectAlarm(JSON.stringify({id:alarmId(x),name:x.title,enabled:true,hour,minute,repeat:'once',date:x.date,message:x.title}));
}
function unalarm(x){if(native())Android.removeProjectAlarm(alarmId(x))}
function refresh(){persist();renderDiaryCalendar();renderAll()}
function imageTag(id){return '<img class="diarySubImage" data-image="'+esc(id)+'" alt="첨부 이미지">'}
async function hydrate(root=document){
 for(const img of root.querySelectorAll('img[data-image]')){
  const data=await getFile(img.dataset.image);
  if(data){img.src=data;img.onclick=()=>showDiaryImage(data)}
 }
}
window.showDiaryImage=function(src){openModal('<div class="stack"><img src="'+src+'" style="max-width:100%;max-height:75vh;object-fit:contain"><button onclick="closeModal()">닫기</button></div>')};
const oldNewPicture=newPictureDiary;
newPictureDiary=async function(x){await oldNewPicture(x);if(!isDiary())return;const h=document.querySelector('#modalCard h2');if(h)h.textContent='일기';const b=document.querySelector('#modalCard .linkedBox b');if(b)b.textContent='사진 (선택)';};
const oldRenderPicture=renderPictureDiaries;
renderPictureDiaries=async function(){await oldRenderPicture();if(!isDiary())return;const host=document.getElementById('projectPictureDiaries');if(!host)return;host.querySelectorAll('h3').forEach(x=>x.textContent='일기');const btn=host.querySelector('.toolbar button.primary');if(btn)btn.textContent='+ 일기';};
function entryList(date){
 const out=[];
 for(const x of db.diaries||[])if(x.project===currentProjectId&&x.date===date)out.push({kind:'diary',x});
 for(const x of db.pictureDiaries||[])if(x.project===currentProjectId&&x.date===date)out.push({kind:'picture',x});
 for(const x of timeline())if(String(x.dateLabel||'').slice(0,10)===date)out.push({kind:'timeline',x});
 for(const x of schedules())if(x.date===date)out.push({kind:'schedule',x});
 return out;
}
diaryCalendarEntries=entryList;
diaryCalendarNew=function(kind,date){
 if(kind==='diary')return newPictureDiary({id:uid(),date,title:'',body:'',imageId:'',project:currentProjectId});
 if(kind==='timeline')return editDiaryTimeline(null,date);
 if(kind==='schedule')return editDiarySchedule(null,date);
};
const oldOpenEntry=diaryCalendarOpenEntry;
diaryCalendarOpenEntry=function(kind,id){
 if(kind==='schedule')return previewDiarySchedule(id);
 if(kind==='timeline')return toggleDiaryTimeline(id);
 return oldOpenEntry(kind,id);
};
const oldCalendar=renderDiaryCalendar;
renderDiaryCalendar=function(){
 oldCalendar();if(!isDiary())return;
 const host=document.getElementById('projectCalendar');if(!host)return;
 const legend=host.querySelector('.calendarLegend');
 if(legend)legend.innerHTML='<span><i></i>일기</span><span class="tl"><i></i>타임라인</span><span class="sc"><i></i>스케줄</span>';
 host.querySelectorAll('.calendarDay').forEach(day=>{
  const onclick=day.getAttribute('onclick')||'';
  const m=onclick.match(/'(\d{4}-\d{2}-\d{2})'/);if(!m)return;
  const items=entryList(m[1]);const marks=day.querySelector('.calendarMarks');if(!marks)return;
  marks.innerHTML=(items.some(e=>e.kind==='diary'||e.kind==='picture')?'<i class="calendarMark"></i>':'')+(items.some(e=>e.kind==='timeline')?'<i class="calendarMark timeline"></i>':'')+(items.some(e=>e.kind==='schedule')?'<i class="calendarMark schedule"></i>':'');
  const count=day.querySelector('.calendarCount');if(count)count.remove();
 });
};
const expanded=new Set();let diaryFilter='all';window.setDiaryFilter=k=>{diaryFilter=k;renderDiaryCalendarSelected()};
window.toggleDiaryTimeline=function(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);renderDiaryCalendarSelected()};
function timelineRow(x){
 const open=expanded.has(x.id);
 const subs=(x.subitems||[]).slice().sort((a,b)=>a.time&&b.time?a.time.localeCompare(b.time):a.time?-1:b.time?1:(a.created||0)-(b.created||0));
 return '<div class="diaryRecord"><div class="diaryTimelineHeader"><button class="diaryFold" onclick="toggleDiaryTimeline(\''+x.id+'\')">'+esc(x.title||'제목 없음')+' <span class="diaryArrow">'+(open?'▾':'▸')+'</span></button><button onclick="editDiaryTimeline(\''+x.id+'\')">편집</button></div><span class="meta">'+esc(x.dateLabel||'')+'</span>'+
 (open?'<div class="diaryExpanded"><div class="diaryRecordBody">'+esc(x.body||'')+'</div><div class="diaryImageStrip">'+(x.diaryImageIds||[]).map(imageTag).join('')+'</div>'+subs.map(s=>'<div class="diarySub"><b>'+esc((s.time?s.time+' · ':'')+s.title)+'</b><div class="diaryRecordBody">'+esc(s.body||'')+'</div><div class="diaryImageStrip">'+(s.imageIds||[]).map(imageTag).join('')+'</div></div>').join('')+'</div>':'')+'</div>';
}
renderDiaryCalendarSelected=function(){
 if(!isDiary())return;
 const host=document.getElementById('calendarSelected');if(!host)return;
 const date=selected(),allItems=entryList(date),items=allItems.filter(e=>diaryFilter==='all'||(diaryFilter==='diary'?['diary','picture'].includes(e.kind):e.kind===diaryFilter));
 const rows=items.map(({kind,x})=>{
 if(kind==='timeline')return timelineRow(x);
 if(kind==='schedule')return '<div class="calendarEntry" onclick="previewDiarySchedule(\''+x.id+'\')"><div class="calendarEntryType">스케줄 · '+esc(x.category)+'</div><b>'+esc(x.title)+'</b><div class="meta">'+esc(x.time||'')+'</div></div>';
 return '<div class="calendarEntry" onclick="diaryCalendarOpenEntry(\''+kind+'\',\''+x.id+'\')"><div class="calendarEntryType">일기</div><b>'+esc(x.title||'제목 없음')+'</b><div class="calendarEntryBody">'+esc(x.body||'')+'</div></div>';
 }).join('');
 host.innerHTML='<div class="calendarSelectedHead"><b>'+esc(date)+'</b><span class="meta">'+items.length+'개의 기록</span></div><div class="calendarQuickActions"><button onclick="diaryCalendarNew(\'diary\',\''+date+'\')">+ 일기</button><button onclick="diaryCalendarNew(\'timeline\',\''+date+'\')">+ 타임라인</button><button onclick="diaryCalendarNew(\'schedule\',\''+date+'\')">+ 스케줄</button></div><div class="diaryFilters">'+[['all','전체'],['diary','일기'],['timeline','타임라인'],['schedule','스케줄']].map(([k,n])=>'<button class="'+(diaryFilter===k?'active':'')+'" onclick="setDiaryFilter(\''+k+'\')">'+n+'</button>').join('')+'</div><div class="diaryEntryList">'+ (rows||'<div class="empty">기록이 없습니다.</div>')+'</div>';
 hydrate(host);
};
window.editDiaryTimeline=function(id,date){
 const x=id?findTimeline(id):null;const t=x||{id:uid(),project:currentProjectId,dateLabel:date||selected(),title:'',tags:'',body:'',subitems:[],diaryImageIds:[]};
 window._diaryEditingTimeline=t;
 openModal('<div class="stack"><h2>타임라인</h2><input id="dtTitle" placeholder="제목" value="'+esc(t.title)+'"><input id="dtDate" type="date" value="'+esc(t.dateLabel||selected())+'"><input id="dtTags" placeholder="태그" value="'+esc(t.tags||'')+'"><textarea id="dtBody" placeholder="내용">'+esc(t.body||'')+'</textarea><label>본 항목 이미지<input id="dtImages" type="file" accept="image/*" multiple onchange="diaryPreviewFiles(this)"><div id="dtPreview" class="diaryImageStrip"></div></label><div id="dtSubList"></div><button onclick="addDiarySub()">+ 세부 항목 추가</button><div class="right">'+(x?'<button class="danger" onclick="deleteDiaryTimeline()">삭제</button>':'')+'<button onclick="closeModal()">취소</button><button class="primary" onclick="saveDiaryTimeline()">저장</button></div></div>');
 renderDiarySubEditor();diaryShowExistingImages();
};
window.addDiarySub=function(){const wrap=document.getElementById('dtSubList');const n=wrap.querySelectorAll('.diarySubEdit').length;wrap.insertAdjacentHTML('beforeend',subEditor({id:uid(),created:Date.now(),imageIds:[]},n));};
function subEditor(s,i){return '<div class="diarySubEdit" data-id="'+esc(s.id||uid())+'" data-created="'+(s.created||Date.now())+'" data-images="'+esc(JSON.stringify(s.imageIds||[]))+'"><div class="row"><input class="subTitle" placeholder="세부 제목" value="'+esc(s.title||'')+'"><input class="subTime" type="time" value="'+esc(s.time||'')+'"></div><textarea class="subBody" placeholder="세부 내용">'+esc(s.body||'')+'</textarea><div class="meta">기존 이미지 '+(s.imageIds||[]).length+'장 · 새 이미지 포함 최대 4장</div><div class="subExisting diaryImageStrip"></div><input class="subFiles" type="file" accept="image/*" multiple onchange="diaryPreviewFiles(this)"><div class="subPreview diaryImageStrip"></div><button type="button" onclick="this.closest(\'.diarySubEdit\').remove()">항목 제거</button></div>'}
function renderDiarySubEditor(){document.getElementById('dtSubList').innerHTML=(window._diaryEditingTimeline.subitems||[]).map(subEditor).join('');diaryShowExistingImages()}
window.saveDiaryTimeline=async function(){
 const t=window._diaryEditingTimeline,title=v('dtTitle').trim();if(!title)return alert('제목을 입력해 주세요.');
 const subs=[];
 for(const el of document.querySelectorAll('.diarySubEdit')){
  const files=[...el.querySelector('.subFiles').files],imageIds=JSON.parse(el.dataset.images||'[]');
  if(files.length+imageIds.length>4)return alert('세부 항목 이미지는 최대 4장입니다.');
  for(const f of files){const id='diarysub_'+uid();await putFile(id,await fileToData(f));imageIds.push(id)}
  subs.push({id:el.dataset.id,title:el.querySelector('.subTitle').value,time:el.querySelector('.subTime').value,body:el.querySelector('.subBody').value,imageIds,created:Number(el.dataset.created)});
 }
 const imageIds=[...(t.diaryImageIds||[])];
 for(const f of document.getElementById('dtImages').files){const id='diarytl_'+uid();await putFile(id,await fileToData(f));imageIds.push(id)}
 const obj={...t,title,dateLabel:v('dtDate'),tags:v('dtTags'),body:v('dtBody'),subitems:subs,diaryImageIds:imageIds,updated:Date.now()};
 const idx=db.timeline.findIndex(x=>x.id===obj.id);if(idx>=0)db.timeline[idx]=obj;else db.timeline.unshift(obj);
 closeModal();refresh();
};
window.deleteDiaryTimeline=function(){const t=window._diaryEditingTimeline;if(!confirm('타임라인을 삭제하시겠습니까?'))return;db.timeline=db.timeline.filter(x=>x.id!==t.id);closeModal();refresh()};
const baseNewTimeline=newTimeline;
newTimeline=function(x){if(!isDiary())return baseNewTimeline(x);if(typeof x==='string')x=decodeObj(x);return editDiaryTimeline(x?.id||null,x?.dateLabel||selected())};
window.editDiarySchedule=function(id,date){
 const x=schedules().find(s=>s.id===id)||{id:uid(),project:currentProjectId,title:'',date:date||selected(),time:'09:00',category:'약속',body:'',place:'',link:''};
 openModal('<div class="stack"><h2>스케줄</h2><input id="dsTitle" placeholder="제목" value="'+esc(x.title)+'"><div class="row"><input id="dsDate" type="date" value="'+esc(x.date)+'"><input id="dsTime" type="time" value="'+esc(x.time)+'"></div><select id="dsCategory">'+['약속','예약','할 일','기타'].map(c=>'<option '+(c===x.category?'selected':'')+'>'+c+'</option>').join('')+'</select><textarea id="dsBody" placeholder="내용">'+esc(x.body||'')+'</textarea><input id="dsPlace" placeholder="장소" value="'+esc(x.place||'')+'"><input id="dsLink" placeholder="링크" value="'+esc(x.link||'')+'"><div class="right"><button onclick="closeModal()">취소</button><button class="primary" onclick="saveDiarySchedule(\''+x.id+'\')">저장</button></div></div>');
};
window.saveDiarySchedule=function(id){
 const title=v('dsTitle').trim(),date=document.getElementById('dsDate')?.value||'',time=document.getElementById('dsTime')?.value||'';if(!title||!date||!time)return alert('제목, 날짜, 시간을 입력해 주세요.');
 const old=schedules().find(x=>x.id===id);
 const x={...old,id,project:currentProjectId,title,date,time,category:v('dsCategory'),body:v('dsBody'),place:v('dsPlace'),link:v('dsLink')};
 if(old)unalarm(old);
 const result=alarm(x);
 if(result!=='ok'){if(old)alarm(old);alert(result);return}
 const i=db.diarySchedules.findIndex(z=>z.id===id);if(i>=0)db.diarySchedules[i]=x;else db.diarySchedules.push(x);
 closeModal();refresh();diaryAlarmPermissionCheck();
};
window.diaryAlarmPermissionCheck=function(){if(!native())return;if(Android.hasProjectAlarmNotificationPermission&&!Android.hasProjectAlarmNotificationPermission()){Android.requestProjectAlarmNotificationPermission();alert('알림 권한을 허용해야 알림이 표시됩니다.')}if(Android.isProjectAlarmExact&&!Android.isProjectAlarmExact()&&confirm('정확한 알람을 위해 알람 및 리마인더 권한 설정으로 이동할까요?'))Android.openProjectAlarmExactSettings()};
window.previewDiarySchedule=function(id){
 const x=schedules().find(s=>s.id===id);if(!x)return;
 const link=x.link?(/^[a-z]+:\/\//i.test(x.link)?x.link:'https://'+x.link):'';
 const safe=/^https?:\/\//i.test(link)?link:'';
 openModal('<div class="stack"><h2>'+esc(x.title)+'</h2><div class="diaryScheduleDetails"><div><b>날짜</b> '+esc(x.date)+'</div><div><b>시간</b> '+esc(x.time)+'</div><div><b>분류</b> '+esc(x.category)+'</div><div><b>내용</b><div class="diaryRecordBody">'+esc(x.body||'없음')+'</div></div><div><b>장소</b> '+esc(x.place||'없음')+'</div><div><b>링크</b> '+(safe?'<a href="'+esc(safe)+'" target="_blank" rel="noopener noreferrer">'+esc(x.link)+'</a>':'없음')+'</div></div><div class="right"><button class="danger" onclick="deleteDiarySchedule(\''+x.id+'\')">삭제</button><button onclick="closeModal()">닫기</button><button class="primary" onclick="editDiarySchedule(\''+x.id+'\')">편집</button></div></div>');
};
window.deleteDiarySchedule=function(id){const x=schedules().find(s=>s.id===id);if(!x||!confirm('스케줄을 삭제하시겠습니까?'))return;unalarm(x);db.diarySchedules=db.diarySchedules.filter(s=>s.id!==id);closeModal();refresh()};
const oldImport=importData;
importData=function(e){const result=oldImport(e);setTimeout(()=>{for(const x of db.diarySchedules||[])if(x.date+'T'+x.time>new Date().toISOString().slice(0,16))alarm(x)},1800);return result};
const oldProjectFromAlarm=window.openAlarmProjectFromNotification;
window.openAlarmProjectFromNotification=function(id){if(id&&id.startsWith('diary-schedule:')){const x=db.diarySchedules.find(s=>alarmId(s)===id);if(x){openProject(x.project);setTimeout(()=>{diaryCalendarSelect(x.date);previewDiarySchedule(x.id)},200)}return}if(oldProjectFromAlarm)oldProjectFromAlarm(id)};

async function diaryShowExistingImages(){const t=window._diaryEditingTimeline;if(!t)return;async function show(host,ids,onRemove){if(!host)return;host.innerHTML='';for(const id of ids){const data=await getFile(id);if(!data)continue;const wrap=document.createElement('div');wrap.className='diaryPreviewItem';const img=document.createElement('img');img.src=data;img.onclick=()=>showDiaryImage(data);const b=document.createElement('button');b.type='button';b.textContent='×';b.onclick=()=>{onRemove(id);wrap.remove()};wrap.append(img,b);host.append(wrap)}}await show(document.getElementById('dtPreview'),t.diaryImageIds||[],id=>{t.diaryImageIds=t.diaryImageIds.filter(x=>x!==id)});for(const el of document.querySelectorAll('.diarySubEdit'))await show(el.querySelector('.subExisting'),JSON.parse(el.dataset.images||'[]'),id=>{el.dataset.images=JSON.stringify(JSON.parse(el.dataset.images||'[]').filter(x=>x!==id))})}
window.diaryPreviewFiles=function(input){const sub=input.closest('.diarySubEdit'),host=sub?sub.querySelector('.subPreview'):document.getElementById('dtPreview');host.querySelectorAll('.diaryNewPreview').forEach(x=>x.remove());if(sub&&input.files.length+JSON.parse(sub.dataset.images||'[]').length>4){alert('세부 항목 이미지는 최대 4장입니다.');input.value='';return}for(const file of input.files){const url=URL.createObjectURL(file),wrap=document.createElement('div');wrap.className='diaryPreviewItem diaryNewPreview';const img=document.createElement('img');img.src=url;img.onclick=()=>showDiaryImage(url);const b=document.createElement('button');b.type='button';b.textContent='×';b.onclick=()=>{const d=new DataTransfer();[...input.files].filter(x=>x!==file).forEach(x=>d.items.add(x));input.files=d.files;wrap.remove();URL.revokeObjectURL(url)};wrap.append(img,b);host.append(wrap)}};

const style=document.createElement('style');style.textContent='.diaryTimelineHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.diaryArrow{margin-left:10px}.diaryEntryList>.diaryRecord,.diaryEntryList>.calendarEntry{margin-top:12px}.diaryFilters{display:flex;gap:6px;margin:10px 0;flex-wrap:wrap}.diaryFilters button{font-size:12px;padding:5px 10px;border-radius:99px}.diaryFilters button.active{background:var(--theme);color:white}.diaryPreviewItem{position:relative;flex:none}.diaryPreviewItem img{width:90px;height:90px;object-fit:cover;border-radius:9px}.diaryPreviewItem button{position:absolute;right:0;top:0;padding:2px 7px}.diaryScheduleDetails{display:grid;gap:12px;overflow-wrap:anywhere}.diaryScheduleDetails b{margin-right:10px}'+'.calendarMark.schedule,.calendarLegend .sc i{background:color-mix(in srgb,var(--theme) 45%,#e9a23b)}.diaryFold{border:0;background:transparent;color:var(--ink);font-weight:800;text-align:left;flex:1}.diaryRecord{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:var(--card)}.diaryExpanded{padding:10px 3px;display:grid;gap:12px}.diaryRecordBody{white-space:pre-wrap;overflow-wrap:anywhere}.diarySub{border:1px solid var(--line);border-radius:12px;padding:12px}.diaryImageStrip{display:flex;gap:8px;overflow-x:auto;max-width:100%}.diarySubImage{width:95px;height:95px;object-fit:cover;border-radius:10px;flex-shrink:0}.diarySubEdit{padding:12px;border:1px solid var(--line);border-radius:12px;margin:8px 0}.calendarQuickActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}.calendarQuickActions button{min-width:0}';document.head.appendChild(style);
})();