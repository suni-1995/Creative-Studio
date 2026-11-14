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
// Refresh calendar marks immediately after a successful diary save, without changing other project types.
const baseSavePictureDiary=savePictureDiary;
savePictureDiary=async function(id){
 const before=(db.pictureDiaries||[]).find(x=>x.id===id)?.updated;
 const count=(db.pictureDiaries||[]).length;
 const result=await baseSavePictureDiary.apply(this,arguments);
 if(isDiary()&&((db.pictureDiaries||[]).length!==count||(db.pictureDiaries||[]).find(x=>x.id===id)?.updated!==before))renderDiaryCalendar();
 return result;
};
const baseSaveDiary=saveDiary;
saveDiary=function(id){
 const before=(db.diaries||[]).find(x=>x.id===id)?.updated;
 const count=(db.diaries||[]).length;
 const result=baseSaveDiary.apply(this,arguments);
 if(isDiary()&&((db.diaries||[]).length!==count||(db.diaries||[]).find(x=>x.id===id)?.updated!==before))renderDiaryCalendar();
 return result;
};
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
window.deleteDiaryCalendarEntry=function(kind,id){if(!confirm('일기를 삭제하시겠습니까?'))return;const key=kind==='picture'?'pictureDiaries':'diaries';db[key]=(db[key]||[]).filter(x=>x.id!==id||x.project!==currentProjectId);closeModal();refresh()};
window.diaryPreviewFooter=function(kind,id){const card=document.getElementById('modalCard');if(!card)return;const footer=card.querySelector('.detailFooter');if(!footer)return;const edit=kind==='picture'?'newPictureDiary':'newDiary';const getter=kind==='picture'?'getPictureDiaryById':'getDiaryById';footer.innerHTML='<button class="danger" id="diaryPreviewDelete">삭제</button><button onclick="closeModal()">닫기</button><button class="primary" id="diaryPreviewEdit">편집</button>';footer.style.display='grid';footer.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';footer.style.gap='8px';footer.querySelectorAll('button').forEach(b=>b.style.minWidth='0');document.getElementById('diaryPreviewDelete').onclick=()=>deleteDiaryCalendarEntry(kind,id);document.getElementById('diaryPreviewEdit').onclick=()=>{closeModal();setTimeout(()=>window[edit](window[getter](id)),160)}};
const oldOpenEntry=diaryCalendarOpenEntry;
diaryCalendarOpenEntry=function(kind,id){
 if(kind==='schedule')return previewDiarySchedule(id);
 if(kind==='timeline')return toggleDiaryTimeline(id);
 const result=oldOpenEntry(kind,id);if(kind==='diary'||kind==='picture')setTimeout(()=>diaryPreviewFooter(kind,id),80);return result;
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
  marks.innerHTML=(items.some(e=>e.kind==='diary'||e.kind==='picture')?'<i class="calendarMark"></i>':'')+(items.some(e=>e.kind==='timeline')?items.filter(e=>e.kind==='timeline').map(e=>diarySymbol(e.x)?'<span class="diaryCalendarSymbol" style="color:'+diaryColor(e.x)+'">'+diarySymbol(e.x)+'</span>':'<i class="calendarMark timeline"></i>').join(''):'')+(items.some(e=>e.kind==='schedule')?'<i class="calendarMark schedule"></i>':'');
  const count=day.querySelector('.calendarCount');if(count)count.remove();
 });
};
const diarySymbols=['▪','♡','●','◇','☆'];const diaryColors=['#f5f5f5','#f28cab','#ffb84d','#8c9bff','#5fd1bd','#b17cf2','#f16c6c','#4d94ff'];const diarySymbol=x=>diarySymbols.includes(x?.diarySymbol)?x.diarySymbol:null;const diaryColor=x=>/^#[0-9a-fA-F]{6}$/.test(x?.diarySymbolColor||'')?x.diarySymbolColor:'#8c9bff';
const expanded=new Set();let diaryFilter='all';window.setDiaryFilter=k=>{diaryFilter=k;renderDiaryCalendarSelected()};
window.toggleDiaryTimeline=function(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);renderDiaryCalendarSelected()};
function timelineRow(x){
 const open=expanded.has(x.id);
 const subs=(x.subitems||[]).slice().sort((a,b)=>a.time&&b.time?a.time.localeCompare(b.time):a.time?-1:b.time?1:(a.created||0)-(b.created||0));
 return '<div class="diaryRecord"><div class="diaryTimelineHeader"><button class="diaryFold" onclick="toggleDiaryTimeline(\''+x.id+'\')">'+(diarySymbol(x)?'<span class="diaryTimelineSymbol" style="color:'+diaryColor(x)+'">'+diarySymbol(x)+'</span>':'')+esc(x.title||'제목 없음')+' <span class="diaryArrow">'+(open?'▾':'▸')+'</span></button><button onclick="editDiaryTimeline(\''+x.id+'\')">편집</button></div>'+
 (open?'<div class="diaryExpanded"><div class="meta">'+esc(x.dateLabel||'')+'</div>'+(x.body?'<div class="diaryRecordBody diaryTimelineScrollable">'+esc(x.body)+'</div>':'')+((x.diaryImageIds||[]).length?'<div class="diaryImageStrip">'+[...new Set(x.diaryImageIds)].map(imageTag).join('')+'</div>':'')+subs.map(s=>'<div class="diarySubCard"><button class="diarySubCardOpen" onclick="previewDiarySub(\''+x.id+'\',\''+s.id+'\')"><div class="diarySubHeading"><b>'+esc(s.title||'세부 항목')+'</b>'+(s.time?'<span class="meta">'+esc(s.time)+'</span>':'')+'</div><div class="diarySubExcerpt">'+esc(s.body||'')+'</div></button>'+((s.imageIds||[]).length?'<div class="diarySubHorizontalImages">'+[...new Set(s.imageIds)].slice(0,4).map(imageTag).join('')+'</div>':'')+'</div>').join('')+'<button class="diaryAddSub" onclick="editDiarySub(\''+x.id+'\')">+ 세부 항목 추가</button></div>':'')+'</div>';
}
function diaryCommentsHtml(kind,id,comments){const rows=Array.isArray(comments)?comments:[];return '<section class="fix28ReaderComments diaryCommentSection"><h3>코멘트</h3><div class="meta">'+rows.length+'개</div><div class="fix28CommentList">'+(rows.length?rows.map(c=>'<div class="fix28Comment isEditable"><button class="fix28CommentDelete danger" type="button" aria-label="코멘트 삭제" onclick="diaryDeleteComment(\''+kind+'\',\''+id+'\',\''+c.id+'\')">×</button>'+esc(c.text||'')+'<div class="meta">'+new Date(c.created||Date.now()).toLocaleString()+'</div></div>').join(''):'<div class="meta">아직 코멘트가 없습니다.</div>')+'</div><div class="fix28CommentComposer"><textarea id="diaryCommentInput" placeholder="코멘트를 입력해 주세요."></textarea><button class="primary" type="button" onclick="diaryAddComment(\''+kind+'\',\''+id+'\')">추가</button></div></section>'}
function diaryCommentTarget(kind,id){if(kind==='schedule')return db.diarySchedules.find(x=>x.id===id&&x.project===currentProjectId);for(const t of timeline()){const sub=(t.subitems||[]).find(x=>x.id===id);if(sub)return sub}return null}
window.diaryAddComment=function(kind,id){const x=diaryCommentTarget(kind,id),input=document.getElementById('diaryCommentInput'),value=(input?.value||'').trim();if(!x||!value)return;x.comments=Array.isArray(x.comments)?x.comments:[];x.comments.push({id:uid(),text:value,created:Date.now()});persist();if(kind==='schedule')previewDiarySchedule(id);else{const t=timeline().find(t=>(t.subitems||[]).some(s=>s.id===id));if(t)previewDiarySub(t.id,id)}};
window.diaryDeleteComment=function(kind,id,cid){const x=diaryCommentTarget(kind,id);if(!x||!confirm('코멘트를 삭제할까요?'))return;x.comments=(x.comments||[]).filter(c=>c.id!==cid);persist();if(kind==='schedule')previewDiarySchedule(id);else{const t=timeline().find(t=>(t.subitems||[]).some(s=>s.id===id));if(t)previewDiarySub(t.id,id)}};
window.previewDiarySub=function(tid,sid){const s=findTimeline(tid)?.subitems?.find(x=>x.id===sid);if(!s)return;openModal('<div class="stack diarySubPreview"><h2>'+esc(s.title||'세부 항목')+'</h2>'+(s.time?'<div class="meta">'+esc(s.time)+'</div>':'')+'<div class="diaryRecordBody">'+esc(s.body||'')+'</div><div id="diarySubDetailImages" class="diaryImageStrip">'+(s.imageIds||[]).map(imageTag).join('')+'</div>'+diaryCommentsHtml('sub',sid,s.comments)+'<div class="right"><button onclick="closeModal()">닫기</button><button class="primary" onclick="editDiarySub(\''+tid+'\',\''+sid+'\')">편집</button></div></div>');hydrate(document.getElementById('diarySubDetailImages'))};
window.editDiarySub=function(tid,sid){const t=findTimeline(tid);if(!t)return;const s=t.subitems?.find(x=>x.id===sid)||{id:uid(),title:'',time:'',body:'',imageIds:[],created:Date.now()};window._diarySubTarget={tid,sid:sid||null};openModal('<div class="stack"><h2>세부 항목</h2><input id="diarySubTitle" placeholder="세부 제목" value="'+esc(s.title||'')+'"><label>시간 (선택)<input id="diarySubTime" type="time" value="'+esc(s.time||'')+'"></label><textarea id="diarySubBody" placeholder="내용">'+esc(s.body||'')+'</textarea><div class="diaryImageField"><div>사진 (최대 4장)</div><label class="diaryImageChoose">이미지 선택<input id="diarySubFiles" type="file" accept="image/*" multiple hidden onchange="diaryPreviewFiles(this)"></label><div id="diarySubImages" class="diaryImageStrip"></div></div><div class="right">'+(sid?'<button class="danger" onclick="deleteDiarySub()">삭제</button>':'')+'<button onclick="closeModal()">취소</button><button class="primary" onclick="saveDiarySub()">저장</button></div></div>');window._diarySubImageIds=[...(s.imageIds||[])];diaryRenderSubImages()};
async function diaryRenderSubImages(){const host=document.getElementById('diarySubImages');if(!host)return;host.innerHTML='';for(const id of window._diarySubImageIds){const data=await getFile(id);if(!data)continue;const wrap=document.createElement('div');wrap.className='diaryPreviewItem';const img=document.createElement('img');img.src=data;img.onclick=()=>showDiaryImage(data);const btn=document.createElement('button');btn.textContent='×';btn.onclick=()=>{window._diarySubImageIds=window._diarySubImageIds.filter(x=>x!==id);wrap.remove()};wrap.append(img,btn);host.append(wrap)}}
window.saveDiarySub=async function(){const {tid,sid}=window._diarySubTarget,t=findTimeline(tid);if(!t)return;const title=document.getElementById('diarySubTitle').value.trim();if(!title)return alert('세부 제목을 입력해 주세요.');const ids=[...window._diarySubImageIds],files=[...document.getElementById('diarySubFiles').files];if(ids.length+files.length>4)return alert('이미지는 최대 4장입니다.');for(const file of files){const id='diarysub_'+uid();await putFile(id,await fileToData(file));ids.push(id)}const old=t.subitems?.find(x=>x.id===sid);const item={...old,id:sid||uid(),title,time:document.getElementById('diarySubTime').value,body:document.getElementById('diarySubBody').value,imageIds:ids,created:old?.created||Date.now()};t.subitems=t.subitems||[];const idx=t.subitems.findIndex(x=>x.id===sid);if(idx>=0)t.subitems[idx]=item;else t.subitems.push(item);closeModal();refresh()};
window.deleteDiarySub=function(){const {tid,sid}=window._diarySubTarget,t=findTimeline(tid);if(!t||!confirm('세부 항목을 삭제하시겠습니까?'))return;t.subitems=(t.subitems||[]).filter(x=>x.id!==sid);closeModal();refresh()};

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
 const x=id?findTimeline(id):null;const t=x?{...x,diaryImageIds:[...(x.diaryImageIds||[])],subitems:[...(x.subitems||[])]}:{id:uid(),project:currentProjectId,dateLabel:date||selected(),title:'',tags:'',body:'',subitems:[],diaryImageIds:[],diarySymbol:'',diarySymbolColor:'#8c9bff'};
 window._diaryEditingTimeline=t;
 openModal('<div class="stack diaryTimelineEditor"><h2>타임라인</h2><input id="dtTitle" placeholder="제목" value="'+esc(t.title)+'"><input id="dtDate" type="date" value="'+esc(t.dateLabel||selected())+'"><div class="diarySymbolPicker"><label>제목 표시 모양<select id="dtSymbol"><option value="">기본 점</option>'+diarySymbols.map(sym=>'<option value="'+sym+'" '+(t.diarySymbol===sym?'selected':'')+'>'+sym+'</option>').join('')+'</select></label><label>모양 색상<div class="diarySymbolColors">'+diaryColors.map(color=>'<button type="button" class="diarySymbolColorChoice" data-color="'+color+'" style="background:'+color+'" onclick="diaryPickSymbolColor(\''+color+'\')" aria-label="색상 선택"></button>').join('')+'<input id="dtSymbolColor" type="color" value="'+diaryColor(t)+'" onchange="diaryPickSymbolColor(this.value)" aria-label="사용자 지정 색상"></div></label></div><input id="dtTags" placeholder="태그" value="'+esc(t.tags||'')+'"><textarea id="dtBody" placeholder="내용">'+esc(t.body||'')+'</textarea><div class="diaryImageField"><div>사진 (선택)</div><div class="meta">이미지를 선택하고 미리보기에서 확인하거나 제거할 수 있습니다.</div><label class="diaryImageChoose">이미지 선택<input id="dtImages" type="file" accept="image/*" multiple hidden onchange="diaryPreviewFiles(this)"></label><div id="dtPreview" class="diaryImageStrip"></div></div><div class="right">'+(x?'<button class="danger" onclick="deleteDiaryTimeline()">삭제</button>':'')+'<button onclick="closeModal()">취소</button><button class="primary" onclick="saveDiaryTimeline()">저장</button></div></div>');
 diaryShowExistingImages();diaryPickSymbolColor(diaryColor(t));
};
window.diaryPickSymbolColor=function(color){const input=document.getElementById('dtSymbolColor');if(input)input.value=color;document.querySelectorAll('.diarySymbolColorChoice').forEach(b=>b.classList.toggle('selected',b.dataset.color.toLowerCase()===color.toLowerCase()))};
window.addDiarySub=function(){const wrap=document.getElementById('dtSubList');const n=wrap.querySelectorAll('.diarySubEdit').length;wrap.insertAdjacentHTML('beforeend',subEditor({id:uid(),created:Date.now(),imageIds:[]},n));};
function subEditor(s,i){return '<div class="diarySubEdit" data-id="'+esc(s.id||uid())+'" data-created="'+(s.created||Date.now())+'" data-images="'+esc(JSON.stringify(s.imageIds||[]))+'"><div class="row"><input class="subTitle" placeholder="세부 제목" value="'+esc(s.title||'')+'"><input class="subTime" type="time" value="'+esc(s.time||'')+'"></div><textarea class="subBody" placeholder="세부 내용">'+esc(s.body||'')+'</textarea><div class="meta">기존 이미지 '+(s.imageIds||[]).length+'장 · 새 이미지 포함 최대 4장</div><div class="subExisting diaryImageStrip"></div><input class="subFiles" type="file" accept="image/*" multiple onchange="diaryPreviewFiles(this)"><div class="subPreview diaryImageStrip"></div><button type="button" onclick="this.closest(\'.diarySubEdit\').remove()">항목 제거</button></div>'}
function renderDiarySubEditor(){document.getElementById('dtSubList').innerHTML=(window._diaryEditingTimeline.subitems||[]).map(subEditor).join('');diaryShowExistingImages()}
window.saveDiaryTimeline=async function(){
 const t=window._diaryEditingTimeline,title=v('dtTitle').trim();if(!title)return alert('제목을 입력해 주세요.');
 const subs=[...(t.subitems||[])];
 for(const el of document.querySelectorAll('.diarySubEdit')){
  const files=[...el.querySelector('.subFiles').files],imageIds=JSON.parse(el.dataset.images||'[]');
  if(files.length+imageIds.length>4)return alert('세부 항목 이미지는 최대 4장입니다.');
  for(const f of files){const id='diarysub_'+uid();await putFile(id,await fileToData(f));imageIds.push(id)}
  subs.push({id:el.dataset.id,title:el.querySelector('.subTitle').value,time:el.querySelector('.subTime').value,body:el.querySelector('.subBody').value,imageIds,created:Number(el.dataset.created)});
 }
 const imageIds=[...(t.diaryImageIds||[])];
 for(const f of document.getElementById('dtImages').files){const id='diarytl_'+uid();await putFile(id,await fileToData(f));imageIds.push(id)}
 const obj={...t,title,dateLabel:v('dtDate'),diarySymbol:v('dtSymbol'),diarySymbolColor:v('dtSymbolColor'),tags:v('dtTags'),body:v('dtBody'),subitems:subs,diaryImageIds:[...new Set(imageIds)],updated:Date.now()};
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
 const raw=(x.link||'').trim(),link=raw?(/^[a-z]+:\/\//i.test(raw)?raw:'https://'+raw):'';
 const safe=/^https?:\/\/[^/\s]+/i.test(link)?link:'';
 const detail=(label,value)=>'<div class="diaryScheduleDetail"><div class="meta">'+label+'</div><div>'+esc(value||'없음')+'</div></div>';
 openModal('<div class="stack diarySchedulePreview"><h2>'+esc(x.title)+'</h2><div class="diaryScheduleDetails">'+detail('날짜',x.date)+detail('시간',x.time)+detail('분류',x.category)+detail('내용',x.body)+detail('장소',x.place)+'<div class="diaryScheduleDetail"><div class="meta">링크</div>'+(safe?'<button type="button" class="diaryScheduleLink" onclick="openExternalUrl(\''+encodeURIComponent(safe)+'\')">🔗 링크 열기</button>':'<div>없음</div>')+'</div></div>'+diaryCommentsHtml('schedule',x.id,x.comments)+'<div class="right"><button class="danger" onclick="deleteDiarySchedule(\''+x.id+'\')">삭제</button><button onclick="closeModal()">닫기</button><button class="primary" onclick="editDiarySchedule(\''+x.id+'\')">편집</button></div></div>');
};
window.deleteDiarySchedule=function(id){const x=schedules().find(s=>s.id===id);if(!x||!confirm('스케줄을 삭제하시겠습니까?'))return;unalarm(x);db.diarySchedules=db.diarySchedules.filter(s=>s.id!==id);closeModal();refresh()};
const oldImport=importData;
importData=function(e){const result=oldImport(e);setTimeout(()=>{for(const x of db.diarySchedules||[])if(x.date+'T'+x.time>new Date().toISOString().slice(0,16))alarm(x)},1800);return result};
const oldProjectFromAlarm=window.openAlarmProjectFromNotification;
window.openAlarmProjectFromNotification=function(id){if(id&&id.startsWith('diary-schedule:')){const x=db.diarySchedules.find(s=>alarmId(s)===id);if(x){openProject(x.project);setTimeout(()=>{diaryCalendarSelect(x.date);previewDiarySchedule(x.id)},200)}return}if(oldProjectFromAlarm)oldProjectFromAlarm(id)};

async function diaryShowExistingImages(){const t=window._diaryEditingTimeline;if(!t)return;async function show(host,ids,onRemove){if(!host)return;host.innerHTML='';for(const id of ids){const data=await getFile(id);if(!data)continue;const wrap=document.createElement('div');wrap.className='diaryPreviewItem';const img=document.createElement('img');img.src=data;img.onclick=()=>showDiaryImage(data);const b=document.createElement('button');b.type='button';b.textContent='×';b.onclick=()=>{onRemove(id);wrap.remove()};wrap.append(img,b);host.append(wrap)}}await show(document.getElementById('dtPreview'),t.diaryImageIds||[],id=>{t.diaryImageIds=t.diaryImageIds.filter(x=>x!==id)});for(const el of document.querySelectorAll('.diarySubEdit'))await show(el.querySelector('.subExisting'),JSON.parse(el.dataset.images||'[]'),id=>{el.dataset.images=JSON.stringify(JSON.parse(el.dataset.images||'[]').filter(x=>x!==id))})}
window.diaryPreviewFiles=function(input){const subOnly=input.id==='diarySubFiles',host=document.getElementById(subOnly?'diarySubImages':'dtPreview');if(!host)return;host.querySelectorAll('.diaryNewPreview').forEach(x=>x.remove());const files=[...input.files],max=subOnly?4-window._diarySubImageIds.length:Infinity;if(files.length>max){alert('이미지는 최대 4장입니다.');input.value='';return}for(const file of files){const url=URL.createObjectURL(file),wrap=document.createElement('div');wrap.className='diaryPreviewItem diaryNewPreview';const img=document.createElement('img');img.src=url;img.onclick=()=>showDiaryImage(url);const btn=document.createElement('button');btn.type='button';btn.textContent='×';btn.onclick=()=>{const dt=new DataTransfer();[...input.files].filter(x=>x!==file).forEach(x=>dt.items.add(x));input.files=dt.files;wrap.remove();URL.revokeObjectURL(url)};wrap.append(img,btn);host.append(wrap)}};
const previousDiaryStats=expandedProjectStatsHtml;
expandedProjectStatsHtml=function(p){if(p.projectType!=='diary')return previousDiaryStats(p);const count=kind=>kind.filter(x=>x.project===p.id).length;return '<div class="projectStats"><span class="statPill">일기 '+(count(db.diaries||[])+count(db.pictureDiaries||[]))+'</span><span class="statPill">타임라인 '+count(db.timeline||[])+'</span><span class="statPill">스케줄 '+count(db.diarySchedules||[])+'</span></div>'};projectStatsHtml=expandedProjectStatsHtml;
const scheduleStyle=document.createElement('style');scheduleStyle.textContent='.diarySchedulePreview{min-width:0;max-width:100%;box-sizing:border-box}.diaryScheduleDetails{display:grid;gap:10px}.diaryScheduleDetail{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:13px;min-width:0;overflow-wrap:anywhere}.diaryScheduleDetail>.meta{margin-bottom:7px}.diaryScheduleLink{display:inline-flex;align-items:center;max-width:100%;padding:10px 14px;border-radius:10px;background:var(--theme);color:white;text-decoration:none}';document.head.appendChild(scheduleStyle);
const diaryScrollStyle=document.createElement('style');diaryScrollStyle.textContent='.diaryTimelineScrollable{max-height:240px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;white-space:pre-wrap;overflow-wrap:anywhere}.diaryExpanded .diarySubVerticalImages{display:flex;flex-direction:column;align-items:center;gap:10px;max-height:270px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:8px 4px}.diaryExpanded .diarySubVerticalImages .diarySubImage{display:block;width:min(100%,280px);max-width:100%;height:155px;max-height:155px;object-fit:contain;border-radius:10px;flex:0 0 auto}.diaryCommentSection{min-width:0}.diaryCommentSection .fix28CommentComposer{display:grid;gap:8px}.diaryCommentSection textarea{width:100%;box-sizing:border-box;min-height:85px}.diaryScheduleLink{cursor:pointer}';document.head.appendChild(diaryScrollStyle);
const diarySubCardStyle=document.createElement('style');diarySubCardStyle.textContent='.diarySubCard{border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0;overflow:hidden}.diarySubCardOpen{display:block;width:100%;text-align:left;background:transparent;border:0;color:inherit;padding:0;min-width:0}.diarySubHeading{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}.diarySubHeading b{min-width:0;overflow-wrap:anywhere}.diarySubHeading .meta{flex:none}.diarySubExcerpt{white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow-wrap:anywhere;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.diarySubVerticalImages{display:flex;flex-direction:column;gap:8px;max-height:230px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.diarySubVerticalImages .diarySubImage{width:100%;height:120px;object-fit:contain;border-radius:10px;flex-shrink:0}';document.head.appendChild(diarySubCardStyle);
const diaryLayoutFixStyle=document.createElement('style');diaryLayoutFixStyle.textContent='.diaryExpanded .diarySubHorizontalImages{display:flex;flex-direction:row;align-items:center;gap:10px;width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;padding:10px 0;margin-top:10px;border-top:1px solid var(--line)}.diaryExpanded .diarySubHorizontalImages .diarySubImage{display:block;flex:0 0 150px;width:150px;height:88px;max-width:none;max-height:none;object-fit:cover;border-radius:10px}.diarySchedulePreview .diaryCommentSection,.diaryCommentSection{display:flex;flex-direction:column;gap:10px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:0;padding:12px 0;border-top:1px solid var(--line)}.diaryCommentSection h3{margin:0}.diaryCommentSection .fix28CommentList{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0}.diaryCommentSection .fix28Comment{width:100%;min-width:0;box-sizing:border-box;overflow-wrap:anywhere}.diaryCommentSection .fix28CommentComposer{display:flex;flex-direction:column;gap:10px;width:100%;min-width:0;margin:0;padding:0}.diaryCommentSection .fix28CommentComposer textarea{display:block;width:100%;min-height:110px;box-sizing:border-box;margin:0}.diaryCommentSection .fix28CommentComposer button{display:block;width:100%;min-height:48px;margin:0}.diarySchedulePreview>.right,.diarySubPreview>.right{margin-top:0;display:flex;gap:8px;width:100%}.diarySchedulePreview>.right>button,.diarySubPreview>.right>button{flex:1;min-width:0}';document.head.appendChild(diaryLayoutFixStyle);
const diaryExtraStyle=document.createElement('style');diaryExtraStyle.textContent='.diaryTimelineEditor,.diaryTimelineEditor>*{min-width:0;max-width:100%;box-sizing:border-box}.diaryImageField{min-width:0;max-width:100%;overflow:hidden;display:grid;gap:10px;border:1px solid var(--line);padding:14px;border-radius:14px}.diaryImageChoose{display:block;text-align:center;padding:13px;background:var(--theme);color:white;border-radius:10px;cursor:pointer}.diaryImageStrip{max-width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;display:flex;gap:8px}.diaryPreviewItem{width:94px;max-width:94px;flex:0 0 94px;overflow:hidden}.diaryPreviewItem img{width:94px;height:94px}.diaryPreviewItem button{width:27px;height:27px;min-height:0;padding:0;border-radius:50%}.diaryExpanded{min-width:0;overflow:hidden}.diarySubRow{width:100%;min-width:0;text-align:left;display:grid;gap:6px;overflow-wrap:anywhere}.diarySubRow span{white-space:pre-wrap}.diaryAddSub{width:100%}.diaryScheduleDetails{display:grid;gap:10px}.diaryScheduleDetails>div{background:var(--card);border:1px solid var(--line);padding:12px;border-radius:12px;min-width:0;overflow-wrap:anywhere}.diaryScheduleDetails a{word-break:break-all}';document.head.appendChild(diaryExtraStyle);
const diarySymbolStyle=document.createElement('style');diarySymbolStyle.textContent='.diarySymbolPicker{display:grid;grid-template-columns:1fr 1fr;gap:12px;min-width:0}.diarySymbolPicker label{display:grid;gap:8px;min-width:0}.diarySymbolPicker select{width:100%;min-width:0}.diarySymbolColors{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.diarySymbolColorChoice{width:24px;height:24px;min-height:24px;padding:0;border-radius:50%;border:2px solid transparent}.diarySymbolColorChoice.selected{outline:2px solid var(--ink);outline-offset:2px}.diarySymbolColors input[type=color]{width:32px;height:30px;padding:0}.diaryTimelineSymbol{display:inline-block;margin-right:9px;font-size:1.15em}.diaryCalendarSymbol{display:inline-flex;align-items:center;justify-content:center;font-size:13px;line-height:1;flex:0 0 auto}.calendarMarks{display:flex;align-items:center;flex-wrap:wrap;gap:3px}.diarySubPreview{width:100%;min-width:0;box-sizing:border-box}.diarySubPreview .diaryCommentSection{width:100%;padding:12px 0}.diarySubPreview .fix28CommentComposer{width:100%;display:flex;flex-direction:column;gap:8px}.diarySubPreview .fix28CommentComposer textarea,.diarySubPreview .fix28CommentComposer button{width:100%;box-sizing:border-box}.diarySubPreview>.right{width:100%;display:flex;gap:10px;margin-top:0}.diarySubPreview>.right>button{flex:1;min-width:0}';document.head.appendChild(diarySymbolStyle);
const style=document.createElement('style');style.textContent='.diaryTimelineHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.diaryArrow{margin-left:10px}.diaryEntryList>.diaryRecord,.diaryEntryList>.calendarEntry{margin-top:12px}.diaryFilters{display:flex;gap:6px;margin:10px 0;flex-wrap:wrap}.diaryFilters button{font-size:12px;padding:5px 10px;border-radius:99px}.diaryFilters button.active{background:var(--theme);color:white}.diaryPreviewItem{position:relative;flex:none}.diaryPreviewItem img{width:90px;height:90px;object-fit:cover;border-radius:9px}.diaryPreviewItem button{position:absolute;right:0;top:0;padding:2px 7px}.diaryScheduleDetails{display:grid;gap:12px;overflow-wrap:anywhere}.diaryScheduleDetails b{margin-right:10px}'+'.calendarMark.schedule,.calendarLegend .sc i{background:color-mix(in srgb,var(--theme) 45%,#e9a23b)}.diaryFold{border:0;background:transparent;color:var(--ink);font-weight:800;text-align:left;flex:1}.diaryRecord{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:var(--card)}.diaryExpanded{padding:10px 3px;display:grid;gap:12px}.diaryRecordBody{white-space:pre-wrap;overflow-wrap:anywhere}.diarySub{border:1px solid var(--line);border-radius:12px;padding:12px}.diaryImageStrip{display:flex;gap:8px;overflow-x:auto;max-width:100%}.diarySubImage{width:95px;height:95px;object-fit:cover;border-radius:10px;flex-shrink:0}.diarySubEdit{padding:12px;border:1px solid var(--line);border-radius:12px;margin:8px 0}.calendarQuickActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}.calendarQuickActions button{min-width:0}';document.head.appendChild(style);
})();