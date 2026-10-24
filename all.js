
const KEY='creative_studio_storyhand_v1',AUTO_KEY='creative_studio_storyhand_auto_v1',DBNAME='creative_studio_storyhand_files_v1';let db=load(),currentProjectId=null,limits={projects:20,settings:20,characters:20,relations:20,images:20,videos:20,sources:20,stories:20,timeline:20,serials:20};
function emptyDB(){return{projects:[],settings:[],stories:[],storyFolders:[],characters:[],relations:[],images:[],videos:[],sources:[],timeline:[],serials:[],quickMemos:[],diaries:[],pictureDiaries:[],characterRelations:[],trash:[],recentViews:[]}}
function normalize(d){d={...emptyDB(),...(d||{})};for(let k of Object.keys(emptyDB()))if(!Array.isArray(d[k]))d[k]=[];for(let p of d.projects){p.projectType=p.projectType||'general';if(!p.projectTypeVersion){if(p.projectType==='general')p.projectType='advanced';p.projectTypeVersion=2}}for(let c of d.characters)c.musicTracks=c.musicTracks||[];return d}
function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)))}catch{return emptyDB()}}
function persist(){try{let prev=localStorage.getItem(KEY);if(prev)localStorage.setItem(AUTO_KEY,prev)}catch{}localStorage.setItem(KEY,JSON.stringify(db))}
function save(){persist();renderAll()}function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function fmt(t){return new Date(t||Date.now()).toLocaleString('ko-KR')}function safeFileName(s='문서'){return s.replace(/[\\/:*?"<>|]/g,'_').trim()||'문서'}function v(id){return document.getElementById(id)?.value||''}function richText(id){return document.getElementById(id)?.innerText.replace(/\u00a0/g,' ')||''}function sanitizeRich(html=''){let t=document.createElement('template');t.innerHTML=html;let allowed=new Set(['B','STRONG','U','BR','DIV','P','FONT']);function clean(n){for(let c of[...n.childNodes]){if(c.nodeType===3)continue;if(c.nodeType!==1){c.remove();continue}if(!allowed.has(c.tagName)){c.replaceWith(document.createTextNode(c.textContent||''));continue}for(let a of[...c.attributes]){if(c.tagName==='FONT'&&a.name==='size'){let z=parseInt(a.value);if(z>=1&&z<=7)continue}c.removeAttribute(a.name)}clean(c)}}clean(t.content);return t.innerHTML}function richHtml(id){return sanitizeRich(document.getElementById(id)?.innerHTML||'')}function richInitial(x){return x?.bodyHtml?sanitizeRich(x.bodyHtml):esc(x?.body||'').replace(/\n/g,'<br>')}const richRanges={};function rememberRichSelection(id){let e=document.getElementById(id),sel=window.getSelection();if(!e||!sel||!sel.rangeCount)return;let r=sel.getRangeAt(0);if(e.contains(r.commonAncestorContainer))richRanges[id]=r.cloneRange()}function restoreRichSelection(id){let e=document.getElementById(id),r=richRanges[id],sel=window.getSelection();if(!e||!sel)return false;e.focus({preventScroll:true});if(r){try{sel.removeAllRanges();sel.addRange(r);return true}catch(_){}}return false}function richEditor(id,x){return `<div class="richWrap"><div class="richToolbar"><button type="button" title="굵게" onpointerdown="rememberRichSelection('${id}')" onclick="richCmd('${id}','bold')"><b>B</b></button><button type="button" title="밑줄" onpointerdown="rememberRichSelection('${id}')" onclick="richCmd('${id}','underline')"><u>U</u></button><select title="글자 크기" onpointerdown="rememberRichSelection('${id}')" onchange="richSize('${id}',this.value);this.value=''"><option value="">글자 크기</option><option value="2">작게</option><option value="3">보통</option><option value="4">크게</option><option value="5">아주 크게</option></select><button type="button" onpointerdown="rememberRichSelection('${id}')" onclick="richCmd('${id}','removeFormat')">서식 지우기</button></div><div id="${id}" class="richEditor" contenteditable="true" onfocus="rememberRichSelection('${id}')" onkeyup="rememberRichSelection('${id}')" onmouseup="rememberRichSelection('${id}')" ontouchend="setTimeout(()=>rememberRichSelection('${id}'),0)" oninput="rememberRichSelection('${id}')">${richInitial(x)}</div></div>`}function richCmd(id,cmd){let e=document.getElementById(id);if(!e)return;restoreRichSelection(id);document.execCommand(cmd,false,null);rememberRichSelection(id)}function richSize(id,size){if(!size)return;let e=document.getElementById(id);if(!e)return;restoreRichSelection(id);document.execCommand('styleWithCSS',false,false);document.execCommand('fontSize',false,size);rememberRichSelection(id)}function encodeObj(o){return `'${btoa(unescape(encodeURIComponent(JSON.stringify(o))))}'`}function decodeObj(s){return JSON.parse(decodeURIComponent(escape(atob(s))))}function resetLimit(k){limits[k]=20}function more(k,fn){limits[k]+=20;fn()}function currentTheme(){return db.projects.find(p=>p.id===currentProjectId)?.color||'#7b61a8'}function contrast(hex){let h=(hex||'#7b61a8').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return(r*299+g*587+b*114)/1000>160?'#222':'#fff'}function applyTheme(c='#7b61a8'){document.documentElement.style.setProperty('--theme',c);document.documentElement.style.setProperty('--themeInk',contrast(c));let dark=document.documentElement.dataset.mode==='dark';document.documentElement.style.setProperty('--soft',dark?`color-mix(in srgb, ${c} 16%, #292830)`:`color-mix(in srgb, ${c} 13%, white)`)}function setMode(mode){document.documentElement.dataset.mode=mode;localStorage.setItem('creativeStudioStoryHandMode',mode);let b=document.getElementById('modeToggle');if(b)b.textContent=mode==='dark'?'Light':'Dark';applyTheme(currentProjectId?currentTheme():'#5d5870');try{if(window.Android)Android.setSystemBars(mode==='dark')}catch(e){}}function toggleMode(){setMode(document.documentElement.dataset.mode==='dark'?'light':'dark')}function cap(s){return s[0].toUpperCase()+s.slice(1)}
function idb(){return new Promise((res,rej)=>{let r=indexedDB.open(DBNAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}async function putFile(id,data){let d=await idb();return new Promise((res,rej)=>{let tx=d.transaction('files','readwrite');tx.objectStore('files').put({id,data});tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}async function getFile(id){let d=await idb();return new Promise((res,rej)=>{let r=d.transaction('files').objectStore('files').get(id);r.onsuccess=()=>res(r.result?.data||'');r.onerror=()=>rej(r.error)})}async function delFile(id){let d=await idb();return new Promise(res=>{let tx=d.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=res;tx.onerror=res})}async function clearFiles(){let d=await idb();return new Promise(res=>{let tx=d.transaction('files','readwrite');tx.objectStore('files').clear();tx.oncomplete=res;tx.onerror=res})}function fileToData(f){return new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
function restartMotion(el,cls='motion-section-enter'){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),380)}
function animateStagger(root=document){const els=[...root.querySelectorAll('.item,.projectCard')].filter(x=>x.offsetParent!==null).slice(0,18);els.forEach((el,i)=>{el.classList.remove('motion-stagger');el.style.animationDelay=`${Math.min(i*22,180)}ms`;void el.offsetWidth;el.classList.add('motion-stagger');setTimeout(()=>{el.classList.remove('motion-stagger');el.style.animationDelay=''},520)})}
for(let b of document.querySelectorAll('.tabs button'))b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.tabsec').forEach(s=>s.classList.add('hidden'));let target=document.getElementById(b.dataset.tab);target.classList.remove('hidden');restartMotion(target);if(b.dataset.tab==='export')renderExportProjects();if(b.dataset.tab==='trash')renderTrash();setTimeout(()=>animateStagger(target),30)};
for(let b of document.querySelectorAll('.subtabs button'))b.onclick=()=>{document.querySelectorAll('.subtabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.subsec').forEach(s=>s.classList.add('hidden'));let target=document.getElementById('project'+cap(b.dataset.subtab));target.classList.remove('hidden');restartMotion(target);if(b.dataset.subtab==='recent')renderRecent();setTimeout(()=>animateStagger(target),30)};
function adjustModalPlacement(){let m=document.getElementById('modal'),c=document.getElementById('modalCard');if(!m||!c||m.classList.contains('hidden'))return;let vh=window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight;let limit=Math.max(320,vh-44);m.classList.toggle('centerShort',c.scrollHeight<limit*0.82)}
let modalCloseTimer=null;
function openModal(h){let c=document.getElementById('modalCard'),m=document.getElementById('modal');if(modalCloseTimer){clearTimeout(modalCloseTimer);modalCloseTimer=null}c.innerHTML=h;c.scrollTop=0;m.classList.remove('closing','centerShort');m.classList.add('hidden');requestAnimationFrame(()=>{m.classList.remove('hidden');requestAnimationFrame(()=>{enhanceAllSelects(c);adjustModalPlacement()})});setTimeout(adjustModalPlacement,140)}
function closeModal(){let m=document.getElementById('modal');if(!m||m.classList.contains('hidden'))return;if(modalCloseTimer){clearTimeout(modalCloseTimer);modalCloseTimer=null}m.classList.add('closing');modalCloseTimer=setTimeout(()=>{m.classList.add('hidden');m.classList.remove('closing','centerShort');modalCloseTimer=null},190)}
document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')closeModal()}
function statusOpts(cur='아이디어'){return['아이디어','검토중','확정','보류','폐기'].map(x=>`<option ${cur===x?'selected':''}>${x}</option>`).join('')}function tags(t=''){return String(t).split(',').map(x=>x.trim()).filter(Boolean).map(x=>`<span class="tag">#${esc(x)}</span>`).join('')}function sortArr(arr,mode){let a=[...arr];a.sort((x,y)=>Number(!!y.favorite)-Number(!!x.favorite));let fav=a.filter(x=>x.favorite),rest=a.filter(x=>!x.favorite);let s=z=>{if(mode==='oldest')z.sort((x,y)=>(x.updated||x.created||0)-(y.updated||y.created||0));else if(mode==='name')z.sort((x,y)=>(x.name||x.title||'').localeCompare(y.name||y.title||'','ko'));else z.sort((x,y)=>(y.updated||y.created||0)-(x.updated||x.created||0));return z};return[...s(fav),...s(rest)]}function toggleMore(id,total,limit){document.getElementById(id)?.classList.toggle('hidden',total<=limit)}function cnt(k,pid){return(db[k]||[]).filter(x=>x.project===pid).length}
function newProject(p){if(typeof p==='string')p=decodeObj(p);p=p||{id:uid(),name:'',desc:'',color:'#7b61a8',projectType:'general',created:Date.now(),updated:Date.now()};openModal(`<div class="stack"><h2>${p.name?'프로젝트 수정':'새 프로젝트'}</h2><input id="pname" placeholder="프로젝트 이름" value="${esc(p.name)}"><select id="ptype" onchange="this.dataset.selected=this.value"><option value="general" ${(p.projectType||'general')==='general'?'selected':''}>일반 프로젝트 — 전체 기능</option><option value="short" ${p.projectType==='short'?'selected':''}>단편 프로젝트 — 단순화된 기능</option></select><div class="note">단편 프로젝트에서는 관계도와 타임라인을 숨기고 설정, 캐릭터, 이미지, 소스파일, 썰 중심으로 표시합니다. 이후 일반 프로젝트로 변경해도 기존 자료는 유지됩니다.</div><textarea id="pdesc" style="min-height:110px" placeholder="설명">${esc(p.desc||'')}</textarea><input id="pcolor" type="color" value="${esc(p.color||'#7b61a8')}"><div class="right">${p.name?`<button class="danger" onclick="trashProject('${p.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveProject('${p.id}')">저장</button></div></div>`)}function saveProject(id){let name=v('pname').trim();if(!name)return alert('프로젝트 이름을 입력해 주세요.');let old=db.projects.find(x=>x.id===id);upsert('projects',{...old,id,name,desc:v('pdesc'),color:v('pcolor'),projectType:v('ptype')||'general',created:old?.created||Date.now(),updated:Date.now()});closeModal();if(currentProjectId===id)openProject(id)}function projectStatsHtml(p){const items=[['설정',cnt('settings',p.id)],['캐릭터',cnt('characters',p.id)],['썰',cnt('stories',p.id)],['연재본',cnt('serials',p.id)]];if(p.projectType!=='short'){items.push(['관계도',cnt('relations',p.id)],['타임라인',cnt('timeline',p.id)])}return `<div class="projectStats">${items.map(([k,v])=>`<span class="statPill">${k} ${v}</span>`).join('')}</div>`}function renderProjects(){let q=v('projectSearch').toLowerCase(),mode=v('projectSort')||'latest',arr=sortArr(db.projects.filter(p=>`${p.name} ${p.desc||''}`.toLowerCase().includes(q)),mode),shown=arr.slice(0,limits.projects);document.getElementById('projectList').innerHTML=shown.length?shown.map(p=>`<div class="card projectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead"><div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${p.projectType==='short'?'단편 프로젝트':'일반 프로젝트'}</span></div><div class="projectDesc">${esc(p.desc||'설명 없음')}</div>${projectStatsHtml(p)}<div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div>`).join(''):'<div class="empty">새 프로젝트를 만들어 보세요.</div>';toggleMore('projectMore',arr.length,limits.projects)}function applyProjectType(p){let short=p.projectType==='short';for(let key of ['relations','timeline']){let btn=document.querySelector(`[data-subtab="${key}"]`),sec=document.getElementById('project'+(key==='relations'?'Relations':'Timeline'));if(btn)btn.classList.toggle('hidden',short);if(sec&&short)sec.classList.add('hidden')}let active=document.querySelector('.subtabs button.active');if(short&&active&&['relations','timeline'].includes(active.dataset.subtab)){document.querySelector('[data-subtab="recent"]').click()}}function openProject(id){let p=db.projects.find(x=>x.id===id);if(!p)return;currentProjectId=id;applyTheme(p.color);document.getElementById('projectHome').classList.add('hidden');document.getElementById('projectView').classList.remove('hidden');document.getElementById('projectCrumb').textContent=p.name;document.getElementById('projectTitle').textContent=p.name;document.getElementById('projectDesc').innerHTML=`<span class="typeBadge">${p.projectType==='short'?'단편 프로젝트':'일반 프로젝트'}</span> ${esc(p.desc||'설명 없음')}`;applyProjectType(p);for(let k of Object.keys(limits))if(k!=='projects')resetLimit(k);renderProjectAll();renderRecent()}function closeProject(){currentProjectId=null;applyTheme();document.getElementById('projectView').classList.add('hidden');document.getElementById('projectHome').classList.remove('hidden');renderProjects()}
function controls(kind,label,newFn,ph){return`<div class="toolbar"><div><h3 style="margin:0 0 4px">${label}</h3><div class="meta" id="${kind}Count"></div></div><button class="primary" onclick="${newFn}()">+ 새 항목</button></div><div class="toolbar"><input id="${kind}Search" class="search" placeholder="${ph}" oninput="resetLimit('${kind}');render${cap(kind)}()"><div class="right"><select id="${kind}Tag" class="filterSel" onchange="resetLimit('${kind}');render${cap(kind)}()"><option value="">모든 태그</option></select><select id="${kind}Sort" class="sorter" onchange="resetLimit('${kind}');render${cap(kind)}()"><option value="latest">최신순</option><option value="oldest">오래된 순</option><option value="name">이름순</option></select></div></div><div id="${kind}List" class="stack"></div><button id="${kind}More" class="loadMore hidden" onclick="more('${kind}',render${cap(kind)})">더 보기 +20</button>`}function setupSections(){projectSettings.innerHTML=controls('settings','설정 문서','newSetting','제목/태그/본문 검색...');projectCharacters.innerHTML=controls('characters','캐릭터','newCharacter','이름/설정 검색...');projectRelations.innerHTML=controls('relations','관계도 / 조직도','newRelation','관계 검색...');projectImages.innerHTML=controls('images','이미지 자료','newImage','이미지 검색...');projectSources.innerHTML=controls('sources','소스파일','newSource','PDF 검색...');projectStories.innerHTML=controls('stories','썰 / 장문','newStory','제목/본문 검색...');projectTimeline.innerHTML=controls('timeline','타임라인','newTimeline','사건/날짜/본문 검색...')}function listData(kind,fields){let all=db[kind].filter(x=>x.project===currentProjectId),tagSet=[...new Set(all.flatMap(x=>String(x.tags||'').split(',').map(t=>t.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'ko')),tagSel=document.getElementById(kind+'Tag');if(tagSel){let old=tagSel.value;tagSel.innerHTML='<option value="">모든 태그</option>'+tagSet.map(t=>`<option value="${esc(t)}">#${esc(t)}</option>`).join('');if(tagSet.includes(old))tagSel.value=old}let q=v(kind+'Search').toLowerCase(),tg=v(kind+'Tag'),mode=v(kind+'Sort')||'latest',arr=all.filter(x=>fields.map(f=>x[f]||'').join(' ').toLowerCase().includes(q)&&(!tg||String(x.tags||'').split(',').map(t=>t.trim()).includes(tg)));arr=sortArr(arr,mode);document.getElementById(kind+'Count').textContent=`이 프로젝트에 ${all.length}개`;toggleMore(kind+'More',arr.length,limits[kind]);return arr.slice(0,limits[kind])}
function trackView(kind,id){if(!id)return;db.recentViews=db.recentViews.filter(x=>!(x.kind===kind&&x.id===id));db.recentViews.unshift({kind,id,project:currentProjectId,viewed:Date.now()});db.recentViews=db.recentViews.slice(0,80);persist()}function kindLabel(k){return{settings:'설정',characters:'캐릭터',relations:'관계도',images:'이미지',sources:'소스파일',stories:'썰',timeline:'타임라인',serials:'연재본 편집',pictureDiaries:'그림일기'}[k]||k}function titleOf(k,x){return x?.name||x?.title||'이름 없음'}function getDoc(k,id){return(db[k]||[]).find(x=>x.id===id)}function openDoc(k,id){let x=getDoc(k,id);if(!x)return alert('연결된 문서를 찾을 수 없습니다.');currentProjectId=x.project;({settings:newSetting,characters:newCharacter,relations:newRelation,images:newImage,sources:newSource,stories:newStory,timeline:newTimeline}[k])(x)}function renderRecent(){let rv=db.recentViews.filter(x=>x.project===currentProjectId).slice(0,12),recent=rv.map(r=>{let x=getDoc(r.kind,r.id);return x?`<div class="item" onclick="openDoc('${r.kind}','${r.id}')"><b>${esc(titleOf(r.kind,x))}</b><div class="meta">${kindLabel(r.kind)} · ${fmt(r.viewed)}</div></div>`:''}).filter(Boolean).join('');let fav=[];for(let k of ['settings','characters','relations','images','sources','stories','timeline'])for(let x of db[k].filter(x=>x.project===currentProjectId&&x.favorite))fav.push({k,x});fav.sort((a,b)=>(b.x.updated||0)-(a.x.updated||0));let modified=[];for(let k of ['settings','characters','relations','images','sources','stories','timeline'])for(let x of db[k].filter(x=>x.project===currentProjectId))modified.push({k,x});modified.sort((a,b)=>(b.x.updated||0)-(a.x.updated||0));projectRecent.innerHTML=`<div class="toolbar"><h3>⭐ 즐겨찾기</h3></div><div class="recentGrid">${fav.length?fav.slice(0,12).map(o=>`<div class="item" onclick="openDoc('${o.k}','${o.x.id}')"><b>${esc(titleOf(o.k,o.x))}</b><div class="meta">${kindLabel(o.k)} · ${esc(o.x.status||'')}</div></div>`).join(''):'<div class="empty">즐겨찾기한 문서가 없습니다.</div>'}</div><div class="toolbar" style="margin-top:16px"><h3>✏️ 최근 수정한 문서</h3></div><div class="recentGrid">${modified.length?modified.slice(0,12).map(o=>`<div class="item" onclick="openDoc('${o.k}','${o.x.id}')"><b>${esc(titleOf(o.k,o.x))}</b><div class="meta">${kindLabel(o.k)} · ${fmt(o.x.updated)}</div></div>`).join(''):'<div class="empty">아직 수정한 문서가 없습니다.</div>'}</div><div class="toolbar" style="margin-top:16px"><h3>🕘 최근 본 문서</h3></div><div class="recentGrid">${recent||'<div class="empty">아직 열어본 문서가 없습니다.</div>'}</div>`}
function favButton(kind,x){return`<button class="favBtn" onclick="event.stopPropagation();toggleFav('${kind}','${x.id}')">${x.favorite?'★':'☆'}</button>`}function toggleFav(k,id){let x=getDoc(k,id);if(!x)return;x.favorite=!x.favorite;x.updated=Date.now();save()}
function linkedPicker(cur=[],selfKind='',selfId=''){let docs=[];for(let k of ['settings','characters','relations','stories','timeline'])for(let x of db[k].filter(x=>x.project===currentProjectId&&!(k===selfKind&&x.id===selfId)))docs.push({k,x});return`<div class="linkedBox"><b>문서 링크</b><div class="meta">관련 문서를 연결하면 아래에 바로가기 형태로 표시됩니다.</div><div style="max-height:180px;overflow:auto">${docs.length?docs.map(o=>`<label class="checkRow"><input type="checkbox" name="linkedDoc" value="${o.k}:${o.x.id}" ${cur.includes(o.k+':'+o.x.id)?'checked':''}> ${kindLabel(o.k)} · ${esc(titleOf(o.k,o.x))}</label>`).join(''):'<div class="meta">연결할 수 있는 문서가 아직 없습니다.</div>'}</div></div>`}function linkedValues(){return[...document.querySelectorAll('input[name=linkedDoc]:checked')].map(x=>x.value)}function linkedChips(ids=[]){return ids.map(s=>{let[k,id]=s.split(':'),x=getDoc(k,id);return x?`<button class="linkChip" onclick="event.stopPropagation();openDoc('${k}','${id}')">${kindLabel(k)} · ${esc(titleOf(k,x))}</button>`:''}).join('')}
function commonFields(x){return`<div class="row"><select id="xstatus">${statusOpts(x.status||'아이디어')}</select><label class="checkRow"><input id="xfav" type="checkbox" ${x.favorite?'checked':''}> 즐겨찾기</label></div>`}function commonData(x){return{status:v('xstatus')||x.status||'아이디어',favorite:!!document.getElementById('xfav')?.checked,linkedIds:linkedValues()}}
function newSetting(s){if(typeof s==='string')s=decodeObj(s);s=s||{id:uid(),title:'',type:'세계관',tags:'',body:'',status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId};if(s.title)trackView('settings',s.id);let opts=['세계관','지역','조직','종족','아이템','연표','기타'].map(x=>`<option ${s.type===x?'selected':''}>${x}</option>`).join('');openModal(`<div class="stack"><h2>설정 문서</h2><div class="row"><input id="stitle" placeholder="제목" value="${esc(s.title)}"><select id="stype">${opts}</select></div>${commonFields(s)}<input id="stags" placeholder="태그" value="${esc(s.tags||'')}">${richEditor('sbody',s)}${linkedPicker(s.linkedIds||[],'settings',s.id)}<div class="right">${s.title?`<button onclick="exportItem('settings','${s.id}','txt')">TXT</button><button onclick="exportItem('settings','${s.id}','pdf')">PDF</button><button class="danger" onclick="trashItem('settings','${s.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveSetting('${s.id}')">저장</button></div></div>`)}function saveSetting(id){let title=v('stitle').trim();if(!title)return alert('제목을 입력해 주세요.');let old=getDoc('settings',id)||{};upsert('settings',{...old,id,title,type:v('stype'),tags:v('stags'),body:richText('sbody'),bodyHtml:richHtml('sbody'),project:currentProjectId,updated:Date.now(),...commonData(old)});closeModal()}function renderSettings(){let a=listData('settings',['title','type','tags','body','status']),el=settingsList;el.innerHTML=a.length?a.map(x=>`<div class="item ${x.favorite?'favorite':''}" onclick="newSetting(${encodeObj(x)})"><div class="right">${favButton('settings',x)}</div><b>${esc(x.title)}</b> <span class="status">${esc(x.status||'아이디어')}</span><div class="meta">${esc(x.type)} · ${fmt(x.updated)}</div>${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div></div>`).join(''):'<div class="empty">등록된 설정 문서가 없습니다.</div>'}
async function imagePickerOne(selected=''){let imgs=db.images.filter(x=>x.project===currentProjectId),out='<option value="">대표 이미지 없음</option>';for(let i of imgs)out+=`<option value="${i.id}" ${selected===i.id?'selected':''}>${esc(i.title)}</option>`;return out}
async function newCharacter(c){if(typeof c==='string')c=decodeObj(c);c=c||{id:uid(),name:'',alias:'',age:'',role:'',tags:'',body:'',relationIds:[],relationNotes:{},relationRanks:{},raceId:'',regionId:'',portraitId:'',musicTracks:[],status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId};c.musicTracks=c.musicTracks||[];if(c.name)trackView('characters',c.id);let rels=db.relations.filter(r=>r.project===currentProjectId),checks=rels.map(r=>{let ck=(c.relationIds||[]).includes(r.id),ranks=r.kind==='소속'?(r.ranks||[]):[];return`<div class="relationLinkRow"><input type="checkbox" name="crel" value="${r.id}" ${ck?'checked':''} onchange="document.getElementById('rf_${r.id}').classList.toggle('hidden',!this.checked)"><div><b>${esc(r.title)}</b><div id="rf_${r.id}" class="stack ${ck?'':'hidden'}"><input id="rc_${r.id}" placeholder="관계 코멘트" value="${esc(c.relationNotes?.[r.id]||'')}">${r.kind==='소속'?`<select id="rr_${r.id}"><option value="">계급 미지정</option>${ranks.map(z=>`<option ${c.relationRanks?.[r.id]===z?'selected':''}>${esc(z)}</option>`).join('')}</select>`:''}</div></div></div>`}).join('');let races=db.settings.filter(s=>s.project===currentProjectId&&s.type==='종족'),regions=db.settings.filter(s=>s.project===currentProjectId&&s.type==='지역'),portraitOpts=await imagePickerOne(c.portraitId);let musicRows='';for(let m of c.musicTracks){let d=await getFile(m.id);musicRows+=musicRowHtml(m,d)}openModal(`<div class="stack"><h2>캐릭터</h2><div class="row"><input id="cname" placeholder="이름" value="${esc(c.name)}"><input id="calias" placeholder="별칭" value="${esc(c.alias||'')}"></div>${commonFields(c)}<div class="row3"><input id="cage" placeholder="나이" value="${esc(c.age||'')}"><input id="crole" placeholder="역할/직업" value="${esc(c.role||'')}"><select id="cportrait">${portraitOpts}</select></div><div class="row"><select id="crace"><option value="">종족 미지정</option>${races.map(s=>`<option value="${s.id}" ${c.raceId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select><select id="cregion"><option value="">지역 미지정</option>${regions.map(s=>`<option value="${s.id}" ${c.regionId===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></div><input id="ctags" placeholder="태그" value="${esc(c.tags||'')}">${richEditor('cbody',c)}<div class="linkedBox"><b>🎵 캐릭터송 / 음악</b><div class="note">MP3, M4A, OGG 등 브라우저가 지원하는 음악은 여기서 바로 재생할 수 있습니다. 재생되지 않는 형식도 파일로 저장할 수 있습니다.</div><label class="btn" style="text-align:center">음악 파일 추가<input id="cmusicInput" type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac" multiple hidden onchange="addCharacterMusic(event)"></label><div id="cmusicList" class="musicList">${musicRows||'<div class="meta" id="noMusic">등록된 음악이 없습니다.</div>'}</div></div><div class="linkedBox"><b>관계도 / 소속</b>${checks||'<div class="meta">등록된 관계도가 없습니다.</div>'}</div>${linkedPicker(c.linkedIds||[],'characters',c.id)}<div class="right">${c.name?`<button onclick="exportItem('characters','${c.id}','txt')">TXT</button><button onclick="exportItem('characters','${c.id}','pdf')">PDF</button><button class="danger" onclick="trashItem('characters','${c.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveCharacter('${c.id}')">저장</button></div></div>`);window._editingMusic=[...c.musicTracks]}function musicRowHtml(m,data){return`<div class="musicRow" data-music-id="${m.id}" data-music-name="${esc(m.name)}"><div><b>${esc(m.name)}</b>${data?`<audio controls preload="metadata" src="${data}"></audio>`:'<div class="meta">파일을 불러올 수 없습니다.</div>'}</div><div class="right"><button type="button" onclick="downloadMusic('${m.id}','${encodeURIComponent(m.name)}')">저장</button><button type="button" class="danger" onclick="removeCharacterMusic('${m.id}',this)">삭제</button></div></div>`}async function addCharacterMusic(e){let files=[...(e.target.files||[])];if(!files.length)return;document.getElementById('noMusic')?.remove();for(let f of files){let id='music_'+uid(),data=await fileToData(f),m={id,name:f.name,type:f.type||'',size:f.size||0};await putFile(id,data);window._editingMusic=window._editingMusic||[];window._editingMusic.push(m);document.getElementById('cmusicList').insertAdjacentHTML('beforeend',musicRowHtml(m,data))}e.target.value=''}async function removeCharacterMusic(id,btn){if(!confirm('이 음악을 캐릭터에서 제거하시겠습니까?'))return;await delFile(id);window._editingMusic=(window._editingMusic||[]).filter(m=>m.id!==id);btn.closest('.musicRow')?.remove();if(!document.querySelector('#cmusicList .musicRow'))document.getElementById('cmusicList').innerHTML='<div class="meta" id="noMusic">등록된 음악이 없습니다.</div>'}async function downloadMusic(id,name){let d=await getFile(id);if(!d)return alert('음악 파일을 찾을 수 없습니다.');let a=document.createElement('a');a.href=d;a.download=decodeURIComponent(name||'character-song');a.click()}function saveCharacter(id){let name=v('cname').trim();if(!name)return alert('이름을 입력해 주세요.');let relationIds=[...document.querySelectorAll('input[name=crel]:checked')].map(x=>x.value),relationNotes={},relationRanks={};for(let rid of relationIds){relationNotes[rid]=v('rc_'+rid);if(document.getElementById('rr_'+rid))relationRanks[rid]=v('rr_'+rid)}let old=getDoc('characters',id)||{};upsert('characters',{...old,id,name,alias:v('calias'),age:v('cage'),role:v('crole'),raceId:v('crace'),regionId:v('cregion'),portraitId:v('cportrait'),tags:v('ctags'),body:richText('cbody'),bodyHtml:richHtml('cbody'),musicTracks:window._editingMusic||old.musicTracks||[],relationIds,relationNotes,relationRanks,project:currentProjectId,updated:Date.now(),...commonData(old)});window._editingMusic=[];closeModal()}async function renderCharacters(){let a=listData('characters',['name','alias','role','tags','body','status']),blocks=[];for(let c of a){let portrait=c.portraitId?await getFile(c.portraitId):'',race=getDoc('settings',c.raceId)?.title,region=getDoc('settings',c.regionId)?.title,rels=(c.relationIds||[]).map(id=>{let r=getDoc('relations',id);return r?`${r.title}${c.relationRanks?.[id]?' · '+c.relationRanks[id]:''}`:''}).filter(Boolean),musicCount=(c.musicTracks||[]).length;blocks.push(`<div class="item ${c.favorite?'favorite':''} ${portrait?'hasCornerMedia':''}" onclick="newCharacter(${encodeObj(c)})"><div class="itemCorner">${favButton('characters',c)}${portrait?`<img class="portrait" src="${portrait}">`:''}</div><b>${esc(c.name)}</b> <span class="status">${esc(c.status||'아이디어')}</span><div class="meta">${esc(c.age||'나이 미정')} · ${esc(c.role||'역할 미정')} · ${fmt(c.updated)}</div><div class="chips">${race?`<span class="pill">종족 · ${esc(race)}</span>`:''}${region?`<span class="pill">지역 · ${esc(region)}</span>`:''}${musicCount?`<span class="pill">🎵 캐릭터송 ${musicCount}곡</span>`:''}</div>${tags(c.tags)}${rels.length?`<div class="meta">관계/소속: ${rels.map(esc).join(', ')}</div>`:''}<div class="chips">${linkedChips(c.linkedIds)}</div><div class="snippet">${esc(c.body||'설정 없음')}</div></div>`)}charactersList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">등록된 캐릭터가 없습니다.</div>'}
function relationViz(r){
  if(!r)return '<div class="meta">미리보기가 없습니다.</div>';
  if(r.kind==='소속'){
    let ranks=Array.isArray(r.ranks)?r.ranks:[];
    if(!ranks.length)return '<div class="meta">계급을 추가하면 조직도 미리보기가 표시됩니다.</div>';
    let notes=Array.isArray(r.rankNotes)?r.rankNotes:[];return `<div class="stack" style="margin-top:10px">${ranks.map((rank,i)=>`<div class="linkedBox" style="text-align:center"><b>${esc(rank)}</b>${notes[i]?`<div class="meta" style="margin-top:5px">${esc(notes[i])}</div>`:''}${i<ranks.length-1?'<div class="meta" style="margin-top:6px">↓</div>':''}</div>`).join('')}</div>`;
  }
  let members=String(r.members||r.people||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!members.length)return '<div class="meta">대상을 입력하면 관계 미리보기가 표시됩니다.</div>';
  return `<div class="chips" style="margin-top:10px">${members.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>`;
}
function newRelation(r){if(typeof r==='string')r=decodeObj(r);r=r||{id:uid(),title:'',kind:'혼합',members:'',ranks:[],body:'',tags:'',status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId};if(r.title)trackView('relations',r.id);r.ranks=Array.isArray(r.ranks)?r.ranks:[];r.rankNotes=Array.isArray(r.rankNotes)?r.rankNotes:[];let rankInputs=(r.ranks.length?r.ranks:['']).map((x,i)=>`<div class="rankDetailRow"><input class="rankInput" value="${esc(x)}" placeholder="계급 이름"><input class="rankNote" value="${esc(r.rankNotes[i]||'')}" placeholder="계급 설명 / 코멘트"><button type="button" onclick="this.parentElement.remove()">삭제</button></div>`).join('');openModal(`<div class="stack"><h2>${r.kind==='소속'?'조직도':'관계도'}</h2><div class="row"><input id="rtitle" placeholder="제목" value="${esc(r.title)}"><select id="rkind" onchange="refreshRelationMode()"><option ${r.kind==='인물'?'selected':''}>인물</option><option ${r.kind==='소속'?'selected':''}>소속</option><option ${r.kind==='혼합'?'selected':''}>혼합</option></select></div>${commonFields(r)}<div id="normalRelationFields" class="${r.kind==='소속'?'hidden':''}"><input id="rmembers" placeholder="대상 (쉼표로 구분)" value="${esc(r.members||r.people||'')}"></div><div id="orgRelationFields" class="linkedBox ${r.kind==='소속'?'':'hidden'}"><b>계급 구조</b><div id="rankList" class="stack">${rankInputs}</div><button onclick="addRankRow()">+ 계급 추가</button></div><input id="rtags" placeholder="태그" value="${esc(r.tags||'')}">${richEditor('rbody',r)}<div class="card"><b>미리보기</b>${relationViz(r)}</div>${linkedPicker(r.linkedIds||[],'relations',r.id)}<div class="right">${r.title?`<button onclick="exportItem('relations','${r.id}','txt')">TXT</button><button onclick="exportItem('relations','${r.id}','pdf')">PDF</button><button class="danger" onclick="trashItem('relations','${r.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveRelation('${r.id}')">저장</button></div></div>`)}function refreshRelationMode(){let org=v('rkind')==='소속';normalRelationFields.classList.toggle('hidden',org);orgRelationFields.classList.toggle('hidden',!org)}function addRankRow(){rankList.insertAdjacentHTML('beforeend','<div class="rankDetailRow"><input class="rankInput" placeholder="계급 이름"><input class="rankNote" placeholder="계급 설명 / 코멘트"><button type="button" onclick="this.parentElement.remove()">삭제</button></div>')}function saveRelation(id){let title=v('rtitle').trim();if(!title)return alert('제목을 입력해 주세요.');let kind=v('rkind'),rows=[...document.querySelectorAll('.rankDetailRow')],ranks=[],rankNotes=[];for(let row of rows){let n=row.querySelector('.rankInput')?.value.trim()||'',note=row.querySelector('.rankNote')?.value.trim()||'';if(n){ranks.push(n);rankNotes.push(note)}}let old=getDoc('relations',id)||{};upsert('relations',{...old,id,title,kind,members:kind==='소속'?'':v('rmembers'),ranks,rankNotes,body:richText('rbody'),bodyHtml:richHtml('rbody'),tags:v('rtags'),project:currentProjectId,updated:Date.now(),...commonData(old)});closeModal()}function renderRelations(){let a=listData('relations',['title','members','people','tags','body','kind','status']);relationsList.innerHTML=a.length?a.map(r=>`<div class="item ${r.favorite?'favorite':''}" onclick="newRelation(${encodeObj(r)})"><div class="right">${favButton('relations',r)}</div><b>${esc(r.title)}</b> <span class="status">${esc(r.status||'아이디어')}</span><div class="meta">${r.kind==='소속'?`조직도 · ${(r.ranks||[]).map(esc).join(' > ')||'계급 미지정'}`:`${esc(r.kind||'혼합')} · ${esc(r.members||r.people||'대상 미지정')}`}</div>${tags(r.tags)}<div class="chips">${linkedChips(r.linkedIds)}</div><div class="snippet">${esc(r.body||'내용 없음')}</div></div>`).join(''):'<div class="empty">등록된 관계도가 없습니다.</div>'}
async function newImage(i){if(typeof i==='string')i=decodeObj(i);i=i||{id:uid(),title:'',tags:'',note:'',favorite:false,project:currentProjectId};if(i.title)trackView('images',i.id);let existing=i.title?await getFile(i.id):'';openModal(`<div class="stack"><h2>이미지</h2><input id="ititle" placeholder="제목" value="${esc(i.title)}"><label class="checkRow"><input id="ifav" type="checkbox" ${i.favorite?'checked':''}> 즐겨찾기</label><input id="itags" placeholder="태그" value="${esc(i.tags||'')}"><textarea id="inote" style="min-height:120px">${esc(i.note||'')}</textarea><label class="btn" style="text-align:center">이미지 선택<input id="ifile" type="file" accept="image/*" hidden></label><div id="imgPrev">${existing?`<img style="max-width:100%;max-height:420px" src="${existing}">`:''}</div><div class="right">${i.title?`<button onclick="downloadStoredFile('${i.id}','${esc(i.title)}.png')">원본 저장</button><button class="danger" onclick="trashItem('images','${i.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveImage('${i.id}')">저장</button></div></div>`);ifile.onchange=async e=>{let f=e.target.files?.[0];if(!f)return;let d=await fileToData(f);imgPrev.dataset.data=d;imgPrev.innerHTML=`<img style="max-width:100%;max-height:420px" src="${d}">`}}async function saveImage(id){let title=v('ititle').trim();if(!title)return alert('제목을 입력해 주세요.');let data=imgPrev.dataset.data,old=getDoc('images',id);if(data)await putFile(id,data);else if(!old)return alert('이미지를 선택해 주세요.');upsert('images',{...old,id,title,tags:v('itags'),note:v('inote'),favorite:!!ifav.checked,project:currentProjectId,updated:Date.now()});closeModal()}async function renderImages(){let a=listData('images',['title','tags','note']),blocks=[];for(let i of a){let d=await getFile(i.id);blocks.push(`<div class="item ${i.favorite?'favorite':''}" onclick="newImage(${encodeObj(i)})">${d?`<img style="width:100%;height:140px;object-fit:cover;border-radius:10px" src="${d}">`:''}<div class="right">${favButton('images',i)}</div><b>${esc(i.title)}</b>${tags(i.tags)}<div class="snippet">${esc(i.note||'메모 없음')}</div></div>`)}imagesList.className='gallery';imagesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">등록된 이미지가 없습니다.</div>'}
function nativePdfPreview(data,name){
  if(window.Android){
    let pages=[];let count=0;
    try{count=Number(Android.getPdfPageCount?.(data)||0)}catch(e){}
    if(count>0&&Android.renderPdfPage){
      for(let i=0;i<count;i++){
        let img='';try{img=Android.renderPdfPage(data,i)||''}catch(e){}
        if(img)pages.push(`<div class="pdfPreviewPage"><div class="pdfPreviewPageNo">${i+1} / ${count}</div><img class="pdfPagePreview" src="${img}" alt="PDF ${i+1}페이지 미리보기"></div>`)
      }
    }else{
      let preview='';try{preview=Android.renderPdfPreview(data)||''}catch(e){}
      if(preview)pages.push(`<div class="pdfPreviewPage"><img class="pdfPagePreview" src="${preview}" alt="PDF 첫 페이지 미리보기"></div>`)
    }
    return `<div class="nativePdfBox"><div class="meta">${esc(name||'PDF')}${count?` · ${count}페이지`:''}</div><div class="pdfPages">${pages.join('')||'<div class="note">PDF 미리보기를 만들 수 없습니다. 원본 파일은 정상적으로 저장되어 있습니다.</div>'}</div><button type="button" onclick="appSaveDataUrl('${data}','${esc(name||'document.pdf')}')">원본 PDF 저장</button></div>`
  }
  return `<div class="meta">${esc(name||'PDF')}</div><iframe class="pdfPreview" src="${data}"></iframe>`
}
async function newSource(f){if(typeof f==='string')f=decodeObj(f);f=f||{id:uid(),title:'',tags:'',note:'',favorite:false,project:currentProjectId};if(f.title)trackView('sources',f.id);let existing=f.title?await getFile(f.id):'';openModal(`<div class="stack"><h2>소스파일 PDF</h2><input id="ftitle" placeholder="제목" value="${esc(f.title)}"><label class="checkRow"><input id="ffav" type="checkbox" ${f.favorite?'checked':''}> 즐겨찾기</label><input id="ftags" placeholder="태그" value="${esc(f.tags||'')}"><textarea id="fnote" style="min-height:120px">${esc(f.note||'')}</textarea><label class="btn" style="text-align:center">PDF 선택<input id="fpdf" type="file" accept="application/pdf,.pdf" hidden></label><div id="pdfArea">${existing?nativePdfPreview(existing,f.fileName||'PDF'):'<div class="empty">PDF를 선택하면 미리보기가 표시됩니다.</div>'}</div><div class="right">${f.title?`<button onclick="downloadStoredFile('${f.id}','${esc(f.fileName||f.title+'.pdf')}')">원본 PDF 저장</button><button class="danger" onclick="trashItem('sources','${f.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveSource('${f.id}')">저장</button></div></div>`);fpdf.onchange=async e=>{let file=e.target.files?.[0];if(!file)return;let data=await fileToData(file);pdfArea.dataset.data=data;pdfArea.dataset.name=file.name;pdfArea.innerHTML=nativePdfPreview(data,file.name)}}async function saveSource(id){let title=v('ftitle').trim();if(!title)return alert('제목을 입력해 주세요.');let old=getDoc('sources',id),data=pdfArea.dataset.data;if(data)await putFile(id,data);else if(!old)return alert('PDF를 선택해 주세요.');upsert('sources',{...old,id,title,tags:v('ftags'),note:v('fnote'),favorite:!!ffav.checked,fileName:pdfArea.dataset.name||old?.fileName||title+'.pdf',project:currentProjectId,updated:Date.now()});closeModal()}function renderSources(){let a=listData('sources',['title','tags','note','fileName']);sourcesList.innerHTML=a.length?a.map(f=>`<div class="item ${f.favorite?'favorite':''}" onclick="newSource(${encodeObj(f)})"><div class="right">${favButton('sources',f)}</div><div style="font-size:34px">📄</div><b>${esc(f.title)}</b><div class="meta">${esc(f.fileName||'PDF')} · ${fmt(f.updated)}</div>${tags(f.tags)}<div class="snippet">${esc(f.note||'메모 없음')}</div></div>`).join(''):'<div class="empty">등록된 PDF 소스파일이 없습니다.</div>'}async function downloadStoredFile(id,name){let d=await getFile(id);if(!d)return alert('파일을 찾을 수 없습니다.');appSaveDataUrl(d,name)}
async function newStory(s){if(typeof s==='string')s=decodeObj(s);s=s||{id:uid(),title:'',tags:'',body:'',imageIds:[],status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId};if(s.title)trackView('stories',s.id);let picks=[];for(let i of db.images.filter(x=>x.project===currentProjectId)){let d=await getFile(i.id);picks.push(`<label><img src="${d}"><div><input type="checkbox" name="storyImg" value="${i.id}" ${(s.imageIds||[]).includes(i.id)?'checked':''}> ${esc(i.title)}</div></label>`)}openModal(`<div class="stack"><h2>썰 / 장문</h2><input id="ttitle" placeholder="제목" value="${esc(s.title)}">${commonFields(s)}<input id="ttags" placeholder="태그" value="${esc(s.tags||'')}">${richEditor('tbody',s)}<div class="meta"><span id="charCount">${(s.body||'').length.toLocaleString()}</span>자</div><div class="linkedBox"><b>이미지 삽입</b><div class="imagePick">${picks.join('')||'<div class="meta">등록된 이미지가 없습니다.</div>'}</div><label class="btn" style="text-align:center">+ 새 이미지<input id="storyFiles" type="file" accept="image/*" multiple hidden></label></div>${linkedPicker(s.linkedIds||[],'stories',s.id)}<div class="right">${s.title?`<button onclick="exportItem('stories','${s.id}','txt')">TXT</button><button onclick="exportItem('stories','${s.id}','pdf')">PDF</button><button class="danger" onclick="trashItem('stories','${s.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveStory('${s.id}')">저장</button></div></div>`);document.getElementById('tbody').classList.add('storyLongEditor');document.getElementById('tbody').oninput=e=>charCount.textContent=e.target.innerText.length.toLocaleString()}async function saveStory(id){let title=v('ttitle').trim();if(!title)return alert('제목을 입력해 주세요.');let imageIds=[...document.querySelectorAll('input[name=storyImg]:checked')].map(x=>x.value);for(let f of [...(storyFiles.files||[])]){let iid=uid(),data=await fileToData(f);await putFile(iid,data);db.images.unshift({id:iid,title:f.name.replace(/\.[^.]+$/,''),tags:'',note:'썰에서 추가',project:currentProjectId,updated:Date.now()});imageIds.push(iid)}let old=getDoc('stories',id)||{};upsert('stories',{...old,id,title,tags:v('ttags'),body:richText('tbody'),bodyHtml:richHtml('tbody'),imageIds,project:currentProjectId,updated:Date.now(),...commonData(old)});closeModal()}async function renderStories(){let a=listData('stories',['title','tags','body','status']),blocks=[];for(let s of a){let thumbs=[];for(let iid of(s.imageIds||[]).slice(0,4)){let d=await getFile(iid);if(d)thumbs.push(`<img class="storyThumb" src="${d}">`)}blocks.push(`<div class="item ${s.favorite?'favorite':''}" onclick="newStory(${encodeObj(s)})"><div class="right">${favButton('stories',s)}</div><b>${esc(s.title)}</b> <span class="status">${esc(s.status||'아이디어')}</span><div class="meta">${fmt(s.updated)} · ${(s.body||'').length.toLocaleString()}자</div>${tags(s.tags)}${thumbs.length?`<div class="thumbRow">${thumbs.join('')}</div>`:''}<div class="chips">${linkedChips(s.linkedIds)}</div><div class="snippet">${esc(s.body||'내용 없음')}</div></div>`)}storiesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">저장된 썰이 없습니다.</div>'}
function newTimeline(t){if(typeof t==='string')t=decodeObj(t);t=t||{id:uid(),title:'',dateLabel:'',order:'',tags:'',body:'',status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId};if(t.title)trackView('timeline',t.id);openModal(`<div class="stack"><h2>타임라인 사건</h2><input id="lttitle" placeholder="사건 제목" value="${esc(t.title)}">${commonFields(t)}<div class="row"><input id="ltdate" placeholder="날짜/시기 (예: 왕력 203년 봄)" value="${esc(t.dateLabel||'')}"><input id="ltorder" type="number" placeholder="정렬 순서" value="${esc(t.order??'')}"></div><input id="lttags" placeholder="태그" value="${esc(t.tags||'')}">${richEditor('ltbody',t)}${linkedPicker(t.linkedIds||[],'timeline',t.id)}<div class="right">${t.title?`<button onclick="exportItem('timeline','${t.id}','txt')">TXT</button><button onclick="exportItem('timeline','${t.id}','pdf')">PDF</button><button class="danger" onclick="trashItem('timeline','${t.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveTimeline('${t.id}')">저장</button></div></div>`)}function saveTimeline(id){let title=v('lttitle').trim();if(!title)return alert('사건 제목을 입력해 주세요.');let old=getDoc('timeline',id)||{};upsert('timeline',{...old,id,title,dateLabel:v('ltdate'),order:v('ltorder'),tags:v('lttags'),body:richText('ltbody'),bodyHtml:richHtml('ltbody'),project:currentProjectId,updated:Date.now(),...commonData(old)});closeModal()}function renderTimeline(){let a=listData('timeline',['title','dateLabel','tags','body','status']);a=[...a].sort((x,y)=>{let ax=x.order===''||x.order==null?999999:Number(x.order),ay=y.order===''||y.order==null?999999:Number(y.order);return ax-ay||(x.updated||0)-(y.updated||0)});timelineList.innerHTML=a.length?`<div class="timelineLine">${a.map(t=>`<div class="item timelineItem ${t.favorite?'favorite':''}" onclick="newTimeline(${encodeObj(t)})"><div class="right">${favButton('timeline',t)}</div><b>${esc(t.title)}</b> <span class="status">${esc(t.status||'아이디어')}</span><div class="meta">${esc(t.dateLabel||'시기 미정')}${t.order!==''&&t.order!=null?' · 순서 '+esc(t.order):''}</div>${tags(t.tags)}<div class="chips">${linkedChips(t.linkedIds)}</div><div class="snippet">${esc(t.body||'내용 없음')}</div></div>`).join('')}</div>`:'<div class="empty">등록된 타임라인 사건이 없습니다.</div>'}
function upsert(kind,obj,rerender=true){let i=db[kind].findIndex(x=>x.id===obj.id);i>=0?db[kind][i]=obj:db[kind].unshift(obj);persist();if(rerender)renderAll()}function trashItem(kind,id){let x=getDoc(kind,id);if(!x||!confirm('휴지통으로 이동하시겠습니까?'))return;db.trash.unshift({id:uid(),kind,data:x,deletedAt:Date.now()});db[kind]=db[kind].filter(z=>z.id!==id);persist();closeModal();renderAll()}function trashProject(pid){let p=db.projects.find(x=>x.id===pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','images','sources','stories','timeline','serials','storyFolders']){bundle.items[k]=db[k].filter(x=>x.project===pid);db[k]=db[k].filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()}function renderTrash(){trashList.innerHTML=db.trash.length?db.trash.map(t=>{let title=t.kind==='project'?t.data.project.name:titleOf(t.kind,t.data);return`<div class="card trashRow"><div><b>${esc(title)}</b><div class="meta">${kindLabel(t.kind)} · 삭제 ${fmt(t.deletedAt)}</div></div><div class="right"><button onclick="restoreTrash('${t.id}')">복원</button><button class="danger" onclick="purgeTrash('${t.id}')">영구삭제</button></div></div>`}).join(''):'<div class="empty">휴지통이 비어 있습니다.</div>'}function restoreTrash(id){let t=db.trash.find(x=>x.id===id);if(!t)return;if(t.kind==='project'){db.projects.push(t.data.project);for(let[k,arr]of Object.entries(t.data.items||{}))db[k].push(...arr)}else db[t.kind].push(t.data);db.trash=db.trash.filter(x=>x.id!==id);save();renderTrash()}async function purgeTrash(id){let t=db.trash.find(x=>x.id===id);if(!t)return;if(!confirm('영구 삭제하시겠습니까? 삭제 후에는 복원할 수 없습니다.'))return;let ids=[];if(t.kind==='images'||t.kind==='sources')ids=[t.data.id];if(t.kind==='characters')ids=(t.data.musicTracks||[]).map(m=>m.id);if(t.kind==='project'){ids=[...(t.data.items?.images||[]),...(t.data.items?.sources||[])].map(x=>x.id);for(let c of(t.data.items?.characters||[]))ids.push(...(c.musicTracks||[]).map(m=>m.id))}for(let fid of ids)await delFile(fid);db.trash=db.trash.filter(x=>x.id!==id);persist();renderTrash()}async function emptyTrash(){if(!db.trash.length||!confirm('휴지통의 모든 항목을 영구 삭제하시겠습니까?'))return;for(let t of [...db.trash]){let ids=t.kind==='project'?[...(t.data.items?.images||[]),...(t.data.items?.sources||[])].map(x=>x.id):(t.kind==='images'||t.kind==='sources'?[t.data.id]:(t.kind==='characters'?(t.data.musicTracks||[]).map(m=>m.id):[]));if(t.kind==='project')for(let c of(t.data.items?.characters||[]))ids.push(...(c.musicTracks||[]).map(m=>m.id));for(let id of ids)await delFile(id)}db.trash=[];persist();renderTrash()}
function pdfMetaRows(kind,x){
  const rows=[]; const add=(k,v)=>{if(v!==undefined&&v!==null&&String(v).trim()!=='')rows.push([k,String(v)])};
  if(kind==='settings'){add('분류',x.type||'설정');add('상태',x.status||'아이디어');add('태그',x.tags||'없음');add('음악',(x.musicTracks||[]).map(m=>m.name).join(', ')||'없음')}
  else if(kind==='relations'){
    add('유형',x.kind==='소속'?'조직도':(x.kind||'관계'));add('상태',x.status||'아이디어');
    if(x.kind==='소속')add('계급 구조',(x.ranks||[]).map((r,i)=>r+(x.rankNotes?.[i]?' — '+x.rankNotes[i]:'')).join(' > ')||'없음');
    else add('대상',x.members||x.people||'없음');
    add('태그',x.tags||'없음');
  } else if(kind==='stories'){add('상태',x.status||'아이디어');add('태그',x.tags||'없음');add('글자 수',(x.body||'').length.toLocaleString()+'자')}
  else if(kind==='timeline'){add('시기',x.dateLabel||'미정');add('순서',x.order||'');add('상태',x.status||'아이디어');add('태그',x.tags||'없음')}
  else if(kind==='sources'){add('파일명',x.fileName||'PDF');add('태그',x.tags||'없음')}
  else if(kind==='images'){add('태그',x.tags||'없음');add('메모',x.note||'없음')}
  return rows;
}
function pdfBodyHtml(x){
  let body=x.bodyHtml?sanitizeRich(x.bodyHtml):esc(x.body||'').replace(/\n/g,'<br>');
  const plain=String(body).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').trim();
  if(!plain)body='<span class="emptyText">작성된 내용이 없습니다.</span>';
  return body;
}
function characterRelationHtml(x){
  const rows=(x.relationIds||[]).map(id=>{
    const r=getDoc('relations',id); if(!r)return '';
    let line=esc(r.title||'관계');
    if(x.relationRanks?.[id])line+=` <span class="relationBadge">${esc(x.relationRanks[id])}</span>`;
    if(x.relationNotes?.[id])line+=` <span class="relationNote">— ${esc(x.relationNotes[id])}</span>`;
    return `<div class="relationLine">${line}</div>`;
  }).filter(Boolean);
  return rows.length?rows.join(''):'<span class="emptyText">없음</span>';
}
function pdfMetaTableHtml(kind,x){
  if(kind==='characters'){
    const pairs=[
      ['상태',x.status||'아이디어'],['나이',x.age||'미정'],
      ['역할/직업',x.role||'미정'],['종족',getDoc('settings',x.raceId)?.title||'미지정'],
      ['지역',getDoc('settings',x.regionId)?.title||'미지정'],['태그',x.tags||'없음'],
      ['캐릭터송',(x.musicTracks||[]).map(m=>m.name).join(', ')||'없음'],['관계/소속',characterRelationHtml(x)]
    ];
    let rows='';
    for(let i=0;i<pairs.length;i+=2){
      const a=pairs[i],b=pairs[i+1];
      rows+=`<tr><th>${esc(a[0])}</th><td>${a[0]==='관계/소속'?a[1]:esc(a[1])}</td><th>${esc(b[0])}</th><td>${b[0]==='관계/소속'?b[1]:esc(b[1])}</td></tr>`;
    }
    return `<table class="metaTable metaTableWide characterMetaTable"><tbody>${rows}</tbody></table>`;
  }
  const rows=pdfMetaRows(kind,x);
  return rows.length?`<table class="metaTable"><tbody>${rows.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`:'';
}
async function pdfCharacterHero(x,entryMode=false){
  const portrait=x.portraitId?await getFile(x.portraitId):'';
  const titleTag=entryMode?'h3':'h1';
  const eyebrowCls=entryMode?'entryEyebrow':'pdfEyebrow';
  const alias=x.alias||'별칭 없음';
  return `<section class="pdfHero ${entryMode?'pdfHeroEntry':''}"><div class="pdfHeroMedia"><div class="portraitBox">${portrait?`<img src="${portrait}" alt="${esc(x.name||'캐릭터')} 초상">`:'<div class="portraitPlaceholder">이미지 없음</div>'}</div></div><div class="pdfHeroMain"><div class="${eyebrowCls}">캐릭터</div><${titleTag}>${esc(x.name||'이름 없음')}</${titleTag}><div class="heroAlias">${esc(alias)}</div>${pdfMetaTableHtml('characters',x)}</div></section>`;
}
async function pdfDocumentHtml(kind,x){
  const title=titleOf(kind,x);
  const body=pdfBodyHtml(x);
  if(kind==='characters'){
    const hero=await pdfCharacterHero(x,false);
    return `<article class="pdfDoc">${hero}<section class="pdfBody"><h2>내용</h2><div class="bodyText">${body}</div></section></article>`;
  }
  const table=pdfMetaTableHtml(kind,x);
  return `<article class="pdfDoc"><header class="pdfHead"><div class="pdfEyebrow">${esc(kindLabel(kind))}</div><h1>${esc(title)}</h1></header>${table}<section class="pdfBody"><h2>내용</h2><div class="bodyText">${body}</div></section></article>`;
}
async function projectEntryHtml(kind,x){
  const body=pdfBodyHtml(x);
  if(kind==='characters'){
    return `<div class="projectEntry isCharacter">${await pdfCharacterHero(x,true)}<section class="entryBody"><h4>내용</h4><div class="bodyText">${body}</div></section></div>`;
  }
  return `<div class="projectEntry ${kind==='stories'?'storyEntry':''}"><div class="entryEyebrow">${esc(kindLabel(kind))}</div><h3>${esc(titleOf(kind,x))}</h3>${pdfMetaTableHtml(kind,x)}<section class="entryBody"><h4>내용</h4><div class="bodyText">${body}</div></section></div>`;
}
function itemText(kind,x){if(kind==='settings')return`${x.title}\n분류: ${x.type}\n상태: ${x.status||''}\n태그: ${x.tags||''}\n\n${x.body||''}`;if(kind==='characters'){let race=getDoc('settings',x.raceId)?.title||'',region=getDoc('settings',x.regionId)?.title||'',rel=(x.relationIds||[]).map(id=>{let r=getDoc('relations',id);return r?`${r.title}${x.relationRanks?.[id]?' ['+x.relationRanks[id]+']':''}${x.relationNotes?.[id]?' — '+x.relationNotes[id]:''}`:''}).filter(Boolean).join('\n');return`${x.name}${x.alias?' / '+x.alias:''}\n상태: ${x.status||''}\n나이: ${x.age||''}\n역할: ${x.role||''}\n종족: ${race}\n지역: ${region}\n태그: ${x.tags||''}\n캐릭터송: ${(x.musicTracks||[]).map(m=>m.name).join(', ')||'없음'}\n관계/소속:\n${rel||'없음'}\n\n${x.body||''}`};if(kind==='relations')return`${x.title}\n유형: ${x.kind==='소속'?'조직도':x.kind}\n상태: ${x.status||''}\n${x.kind==='소속'?'계급: '+(x.ranks||[]).map((r,i)=>r+(x.rankNotes?.[i]?' — '+x.rankNotes[i]:'')).join(' > '):'대상: '+(x.members||x.people||'')}\n태그: ${x.tags||''}\n\n${x.body||''}`;if(kind==='stories')return`${x.title}\n상태: ${x.status||''}\n태그: ${x.tags||''}\n\n${x.body||''}`;if(kind==='timeline')return`${x.title}\n시기: ${x.dateLabel||''}\n순서: ${x.order||''}\n상태: ${x.status||''}\n태그: ${x.tags||''}\n\n${x.body||''}`;return''}
async function exportItem(kind,id,format){
  let x=getDoc(kind,id);if(!x)return;let title=titleOf(kind,x),txt=itemText(kind,x);
  if(format==='txt'){return appSaveBlob(new Blob(['\ufeff'+txt],{type:'text/plain;charset=utf-8'}),title+'.txt')}
  let html=await pdfDocumentHtml(kind,x);
  if(kind==='stories'){
    let imgs='';
    for(let iid of(x.imageIds||[])){let d=await getFile(iid);if(d)imgs+=`<div class="pdfImage"><img src="${d}"></div>`}
    if(imgs)html+=`<section class="pdfSubsection"><h2>첨부 이미지</h2>${imgs}</section>`;
  }
  if(appPrint(title,html))return;let w=window.open('','_blank');if(!w)return alert('팝업을 허용해 주세요.');w.document.write(`<!doctype html><meta charset="utf-8"><style>${pdfPrintCss()}</style>${html}<script>setTimeout(()=>print(),500)<\/script>`);w.document.close()
}
function renderExportProjects(){exportProject.innerHTML=db.projects.length?db.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join(''):'<option value="">프로젝트가 없습니다</option>'}function buildTxt(pid){let p=db.projects.find(x=>x.id===pid);if(!p)return'';let out=`${p.name}\n${'='.repeat(Math.max(4,p.name.length))}\n\n${p.desc||''}\n\n`;for(let[k,label]of[['settings','설정'],['characters','캐릭터'],['relations','관계도'],['stories','썰 / 장문'],['serials','연재본 편집'],['timeline','타임라인']]){let arr=db[k].filter(x=>x.project===pid);out+=`[${label} ${arr.length}개]\n\n`;arr.forEach((x,i)=>out+=`${i+1}. ${itemText(k,x)}\n\n`)}let imgs=db.images.filter(x=>x.project===pid),src=db.sources.filter(x=>x.project===pid);out+=`[이미지 ${imgs.length}개]\n${imgs.map(x=>'- '+x.title).join('\n')}\n\n[소스파일 ${src.length}개]\n${src.map(x=>'- '+x.title+' / '+(x.fileName||'PDF')).join('\n')}\n`;return out}
function exportTxt(){let pid=v('exportProject'),p=db.projects.find(x=>x.id===pid);if(!p)return alert('프로젝트가 없습니다.');appSaveBlob(new Blob(['\ufeff'+buildTxt(pid)],{type:'text/plain;charset=utf-8'}),p.name+'.txt')}
async function projectPdfHtml(pid){
  const p=db.projects.find(x=>x.id===pid); if(!p)return'';
  let html=`<article class="pdfDoc"><header class="pdfHead"><div class="pdfEyebrow">프로젝트</div><h1>${esc(p.name)}</h1>${p.desc?`<p class="lead">${esc(p.desc)}</p>`:''}</header>`;
  for(const [k,label] of [['settings','설정'],['characters','캐릭터'],['relations','관계도'],['stories','썰 / 장문'],['serials','연재본 편집'],['timeline','타임라인']]){
    const arr=db[k].filter(x=>x.project===pid); if(!arr.length)continue;
    html+=`<section class="projectSection"><h2>${label}<span>${arr.length}</span></h2>`;
    for(const x of arr) html+=await projectEntryHtml(k,x);
    html+='</section>';
  }
  const images=db.images.filter(x=>x.project===pid);
  if(images.length){
    html+=`<section class="projectSection"><h2>이미지<span>${images.length}</span></h2>`;
    for(const x of images){
      const d=await getFile(x.id);
      html+=`<div class="projectEntry imageEntry"><div class="projectImageMedia">${d?`<img src="${d}" alt="${esc(x.title||'이미지')}">`:'<div class="imagePlaceholder">이미지 없음</div>'}</div><div class="projectImageInfo"><div class="entryEyebrow">이미지</div><h3>${esc(x.title||'이미지')}</h3><table class="metaTable imageMetaTable"><tbody><tr><th>태그</th><td>${esc(x.tags||'없음')}</td></tr><tr><th>메모</th><td>${x.note?esc(x.note).replace(/\n/g,'<br>'):'없음'}</td></tr></tbody></table></div></div>`;
    }
    html+='</section>';
  }
  const sources=db.sources.filter(x=>x.project===pid);
  if(sources.length){
    html+=`<section class="projectSection"><h2>소스파일<span>${sources.length}</span></h2>`;
    for(const x of sources){
      html+=`<div class="projectEntry"><div class="entryEyebrow">소스파일</div><h3>${esc(x.title||'소스파일')}</h3>${pdfMetaTableHtml('sources',x)}<section class="entryBody"><h4>메모</h4><div class="bodyText">${x.note?esc(x.note).replace(/\n/g,'<br>'):'<span class="emptyText">작성된 메모가 없습니다.</span>'}</div></section></div>`;
    }
    html+='</section>';
  }
  return html+'</article>';
}
function pdfPrintCss(){return `@page{margin:14mm}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:820px;margin:0 auto;color:#202027;font-size:10.8pt;line-height:1.62;background:#fff}img{max-width:100%}.pdfDoc{width:100%}.pdfHead{padding:0 0 16px;border-bottom:2px solid #282735;margin-bottom:18px}.pdfEyebrow,.entryEyebrow{font-size:8.6pt;font-weight:780;letter-spacing:.08em;color:#777582;margin-bottom:4px}.pdfHead h1{font-size:22pt;line-height:1.22;margin:0;font-weight:850;letter-spacing:-.03em}.lead{margin:9px 0 0;color:#5f5d68}.pdfHero{display:table;width:100%;table-layout:fixed;margin:0 0 16px;padding:0 0 14px;border-bottom:2px solid #282735}.pdfHeroMedia,.pdfHeroMain{display:table-cell;vertical-align:top}.pdfHeroMedia{vertical-align:middle}.pdfHeroMedia{width:144px;padding-right:18px}.portraitBox{width:120px;height:120px;border:1px solid #d7d5dd;border-radius:12px;overflow:hidden;background:#f7f6f8;display:flex;align-items:center;justify-content:center}.portraitBox img{width:100%;height:100%;object-fit:contain;display:block;background:#fff}.portraitPlaceholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;color:#8c8895;font-size:9.4pt;line-height:1.45}.pdfHeroMain h1{font-size:22pt;line-height:1.2;margin:0;font-weight:850;letter-spacing:-.03em}.pdfHeroEntry{padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid #d9d7df}.pdfHeroEntry .pdfHeroMedia{width:118px;padding-right:14px}.pdfHeroEntry .portraitBox{width:100px;height:100px}.pdfHeroEntry h3{font-size:15pt;line-height:1.28;margin:0;font-weight:820;letter-spacing:-.02em}.heroAlias{margin-top:4px;font-size:11pt;color:#4f4c56;font-weight:680}.heroMetaLine{margin-top:7px;color:#66636d;font-size:9.8pt}.metaTable{width:100%;border-collapse:collapse;margin:0 0 18px;border-top:1px solid #d9d7df;border-left:1px solid #e2e0e6}.metaTable th,.metaTable td{padding:8px 10px;border-bottom:1px solid #e2e0e6;border-right:1px solid #e2e0e6;vertical-align:top}.metaTable th{width:22%;background:#f3f2f5;text-align:left;font-weight:760;color:#55535e}.metaTable td{background:#fff}.metaTableWide th{width:14%}.metaTableWide td{width:36%}.relationLine+.relationLine{margin-top:4px}.relationBadge{display:inline-block;padding:1px 6px;border:1px solid #d9d7df;border-radius:999px;font-size:8.8pt;color:#55535e;background:#f7f6f8}.relationNote{color:#5f5c66}.pdfBody h2,.pdfSubsection h2,.projectSection>h2,.entryBody h4{font-size:13.2pt;margin:0 0 9px;padding-bottom:6px;border-bottom:1px solid #d8d6dc}.entryBody h4{font-size:11pt;margin-top:0}.bodyText{white-space:normal;word-break:break-word;color:#2c2b31}.emptyText{color:#888}.pdfImage img{max-width:100%;max-height:520px;object-fit:contain;margin:12px 0;border:1px solid #eceaf0;border-radius:8px;background:#fff}.projectSection{margin:24px 0}.projectSection>h2{display:flex;align-items:baseline;gap:8px}.projectSection>h2 span{font-size:9pt;color:#777}.projectEntry{break-inside:avoid;margin:0 0 16px;padding:14px;border:1px solid #e0dee4;border-radius:10px;background:#fff}.projectEntry.storyEntry{break-inside:auto;page-break-inside:auto}.projectEntry.storyEntry .entryBody,.projectEntry.storyEntry .bodyText{break-inside:auto;page-break-inside:auto}.projectEntry h3{font-size:14pt;line-height:1.3;margin:0 0 10px;font-weight:800;letter-spacing:-.02em}.projectEntry.isCharacter h3{margin-bottom:0}.projectEntry .metaTable{margin-bottom:14px}.pdfHeroMain .characterMetaTable{margin:10px 0 0;font-size:9pt}.pdfHeroMain .characterMetaTable th,.pdfHeroMain .characterMetaTable td{padding:5px 7px}.pdfHeroMain .characterMetaTable th{width:15%;white-space:nowrap}.pdfHeroMain .characterMetaTable td{width:35%}.imageEntry{display:table;width:100%;table-layout:fixed;padding:12px}.projectImageMedia,.projectImageInfo{display:table-cell;vertical-align:top}.projectImageMedia{width:172px;padding-right:16px}.projectImageMedia img{display:block;width:156px;height:156px;object-fit:contain;border:1px solid #e1dfe5;border-radius:8px;background:#f8f7f9}.imagePlaceholder{width:156px;height:156px;display:flex;align-items:center;justify-content:center;border:1px solid #e1dfe5;border-radius:8px;background:#f8f7f9;color:#888;font-size:9pt}.projectImageInfo h3{margin-bottom:10px}.imageMetaTable{margin:0!important;font-size:9.5pt}.imageMetaTable th{width:22%}.entryBody{margin-top:8px}.pdfSubsection{margin-top:18px}`}
async function exportPdf(){let pid=v('exportProject'),p=db.projects.find(x=>x.id===pid);if(!p)return alert('프로젝트가 없습니다.');let html=await projectPdfHtml(pid);if(appPrint(p.name,html))return;let w=window.open('','_blank');if(!w)return alert('팝업을 허용해 주세요.');w.document.write(`<!doctype html><meta charset="utf-8"><style>${pdfPrintCss()}</style>${html}<script>setTimeout(()=>print(),600)<\/script>`);w.document.close()}
async function exportData(){let b=JSON.parse(JSON.stringify(db));b._fileData={};for(let x of[...db.images,...db.sources]){let d=await getFile(x.id);if(d)b._fileData[x.id]=d}for(let c of db.characters)for(let m of(c.musicTracks||[])){let d=await getFile(m.id);if(d)b._fileData[m.id]=d}appSaveBlob(new Blob([JSON.stringify(b)],{type:'application/json'}),'창작소_내손안에이야기_백업.json')}
function importData(e){let f=e.target.files?.[0];if(!f)return;let r=new FileReader();r.onload=async()=>{try{let x=JSON.parse(r.result),files=x._fileData||x._imageData||{};delete x._fileData;delete x._imageData;db=normalize(x);await clearFiles();for(let[id,d]of Object.entries(files))await putFile(id,d);persist();renderAll();alert('복원이 완료되었습니다.')}catch{alert('올바른 백업 파일이 아닙니다.')}};r.readAsText(f);e.target.value=''}function restoreAutoBackup(){try{let x=localStorage.getItem(AUTO_KEY);if(!x)return alert('자동 백업 슬롯이 비어 있습니다.');if(!confirm('자동 백업 슬롯의 상태로 복원하시겠습니까?'))return;db=normalize(JSON.parse(x));localStorage.setItem(KEY,JSON.stringify(db));renderAll();alert('자동 백업 슬롯을 복원했습니다.')}catch{alert('자동 백업 복원에 실패했습니다.')}}async function resetAll(){if(!confirm('모든 데이터를 삭제하시겠습니까?'))return;db=emptyDB();currentProjectId=null;localStorage.removeItem(AUTO_KEY);persist();await clearFiles();closeProject();renderAll()}
async function appSaveBlob(blob,name){if(window.Android){let r=new FileReader();r.onload=()=>Android.saveDataUrl(safeFileName(name),r.result);r.readAsDataURL(blob);return}let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=safeFileName(name);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),700)}
function appSaveDataUrl(data,name){if(window.Android){Android.saveDataUrl(safeFileName(name),data);return}let a=document.createElement('a');a.href=data;a.download=safeFileName(name);a.click()}
function appPrint(title,html){if(window.Android){Android.printHtml(title,`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${pdfPrintCss()}
/* ===== 그림일기 ===== */
.pictureDiaryList{display:grid;gap:12px}.pictureDiaryCard{display:grid;grid-template-columns:112px minmax(0,1fr);gap:14px;align-items:start;padding:14px;border:1px solid var(--line);border-radius:15px;background:var(--card);cursor:pointer}.pictureDiaryCard img{width:112px;height:112px;object-fit:cover;border-radius:12px;border:1px solid var(--line);background:var(--soft)}.pictureDiaryDate{font-size:12px;color:var(--theme);font-weight:780}.pictureDiaryTitle{font-size:16px;font-weight:800;margin-top:3px}.pictureDiaryBody{margin-top:7px;color:color-mix(in srgb,var(--ink) 78%,var(--muted));white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.pictureDiaryPreview{display:flex;justify-content:center;align-items:center;min-height:130px;border:1px dashed var(--line);border-radius:13px;overflow:hidden;background:color-mix(in srgb,var(--card) 90%,var(--soft))}.pictureDiaryPreview img{max-width:100%;max-height:280px;object-fit:contain;display:block}@media(max-width:640px){.pictureDiaryCard{grid-template-columns:88px minmax(0,1fr);gap:11px}.pictureDiaryCard img{width:88px;height:88px}}

/* ===== 고급 프로젝트 짧은 동영상 ===== */
.videoList{display:grid;gap:12px}.videoCard{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 15px;border:1px solid var(--line);border-radius:15px;background:var(--card);cursor:pointer}.videoIcon{width:64px;height:64px;display:grid;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--theme) 9%,var(--soft));font-size:28px}.videoInfo{min-width:0}.videoTitle{font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.videoMeta{font-size:12px;color:var(--muted);margin-top:4px}.videoPlayer{width:100%;max-height:62vh;border-radius:14px;border:1px solid var(--line);background:#000}.videoPreviewBox{display:grid;gap:8px}.videoLimitNote{font-size:12px;color:var(--muted);line-height:1.6}.videoFav{align-self:start}.videoFav .favBtn{width:42px;height:42px}.videoFileName{word-break:break-all}
@media(max-width:640px){.videoCard{grid-template-columns:52px minmax(0,1fr) 42px;gap:10px;padding:12px}.videoIcon{width:52px;height:52px;border-radius:12px;font-size:24px}.videoTitle{font-size:15px}.videoPlayer{max-height:52vh}}



</style>
<style id="fix15Styles">
/* ===== fix15 안정화 피드백 반영 ===== */
@font-face{font-family:'Fix15Kkubulim';src:url('file:///android_asset/fonts/BMKkubulimTTF.ttf') format('truetype'),url('fonts/BMKkubulimTTF.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap}
@font-face{font-family:'Fix15PrettyNight';src:url('file:///android_asset/fonts/Cafe24Oneprettynight-v2.0.ttf') format('truetype'),url('fonts/Cafe24Oneprettynight-v2.0.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap}
@font-face{font-family:'Fix15Nuri';src:url('file:///android_asset/fonts/HangeulNuriR.ttf') format('truetype'),url('fonts/HangeulNuriR.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap}
:root[data-mode="dark"] .projectCard{box-shadow:var(--shadow)!important;border-left-color:var(--line)!important;border-right-color:var(--line)!important;border-bottom-color:var(--line)!important;border-top:3px solid var(--pcolor,var(--theme))!important}
:root[data-mode="dark"] .projectCard:hover{box-shadow:0 10px 30px rgba(0,0,0,.14)!important;border-left-color:var(--line)!important;border-right-color:var(--line)!important;border-bottom-color:var(--line)!important;border-top-color:var(--pcolor,var(--theme))!important}
.groupManageBar{display:flex;justify-content:flex-end;gap:8px;margin:0 0 10px}.managedGroupRow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid var(--line);border-radius:12px;background:var(--card)}.managedGroupPreview{width:12px;height:12px;border-radius:50%;background:var(--theme)}
.folderColorIcon{--folder:#e2b84d;position:relative;display:inline-block;width:20px;height:15px;border-radius:3px;background:var(--folder);vertical-align:-2px;box-shadow:inset 0 -1px 0 rgba(0,0,0,.09)}.folderColorIcon:before{content:'';position:absolute;left:2px;top:-4px;width:9px;height:5px;border-radius:3px 3px 0 0;background:var(--folder)}.folderLabel{display:inline-flex;align-items:center;gap:7px}.folderColorSelect{min-width:118px}.folderRow{grid-template-columns:minmax(0,1fr) auto auto!important}.folderNameLine{display:flex;align-items:center;gap:8px;min-width:0}.storyFolderPill{display:inline-flex!important;align-items:center;gap:6px}
.storyLongEditor{height:min(52vh,480px)!important;min-height:300px!important;max-height:52vh!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;scrollbar-gutter:stable;white-space:normal}
@media(max-width:680px){.storyLongEditor{height:46vh!important;min-height:250px!important;max-height:46vh!important}.folderRow{grid-template-columns:1fr auto!important}.folderRow .folderColorSelect{grid-column:1/-1;width:100%}}
.timelineLine{position:relative;padding-left:34px!important}.timelineLine:before{left:12px!important;top:4px!important;bottom:4px!important;width:3px!important}.timelineItem{overflow:visible!important}.timelineItem:before{left:-29px!important;top:24px!important;width:14px!important;height:14px!important;background:var(--card)!important;border:4px solid var(--theme)!important;box-shadow:0 0 0 3px var(--bg)!important}.timelineItem:after{content:'';position:absolute;left:-18px;top:30px;width:18px;height:2px;background:color-mix(in srgb,var(--theme) 46%,var(--line));z-index:1}.timelineThumb{width:96px;height:76px;object-fit:cover;border-radius:11px;border:1px solid var(--line);display:block;background:var(--soft)}.timelineItem.hasTimelineImage{padding-right:126px}.timelineItem .timelineThumb{position:absolute;right:14px;top:48px}.timelineImageEditor{display:grid;gap:9px}.timelineImagePreview{min-height:70px;border:1px dashed var(--line);border-radius:12px;padding:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--card) 92%,var(--soft))}.timelineImagePreview img{max-width:100%;max-height:220px;object-fit:contain;border-radius:9px}.timelineImageActions{display:flex;gap:8px;flex-wrap:wrap}
@media(max-width:560px){.timelineItem.hasTimelineImage{padding-right:14px}.timelineItem .timelineThumb{position:static;width:100%;height:auto;max-height:190px;margin-top:9px;object-fit:contain}}
.inlineRelationBox{display:grid;gap:9px;border:1px solid var(--line);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--card) 95%,var(--soft))}
</style>

<style id="fix16Styles">
/* ===== fix16: 메모 프로젝트 단순화 / 유형 고정 / 모바일 배치 보정 ===== */
.memoProjectWrap{display:grid;gap:14px}.memoComposer{display:grid;gap:9px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
.memoComposer textarea{min-height:150px;max-height:42vh;overflow-y:auto;-webkit-overflow-scrolling:touch;resize:vertical}.memoComposer .memoSaveRow{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap}.memoComposer .memoSaveRow .meta{margin-right:auto}
.memoFilterBar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.memoFilterBar input{min-width:0}.memoListCompact{display:grid;gap:8px}.memoCardCompact{position:relative;display:grid;gap:5px;padding:12px 48px 12px 13px;border:1px solid var(--line);border-radius:14px;background:var(--card);cursor:pointer;min-width:0}.memoCardCompact.favorite{border-color:color-mix(in srgb,var(--theme) 34%,var(--line));box-shadow:inset 3px 0 0 var(--theme)}.memoCardCompact h4{margin:0;font-size:14px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.memoPreview{font-size:12.5px;color:var(--muted);line-height:1.48;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;word-break:break-word}.memoFavBtn{position:absolute!important;right:8px!important;top:7px!important}.memoTags{min-width:0}.memoTags .tag{margin-top:2px}
.projectTypeLocked{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--soft);font-weight:700}.projectTypeLockNote{margin-top:-2px}
/* 모바일에서 공통 .item>.right가 static으로 바뀌면서 타임라인 제목 위 빈 줄이 생기던 문제만 되돌립니다. */
.timelineItem>.right{position:absolute!important;top:12px!important;right:12px!important;margin:0!important}.timelineItem{padding-top:14px!important}.timelineItem>b:first-of-type{display:inline-block;max-width:calc(100% - 48px);vertical-align:top}.timelineItem:before{top:26px!important}.timelineItem:after{top:32px!important}
/* 모달 안에서는 저장/취소 버튼 영역과 겹치지 않도록 상단 이동 버튼을 한 단계 위로 띄웁니다. */
#scrollTopBtn.modalMode{bottom:92px!important}.detailFooter,.stack>.right:last-child{scroll-margin-bottom:96px}
@media(max-width:640px){.memoFilterBar{grid-template-columns:1fr}.memoComposer{padding:12px}.memoComposer textarea{min-height:135px}.timelineItem>.right{top:10px!important;right:10px!important}#scrollTopBtn.modalMode{bottom:104px!important}}
</style>

<style id="fix17Styles">
#scrollTopBtn.modalMode{top:88px!important;bottom:auto!important;right:18px!important}
@media(max-width:640px){#scrollTopBtn.modalMode{top:82px!important;bottom:auto!important;right:14px!important}}
.bulkSelectable{position:relative;-webkit-touch-callout:none}.bulkSelectable.bulkSelected{outline:2px solid var(--theme);outline-offset:-2px}.bulkSelectable.bulkSelected:after{content:'✓';position:absolute;left:10px;top:10px;z-index:8;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--theme);color:var(--themeInk);font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,.2)}
#bulkSelectBar{position:fixed;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:120;display:none;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:var(--card);box-shadow:0 10px 30px rgba(0,0,0,.28)}#bulkSelectBar.show{display:flex}#bulkSelectBar .right{display:flex;gap:8px;flex-wrap:wrap}.bulkSelecting #scrollTopBtn{display:none!important}
@media(max-width:640px){#bulkSelectBar{left:8px;right:8px;padding:10px;align-items:flex-start}#bulkSelectBar .meta{font-size:11px}}


/* ===== FIX21: font preview + story export list visibility ===== */
/* The three bundled fonts are requested from https://creative.local/fonts/ and
   served by MainActivity.shouldInterceptRequest, keeping the existing storage origin. */
@font-face{font-family:'Fix21Kkubulim';src:url('/fonts/BMKkubulimTTF.ttf') format('truetype');font-style:normal;font-weight:400;font-display:block}
@font-face{font-family:'Fix21PrettyNight';src:url('/fonts/Cafe24Oneprettynight-v2.0.ttf') format('truetype');font-style:normal;font-weight:400;font-display:block}
@font-face{font-family:'Fix21Nuri';src:url('/fonts/HangeulNuriR.ttf') format('truetype');font-style:normal;font-weight:400;font-display:block}
.fontPreviewKkubulim{font-family:'Fix21Kkubulim',sans-serif!important}
.fontPreviewPretty{font-family:'Fix21PrettyNight',cursive!important}
.fontPreviewNuri{font-family:'Fix21Nuri',sans-serif!important}
.selectExportSubgroupStatic{border:1px solid var(--line);border-radius:13px;overflow:hidden;background:var(--card);margin:8px 0}
.selectExportSubgroupStatic .selectExportSubhead{padding:10px 12px;font-weight:760;background:var(--soft);display:flex;justify-content:space-between;gap:8px}
.selectExportSubgroupStatic .selectExportRows{padding:5px 9px 9px}
</style>
</head><body>${html}</body></html>`);return true}return false}
function handleNativeBack(){let m=document.getElementById('modal');if(m&&!m.classList.contains('hidden')){closeModal();return'handled'}let pv=document.getElementById('projectView');if(pv&&!pv.classList.contains('hidden')){closeProject();return'handled'}return'exit'}
function renderProjectAll(){renderSettings();renderCharacters();renderRelations();renderImages();renderSources();renderStories();renderSerials();renderTimeline();renderRecent()}function renderAll(){renderProjects();renderExportProjects();renderTrash();if(currentProjectId)renderProjectAll();setTimeout(enhanceAllSelects,0)}

function syncVisualViewport(){
  const vv=window.visualViewport;
  const h=vv?vv.height:window.innerHeight;
  document.documentElement.style.setProperty('--visual-viewport-height',Math.max(240,Math.round(h))+'px');
}
function keepEditorCaretVisible(target){
  if(!target||!target.isContentEditable)return;
  requestAnimationFrame(()=>{
    try{
      const sel=window.getSelection();
      if(!sel||!sel.rangeCount)return;
      const r=sel.getRangeAt(0).cloneRange();
      r.collapse(false);
      const rect=r.getBoundingClientRect();
      const vv=window.visualViewport;
      const top=(vv?vv.offsetTop:0)+76;
      const bottom=(vv?vv.offsetTop+vv.height:window.innerHeight)-90;
      if(rect.bottom>bottom) target.scrollBy({top:rect.bottom-bottom+48,behavior:'smooth'});
      else if(rect.top<top) target.scrollBy({top:rect.top-top-32,behavior:'smooth'});
    }catch(e){}
  });
}
syncVisualViewport();
if(window.visualViewport){
  visualViewport.addEventListener('resize',syncVisualViewport);
  visualViewport.addEventListener('scroll',syncVisualViewport);
}
window.addEventListener('resize',syncVisualViewport);
document.addEventListener('input',e=>{if(e.target&&e.target.isContentEditable)keepEditorCaretVisible(e.target)},true);
document.addEventListener('keyup',e=>{if(e.target&&e.target.isContentEditable)keepEditorCaretVisible(e.target)},true);
document.addEventListener('focusin',e=>{if(e.target&&e.target.isContentEditable)setTimeout(()=>keepEditorCaretVisible(e.target),180)},true);

// ===== 창작소 1.1 동작/레이아웃 정리 =====
function updateAppTitle(){
  const h=document.getElementById('appTitle'); if(!h)return;
  h.textContent='창작소 : 여러 이야기를 한 손에';
}
const __openProjectBase=openProject;
openProject=function(id){__openProjectBase(id);updateAppTitle();};
const __closeProjectBase=closeProject;
closeProject=function(){__closeProjectBase();updateAppTitle();};
// Smooth project navigation
const __motionOpenProjectBase=openProject;
openProject=function(id){let home=document.getElementById('projectHome');if(home&&!home.classList.contains('hidden'))home.classList.add('motion-page-exit');setTimeout(()=>{home?.classList.remove('motion-page-exit');__motionOpenProjectBase(id);let view=document.getElementById('projectView');restartMotion(view,'motion-page-enter');setTimeout(()=>animateStagger(view),40)},150)};
const __motionCloseProjectBase=closeProject;
closeProject=function(){let view=document.getElementById('projectView');if(view&&!view.classList.contains('hidden'))view.classList.add('motion-page-exit');setTimeout(()=>{view?.classList.remove('motion-page-exit');__motionCloseProjectBase();let home=document.getElementById('projectHome');restartMotion(home,'motion-page-enter');setTimeout(()=>animateStagger(home),40)},150)};


function openAppSelect(sel){
  document.querySelector('.appSelectOverlay')?.remove();
  const ov=document.createElement('div'); ov.className='appSelectOverlay';
  const panel=document.createElement('div'); panel.className='appSelectPanel';
  [...sel.options].forEach(o=>{const b=document.createElement('button');b.type='button';b.className='appSelectOption'+(o.value===sel.value?' selected':'');b.textContent=o.textContent;b.onclick=()=>{sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));syncAppSelect(sel);ov.classList.remove('motion-open');setTimeout(()=>ov.remove(),160);};panel.appendChild(b)});
  ov.appendChild(panel); ov.onclick=e=>{if(e.target!==ov)return;ov.classList.remove('motion-open');setTimeout(()=>ov.remove(),160)}; document.body.appendChild(ov); requestAnimationFrame(()=>requestAnimationFrame(()=>ov.classList.add('motion-open')));
}
function syncAppSelect(sel){
  if(!sel)return; sel.classList.add('appSelectHidden');
  let b=sel.nextElementSibling;
  if(!b||!b.classList.contains('appSelectButton')){b=document.createElement('button');b.type='button';b.className='appSelectButton';sel.insertAdjacentElement('afterend',b);b.onclick=()=>openAppSelect(sel)}
  b.textContent=sel.options[sel.selectedIndex]?.textContent||'선택';
}
function enhanceAllSelects(root=document){root.querySelectorAll('select').forEach(syncAppSelect)}
function enhanceListSelects(){enhanceAllSelects(document)}
const __listDataBase=listData;
listData=function(kind,fields){const out=__listDataBase(kind,fields);syncAppSelect(document.getElementById(kind+'Tag'));syncAppSelect(document.getElementById(kind+'Sort'));return out};

function tuneEditFooter(){
  const foot=document.querySelector('#modalCard .right:last-child'); if(!foot)return;
  [...foot.querySelectorAll('button')].forEach(b=>{const t=b.textContent.trim(); if(!b.classList.contains('primary')&&!b.classList.contains('danger'))b.remove()});
}
function editDoc(kind,id){
  const x=getDoc(kind,id); if(!x)return;
  const fn={settings:newSetting,characters:newCharacter,relations:newRelation,images:newImage,sources:newSource,stories:newStory,timeline:newTimeline}[kind];
  if(!fn)return;
  closeModal();
  setTimeout(()=>{Promise.resolve(fn(x)).then(()=>setTimeout(tuneEditFooter,0))},200);
}
async function detailMusic(tracks=[]){let rows='';for(const m of tracks){const d=await getFile(m.id);rows+=`<div class="musicRow"><div><b>${esc(m.name)}</b>${d?`<audio controls preload="metadata" src="${d}"></audio>`:'<div class="meta">파일을 불러올 수 없습니다.</div>'}</div></div>`}return rows}
function detailLinks(ids=[]){const h=linkedChips(ids);return h?`<div class="detailSection"><div class="detailLabel">연결 문서</div><div class="chips">${h}</div></div>`:''}
async function viewDoc(kind,id){
  const x=getDoc(kind,id); if(!x)return alert('문서를 찾을 수 없습니다.'); trackView(kind,id);
  let head=esc(titleOf(kind,x)),meta='',extra='',body=x.bodyHtml?sanitizeRich(x.bodyHtml):esc(x.body||'').replace(/\n/g,'<br>'),media='';
  if(kind==='settings'){meta=`${esc(x.type||'설정')} · ${esc(x.status||'아이디어')}`;if((x.musicTracks||[]).length)extra+=`<div class="detailSection"><div class="detailLabel">음악</div><div class="musicList">${await detailMusic(x.musicTracks)}</div></div>`}
  if(kind==='characters'){
    const race=getDoc('settings',x.raceId)?.title||'미지정',region=getDoc('settings',x.regionId)?.title||'미지정';meta=`${esc(x.age||'나이 미정')} · ${esc(x.role||'역할 미정')} · ${esc(x.status||'아이디어')}`;
    if(x.portraitId){let d=await getFile(x.portraitId);if(d)media=`<img class="detailPortrait" src="${d}">`}
    extra+=`<div class="detailSection"><div class="detailLabel">기본 정보</div><div class="chips"><span class="pill">종족 · ${esc(race)}</span><span class="pill">지역 · ${esc(region)}</span>${x.alias?`<span class="pill">별칭 · ${esc(x.alias)}</span>`:''}</div></div>`;
    const rels=(x.relationIds||[]).map(rid=>{let r=getDoc('relations',rid);return r?`<div class="linkedBox"><b>${esc(r.title)}${x.relationRanks?.[rid]?` · ${esc(x.relationRanks[rid])}`:''}</b>${x.relationNotes?.[rid]?`<div class="meta">${esc(x.relationNotes[rid])}</div>`:''}</div>`:''}).join('');if(rels)extra+=`<div class="detailSection"><div class="detailLabel">관계 / 소속</div><div class="stack">${rels}</div></div>`;
    if((x.musicTracks||[]).length)extra+=`<div class="detailSection"><div class="detailLabel">캐릭터송</div><div class="musicList">${await detailMusic(x.musicTracks)}</div></div>`;
  }
  if(kind==='relations'){meta=`${x.kind==='소속'?'조직도':esc(x.kind||'관계')} · ${esc(x.status||'아이디어')}`;extra+=`<div class="detailSection"><div class="detailLabel">구조</div>${relationViz(x)}</div>`}
  if(kind==='stories'){meta=`${esc(x.status||'아이디어')} · ${(x.body||'').length.toLocaleString()}자`;let imgs=[];for(const iid of(x.imageIds||[])){let d=await getFile(iid);if(d)imgs.push(`<img src="${d}">`)}if(imgs.length)extra+=`<div class="detailSection"><div class="detailLabel">이미지</div><div class="detailImages">${imgs.join('')}</div></div>`}
  if(kind==='timeline')meta=`${esc(x.dateLabel||'시기 미정')} · ${esc(x.status||'아이디어')}`;
  if(kind==='images'){meta=esc(x.tags||'이미지');let d=await getFile(x.id);body=esc(x.note||'');if(d)extra+=`<div class="detailSection"><div class="detailImages singleImage"><img src="${d}"></div></div>`}
  if(kind==='sources'){meta=esc(x.fileName||'PDF');body=esc(x.note||'');let d=await getFile(x.id);if(d)extra+=`<div class="detailSection">${nativePdfPreview(d,x.fileName||'PDF')}</div>`}
  const tagsHtml=x.tags?`<div class="chips">${tags(x.tags)}</div>`:'';
  const exportable=['settings','characters','relations','stories','timeline'].includes(kind);
  openModal(`<div class="stack"><div class="detailHead"><div style="min-width:0"><div class="detailTitle">${head}</div><div class="detailMeta">${meta}</div></div>${media}</div>${tagsHtml}<div class="detailSection"><div class="detailLabel">내용</div><div class="detailBody">${body}</div></div>${extra}${detailLinks(x.linkedIds)}<div class="detailFooter">${exportable?`<button onclick="exportItem('${kind}','${id}','pdf')">PDF</button><button onclick="exportItem('${kind}','${id}','txt')">TXT</button>`:'<span></span><span></span>'}<button onclick="closeModal()">닫기</button><button class="primary" onclick="editDoc('${kind}','${id}')">수정</button></div></div>`)
}
openDoc=function(k,id){let x=getDoc(k,id);if(!x)return alert('연결된 문서를 찾을 수 없습니다.');currentProjectId=x.project;applyTheme(currentTheme());updateAppTitle();viewDoc(k,id)};

function itemTop(title,status,meta,kind,x,media=''){return `<div class="itemTop"><div class="itemTitleBlock"><div class="itemTitleLine"><span class="itemTitle">${esc(title)}</span>${status?`<span class="status">${esc(status)}</span>`:''}</div>${meta?`<div class="meta itemMeta">${meta}</div>`:''}</div><div class="itemActions">${media}${favButton(kind,x)}</div></div>`}
renderSettings=function(){let a=listData('settings',['title','type','tags','body','status']);settingsList.innerHTML=a.length?a.map(x=>`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('settings','${x.id}')">${itemTop(x.title,x.status||'아이디어',`${esc(x.type)} · ${fmt(x.updated)}`,'settings',x)}<div class="itemBody">${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div>${(x.musicTracks||[]).length?`<div class="meta">🎵 음악 ${(x.musicTracks||[]).length}곡</div>`:''}<div class="snippet">${esc(x.body||'내용 없음')}</div></div></div>`).join(''):'<div class="empty">등록된 설정 문서가 없습니다.</div>'};
renderCharacters=async function(){let a=listData('characters',['name','alias','role','tags','body','status']),blocks=[];for(let c of a){let portrait=c.portraitId?await getFile(c.portraitId):'',race=getDoc('settings',c.raceId)?.title,region=getDoc('settings',c.regionId)?.title,rels=(c.relationIds||[]).map(id=>{let r=getDoc('relations',id);return r?`${r.title}${c.relationRanks?.[id]?' · '+c.relationRanks[id]:''}`:''}).filter(Boolean);blocks.push(`<div class="item ${c.favorite?'favorite':''}" onclick="viewDoc('characters','${c.id}')"><div class="characterCardTop ${portrait?'':'characterCardNoImage'}">${portrait?`<img class="characterPortraitBig" src="${portrait}">`:''}<div class="characterSummary"><div class="itemTitleLine"><span class="itemTitle">${esc(c.name)}</span><span class="status">${esc(c.status||'아이디어')}</span></div><div class="meta itemMeta">${esc(c.age||'나이 미정')} · ${esc(c.role||'역할 미정')} · ${fmt(c.updated)}</div>${c.alias?`<div class="meta" style="margin-top:5px">별칭 · ${esc(c.alias)}</div>`:''}</div><div class="characterFav">${favButton('characters',c)}</div></div><div class="itemBody"><div class="chips">${race?`<span class="pill">종족 · ${esc(race)}</span>`:''}${region?`<span class="pill">지역 · ${esc(region)}</span>`:''}${(c.musicTracks||[]).length?`<span class="pill">🎵 캐릭터송 ${(c.musicTracks||[]).length}곡</span>`:''}</div>${tags(c.tags)}${rels.length?`<div class="meta">관계/소속 · ${rels.map(esc).join(' · ')}</div>`:''}<div class="chips">${linkedChips(c.linkedIds)}</div><div class="snippet">${esc(c.body||'설정 없음')}</div></div></div>`)}charactersList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">등록된 캐릭터가 없습니다.</div>'};
renderRelations=function(){let a=listData('relations',['title','members','people','tags','body','kind','status']);relationsList.innerHTML=a.length?a.map(r=>`<div class="item ${r.favorite?'favorite':''}" onclick="viewDoc('relations','${r.id}')">${itemTop(r.title,r.status||'아이디어',r.kind==='소속'?`조직도 · ${(r.ranks||[]).map(esc).join(' > ')||'계급 미지정'}`:`${esc(r.kind||'혼합')} · ${esc(r.members||r.people||'대상 미지정')}`,'relations',r)}<div class="itemBody">${tags(r.tags)}<div class="chips">${linkedChips(r.linkedIds)}</div><div class="snippet">${esc(r.body||'내용 없음')}</div></div></div>`).join(''):'<div class="empty">등록된 관계도가 없습니다.</div>'};
renderStories=async function(){let a=listData('stories',['title','tags','body','status']),blocks=[];for(let x of a){let thumbs=[];for(let iid of(x.imageIds||[]).slice(0,4)){let d=await getFile(iid);if(d)thumbs.push(`<img class="storyThumb" src="${d}">`)}blocks.push(`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('stories','${x.id}')">${itemTop(x.title,x.status||'아이디어',`${fmt(x.updated)} · ${(x.body||'').length.toLocaleString()}자`,'stories',x)}<div class="itemBody">${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div>${thumbs.length?`<div class="thumbRow">${thumbs.join('')}</div>`:''}</div></div>`)}storiesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">저장된 썰이 없습니다.</div>'};
renderTimeline=function(){let a=listData('timeline',['title','dateLabel','tags','body','status']);a=[...a].sort((x,y)=>{let ax=x.order===''||x.order==null?999999:Number(x.order),ay=y.order===''||y.order==null?999999:Number(y.order);return ax-ay||(x.updated||0)-(y.updated||0)});timelineList.innerHTML=a.length?`<div class="timelineLine">${a.map(x=>`<div class="item timelineItem ${x.favorite?'favorite':''}" onclick="viewDoc('timeline','${x.id}')">${itemTop(x.title,x.status||'아이디어',`${esc(x.dateLabel||'시기 미정')}${x.order!==''&&x.order!=null?' · 순서 '+esc(x.order):''}`,'timeline',x)}<div class="itemBody">${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div></div></div>`).join('')}</div>`:'<div class="empty">등록된 타임라인 사건이 없습니다.</div>'};
renderImages=async function(){let a=listData('images',['title','tags','note']),blocks=[];for(let x of a){let d=await getFile(x.id);blocks.push(`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('images','${x.id}')">${d?`<img class="galleryMain" src="${d}">`:''}${itemTop(x.title,'',`${fmt(x.updated)}`,'images',x)}<div class="itemBody">${tags(x.tags)}<div class="snippet">${esc(x.note||'메모 없음')}</div></div></div>`)}imagesList.className='gallery';imagesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">등록된 이미지가 없습니다.</div>'};
renderSources=function(){let a=listData('sources',['title','tags','note','fileName']);sourcesList.innerHTML=a.length?a.map(x=>`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('sources','${x.id}')">${itemTop(x.title,'',`${esc(x.fileName||'PDF')} · ${fmt(x.updated)}`,'sources',x,'<div style="font-size:28px;line-height:46px">📄</div>')}<div class="itemBody">${tags(x.tags)}<div class="snippet">${esc(x.note||'메모 없음')}</div></div></div>`).join(''):'<div class="empty">등록된 PDF 소스파일이 없습니다.</div>'};

// 설정 문서 음악
function settingMusicRowHtml(m,data){return `<div class="musicRow" data-music-id="${m.id}" data-music-name="${esc(m.name)}"><div><b>${esc(m.name)}</b>${data?`<audio controls preload="metadata" src="${data}"></audio>`:'<div class="meta">파일을 불러올 수 없습니다.</div>'}</div><div class="right"><button type="button" onclick="downloadMusic('${m.id}','${encodeURIComponent(m.name)}')">저장</button><button type="button" class="danger" onclick="removeSettingMusic('${m.id}',this)">삭제</button></div></div>`}
async function addSettingMusic(e){let files=[...(e.target.files||[])];if(!files.length)return;document.getElementById('noSettingMusic')?.remove();for(let f of files){let id='smusic_'+uid(),data=await fileToData(f),m={id,name:f.name,type:f.type||'',size:f.size||0};await putFile(id,data);window._editingSettingMusic=window._editingSettingMusic||[];window._editingSettingMusic.push(m);document.getElementById('smusicList').insertAdjacentHTML('beforeend',settingMusicRowHtml(m,data))}e.target.value=''}
async function removeSettingMusic(id,btn){if(!confirm('이 음악을 설정에서 제거하시겠습니까?'))return;await delFile(id);window._editingSettingMusic=(window._editingSettingMusic||[]).filter(m=>m.id!==id);btn.closest('.musicRow')?.remove();if(!document.querySelector('#smusicList .musicRow'))document.getElementById('smusicList').innerHTML='<div class="meta" id="noSettingMusic">등록된 음악이 없습니다.</div>'}
const __newSettingBase=newSetting;
newSetting=async function(s){let obj=typeof s==='string'?decodeObj(s):s;obj=obj||{id:uid(),title:'',type:'세계관',tags:'',body:'',status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId,musicTracks:[]};obj.musicTracks=obj.musicTracks||[];__newSettingBase(obj);window._editingSettingMusic=[...obj.musicTracks];let rows='';for(let m of obj.musicTracks){rows+=settingMusicRowHtml(m,await getFile(m.id))}let box=document.createElement('div');box.className='linkedBox';box.innerHTML=`<div class="musicSectionTitle"><b>🎵 설정 음악 / 테마곡</b><label class="btn">음악 추가<input type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac" multiple hidden onchange="addSettingMusic(event)"></label></div><div class="musicList" id="smusicList">${rows||'<div class="meta" id="noSettingMusic">등록된 음악이 없습니다.</div>'}</div>`;let link=document.querySelector('#modalCard .linkedBox');if(link)link.before(box);else document.querySelector('#modalCard .right:last-child')?.before(box);tuneEditFooter()};
saveSetting=function(id){let title=v('stitle').trim();if(!title)return alert('제목을 입력해 주세요.');let old=getDoc('settings',id)||{};upsert('settings',{...old,id,title,type:v('stype'),tags:v('stags'),body:richText('sbody'),bodyHtml:richHtml('sbody'),musicTracks:window._editingSettingMusic||old.musicTracks||[],project:currentProjectId,updated:Date.now(),...commonData(old)});window._editingSettingMusic=[];closeModal()};

// 다른 편집기 하단을 삭제/저장 중심으로 정리
const __newCharacterBase=newCharacter;newCharacter=async function(x){await __newCharacterBase(x);tuneEditFooter()};
const __newRelationBase=newRelation;newRelation=function(x){__newRelationBase(x);tuneEditFooter()};
const __newImageBase=newImage;newImage=async function(x){await __newImageBase(x);tuneEditFooter()};
const __newSourceBase=newSource;newSource=async function(x){await __newSourceBase(x);tuneEditFooter()};
const __newStoryBase=newStory;newStory=async function(x){await __newStoryBase(x);tuneEditFooter()};
const __newTimelineBase=newTimeline;newTimeline=function(x){__newTimelineBase(x);tuneEditFooter()};

// 설정 음악을 백업/영구삭제/내보내기에 포함
const __itemTextBase=itemText;itemText=function(kind,x){if(kind==='settings'){return `${x.title}\n분류: ${x.type}\n상태: ${x.status||''}\n태그: ${x.tags||''}\n음악: ${(x.musicTracks||[]).map(m=>m.name).join(', ')||'없음'}\n\n${x.body||''}`}return __itemTextBase(kind,x)};
exportData=async function(){let b=JSON.parse(JSON.stringify(db));b._fileData={};for(let x of[...db.images,...db.sources]){let d=await getFile(x.id);if(d)b._fileData[x.id]=d}for(let group of [db.characters,db.settings])for(let c of group)for(let m of(c.musicTracks||[])){let d=await getFile(m.id);if(d)b._fileData[m.id]=d}appSaveBlob(new Blob([JSON.stringify(b)],{type:'application/json'}),'창작소_내손안에이야기_백업.json')};
purgeTrash=async function(id){let t=db.trash.find(x=>x.id===id);if(!t)return;if(!confirm('영구 삭제하시겠습니까? 삭제 후에는 복원할 수 없습니다.'))return;let ids=[];if(t.kind==='images'||t.kind==='sources')ids=[t.data.id];if(t.kind==='characters'||t.kind==='settings')ids=(t.data.musicTracks||[]).map(m=>m.id);if(t.kind==='project'){ids=[...(t.data.items?.images||[]),...(t.data.items?.sources||[])].map(x=>x.id);for(let k of ['characters','settings'])for(let c of(t.data.items?.[k]||[]))ids.push(...(c.musicTracks||[]).map(m=>m.id))}for(let fid of ids)await delFile(fid);db.trash=db.trash.filter(x=>x.id!==id);persist();renderTrash()};
emptyTrash=async function(){if(!db.trash.length||!confirm('휴지통의 모든 항목을 영구 삭제하시겠습니까?'))return;for(let t of [...db.trash]){let ids=t.kind==='project'?[...(t.data.items?.images||[]),...(t.data.items?.sources||[])].map(x=>x.id):(t.kind==='images'||t.kind==='sources'?[t.data.id]:((t.kind==='characters'||t.kind==='settings')?(t.data.musicTracks||[]).map(m=>m.id):[]));if(t.kind==='project')for(let k of ['characters','settings'])for(let c of(t.data.items?.[k]||[]))ids.push(...(c.musicTracks||[]).map(m=>m.id));for(let id of ids)await delFile(id)}db.trash=[];persist();renderTrash()};

const __renderRecentBase=renderRecent;
renderRecent=function(){__renderRecentBase();document.querySelectorAll('#projectRecent .item').forEach(el=>el.classList.add('compactRecent'))};


/* ===== 2차 개발판 기능 확장 ===== */
const APP_FONT_KEY='creativeStudioStoryHandFont';
const APP_FONTS={
  system:{name:'기본 고딕',css:'system-ui,"Noto Sans KR","Noto Sans CJK KR",sans-serif'},
  serif:{name:'명조 / 세리프',css:'serif'},
  mono:{name:'고정폭',css:'monospace'},
  light:{name:'가벼운 고딕',css:'"sans-serif-light",sans-serif'},
  condensed:{name:'좁은 고딕',css:'"sans-serif-condensed",sans-serif'}
};
function applyAppFont(key){key=APP_FONTS[key]?key:'system';document.documentElement.style.setProperty('--app-font',APP_FONTS[key].css);localStorage.setItem(APP_FONT_KEY,key)}
function openFontPicker(){const cur=localStorage.getItem(APP_FONT_KEY)||'system';openModal(`<div class="stack"><h2>글꼴</h2><div class="note">Android에서 실제로 구분되는 기본 글꼴 계열을 사용합니다. 기기마다 모양은 조금 다를 수 있으며, PDF는 인쇄 호환성을 위해 기본 글꼴로 출력됩니다.</div><div class="fontChoices">${Object.entries(APP_FONTS).map(([k,f])=>`<button class="fontChoice" onclick="applyAppFont('${k}');closeModal()"><span class="fontSample" style="font-family:${f.css}">${esc(f.name)} · 가나다 ABC</span><span class="fontCheck">${cur===k?'✓':''}</span></button>`).join('')}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`)}

function storyFolderOptions(selected=''){let arr=db.storyFolders.filter(f=>f.project===currentProjectId);return `<option value="">폴더 없음</option>`+arr.map(f=>`<option value="${f.id}" ${selected===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}
function storyFolderName(id){return db.storyFolders.find(f=>f.id===id)?.name||''}
function openStoryFolderManager(){let arr=db.storyFolders.filter(f=>f.project===currentProjectId);openModal(`<div class="stack"><h2>썰 / 장문 폴더</h2><div class="row"><input id="newFolderName" placeholder="새 폴더 이름"><button class="primary" onclick="addStoryFolder()">+ 추가</button></div><div class="folderList">${arr.length?arr.map(f=>`<div class="folderRow"><div><div class="folderName">${esc(f.name)}</div><div class="folderCount">${db.stories.filter(x=>x.project===currentProjectId&&x.folderId===f.id).length}개 문서</div></div><button class="danger" onclick="deleteStoryFolder('${f.id}')">삭제</button></div>`).join(''):'<div class="empty">아직 폴더가 없습니다.</div>'}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`)}
function addStoryFolder(){let name=v('newFolderName').trim();if(!name)return;db.storyFolders.push({id:uid(),name,project:currentProjectId,created:Date.now()});persist();openStoryFolderManager();}
function deleteStoryFolder(id){let f=db.storyFolders.find(x=>x.id===id);if(!f)return;if(!confirm(`'${f.name}' 폴더를 삭제할까요? 안의 문서는 삭제되지 않고 '폴더 없음'으로 이동합니다.`))return;for(let s of db.stories)if(s.folderId===id)s.folderId='';db.storyFolders=db.storyFolders.filter(x=>x.id!==id);persist();openStoryFolderManager();}
function refreshStoryFolderFilter(){let sel=document.getElementById('storiesFolderFilter');if(!sel)return;let old=sel.value;sel.innerHTML='<option value="">모든 폴더</option><option value="__none">폴더 없음</option>'+db.storyFolders.filter(f=>f.project===currentProjectId).map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');if([...sel.options].some(o=>o.value===old))sel.value=old;syncAppSelect(sel)}

const __setupSectionsV2=setupSections;
setupSections=function(){__setupSectionsV2();projectStories.insertAdjacentHTML('afterbegin',`<div class="storyFolderBar"><select id="storiesFolderFilter" onchange="renderStories()"><option value="">모든 폴더</option></select><button onclick="openStoryFolderManager()">폴더 관리</button></div>`);projectSerials.innerHTML=controls('serials','연재본 편집','newSerial','제목/회차/본문 검색...');refreshStoryFolderFilter()};

const __newStoryV2=newStory;
newStory=async function(x){let obj=typeof x==='string'?decodeObj(x):x;await __newStoryV2(x);let editor=document.getElementById('ttags');if(!editor)return;let box=document.createElement('div');box.className='stack';box.innerHTML=`<div class="meta">폴더</div><select id="storyFolder">${storyFolderOptions(obj?.folderId||'')}</select>`;editor.insertAdjacentElement('afterend',box);syncAppSelect(document.getElementById('storyFolder'));adjustModalPlacement()};
const __saveStoryV2=saveStory;
saveStory=async function(id){let folder=v('storyFolder');await __saveStoryV2(id);let d=getDoc('stories',id);if(d){d.folderId=folder;persist();renderStories()}};

renderStories=async function(){refreshStoryFolderFilter();let a=listData('stories',['title','tags','body','status']),folder=v('storiesFolderFilter');if(folder==='__none')a=a.filter(x=>!x.folderId);else if(folder)a=a.filter(x=>x.folderId===folder);let blocks=[];for(let x of a){let thumbs=[];for(let iid of(x.imageIds||[]).slice(0,4)){let d=await getFile(iid);if(d)thumbs.push(`<img class="storyThumb" src="${d}">`)}let folderName=storyFolderName(x.folderId);blocks.push(`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('stories','${x.id}')">${itemTop(x.title,x.status||'아이디어',`${folderName?esc(folderName)+' · ':''}${fmt(x.updated)} · ${(x.body||'').length.toLocaleString()}자`,'stories',x)}<div class="itemBody">${folderName?`<div class="chips"><span class="pill">📁 ${esc(folderName)}</span></div>`:''}${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div>${thumbs.length?`<div class="thumbRow">${thumbs.join('')}</div>`:''}</div></div>`)}storiesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">저장된 썰이 없습니다.</div>';setTimeout(()=>animateStagger(storiesList),20)};

function sanitizeSerialHtml(html=''){let t=document.createElement('template');t.innerHTML=html;let allowed=new Set(['B','STRONG','U','I','EM','S','STRIKE','BR','DIV','P','FONT','H1','H2','H3','UL','OL','LI','BLOCKQUOTE']);function clean(n){for(let c of[...n.childNodes]){if(c.nodeType===3)continue;if(c.nodeType!==1){c.remove();continue}if(!allowed.has(c.tagName)){let frag=document.createDocumentFragment();while(c.firstChild)frag.appendChild(c.firstChild);c.replaceWith(frag);continue}for(let a of[...c.attributes]){if(c.tagName==='FONT'&&a.name==='size'){let z=parseInt(a.value);if(z>=1&&z<=7)continue}if(a.name==='style'){let m=(a.value.match(/text-align\s*:\s*(left|center|right|justify)/i)||[])[1];if(m){c.setAttribute('style',`text-align:${m.toLowerCase()}`);continue}}c.removeAttribute(a.name)}clean(c)}}clean(t.content);return t.innerHTML}
function serialInitial(x){return x?.bodyHtml?sanitizeSerialHtml(x.bodyHtml):esc(x?.body||'').replace(/\n/g,'<br>')}
function serialExec(cmd,val=null){let e=document.getElementById('serialBody');if(!e)return;e.focus();document.execCommand(cmd,false,val);updateSerialStats()}
function serialBlock(tag){if(!tag)return;serialExec('formatBlock',tag)}
function serialSize(size){if(!size)return;serialExec('fontSize',size)}
function updateSerialStats(){let text=document.getElementById('serialBody')?.innerText||'';let chars=text.length,words=text.trim()?text.trim().split(/\s+/).length:0;let el=document.getElementById('serialStats');if(el)el.textContent=`${chars.toLocaleString()}자 · ${words.toLocaleString()}단어`}
async function copySerialText(){let text=document.getElementById('serialBody')?.innerText||'';try{await navigator.clipboard.writeText(text);alert('본문을 복사했습니다.')}catch(_){let ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('본문을 복사했습니다.')}}
async function pasteSerialText(){let e=document.getElementById('serialBody');if(!e)return;e.focus();try{let text=await navigator.clipboard.readText();document.execCommand('insertText',false,text);updateSerialStats()}catch(_){let text=prompt('붙여넣을 내용을 입력해 주세요.');if(text!==null){document.execCommand('insertText',false,text);updateSerialStats()}}}
function newSerial(x){if(typeof x==='string')x=decodeObj(x);x=x||{id:uid(),title:'',episode:'',tags:'',body:'',bodyHtml:'',status:'초안',favorite:false,project:currentProjectId};if(x.title)trackView('serials',x.id);openModal(`<div class="stack"><h2>연재본 편집</h2><div class="row"><input id="serialTitle" placeholder="제목" value="${esc(x.title||'')}"><input id="serialEpisode" placeholder="회차 / 부제" value="${esc(x.episode||'')}"></div><div class="row"><select id="serialStatus"><option ${x.status==='초안'?'selected':''}>초안</option><option ${x.status==='퇴고중'?'selected':''}>퇴고중</option><option ${x.status==='완성'?'selected':''}>완성</option><option ${x.status==='보류'?'selected':''}>보류</option></select><input id="serialTags" placeholder="태그" value="${esc(x.tags||'')}"></div><div class="serialEditorWrap"><div class="serialToolbar"><button type="button" onclick="serialExec('undo')">↶</button><button type="button" onclick="serialExec('redo')">↷</button><button type="button" onclick="serialExec('bold')"><b>B</b></button><button type="button" onclick="serialExec('italic')"><i>I</i></button><button type="button" onclick="serialExec('underline')"><u>U</u></button><button type="button" onclick="serialExec('strikeThrough')"><s>S</s></button><select onchange="serialBlock(this.value);this.value=''"><option value="">문단</option><option value="P">본문</option><option value="H1">제목 1</option><option value="H2">제목 2</option><option value="BLOCKQUOTE">인용</option></select><select onchange="serialSize(this.value);this.value=''"><option value="">크기</option><option value="2">작게</option><option value="3">보통</option><option value="4">크게</option><option value="5">아주 크게</option></select><button type="button" onclick="serialExec('justifyLeft')">≡←</button><button type="button" onclick="serialExec('justifyCenter')">≡</button><button type="button" onclick="serialExec('justifyRight')">→≡</button><button type="button" onclick="serialExec('insertUnorderedList')">• 목록</button><button type="button" onclick="serialExec('insertOrderedList')">1. 목록</button><button type="button" onclick="serialExec('removeFormat')">서식 지우기</button></div><div id="serialBody" class="serialEditor" contenteditable="true" oninput="updateSerialStats()">${serialInitial(x)}</div></div><div class="serialStats"><span id="serialStats"></span><span class="meta">자동 저장은 하지 않으므로 작업 후 저장해 주세요.</span></div><div class="serialActions"><button onclick="copySerialText()">전체 복사</button><button onclick="pasteSerialText()">붙여넣기</button><button onclick="exportSerialFromEditor('${x.id}','txt')">TXT</button><button onclick="exportSerialFromEditor('${x.id}','pdf')">PDF</button></div><div class="right">${x.title?`<button class="danger" onclick="trashItem('serials','${x.id}')">삭제</button>`:''}<button onclick="closeModal()">닫기</button><button class="primary" onclick="saveSerial('${x.id}')">저장</button></div></div>`);enhanceAllSelects(document.getElementById('modalCard'));updateSerialStats()}
function saveSerial(id){let title=v('serialTitle').trim();if(!title)return alert('제목을 입력해 주세요.');let e=document.getElementById('serialBody'),old=getDoc('serials',id)||{};upsert('serials',{...old,id,title,episode:v('serialEpisode'),status:v('serialStatus')||'초안',tags:v('serialTags'),body:(e?.innerText||'').replace(/\u00a0/g,' '),bodyHtml:sanitizeSerialHtml(e?.innerHTML||''),project:currentProjectId,updated:Date.now(),favorite:old.favorite||false});closeModal()}
function renderSerials(){let a=listData('serials',['title','episode','tags','body','status']);serialsList.innerHTML=a.length?a.map(x=>`<div class="item ${x.favorite?'favorite':''}" onclick="viewSerial('${x.id}')">${itemTop(x.title,x.status||'초안',`${x.episode?esc(x.episode)+' · ':''}${fmt(x.updated)} · ${(x.body||'').length.toLocaleString()}자`,'serials',x)}<div class="itemBody"><div class="serialCardMeta">${x.episode?`<span class="pill serialEpisode">${esc(x.episode)}</span>`:''}${tags(x.tags)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div></div></div>`).join(''):'<div class="empty">작성 중인 연재본이 없습니다.</div>'}
function viewSerial(id){let x=getDoc('serials',id);if(!x)return;trackView('serials',id);let body=x.bodyHtml?sanitizeSerialHtml(x.bodyHtml):esc(x.body||'').replace(/\n/g,'<br>');openModal(`<div class="stack"><div class="detailHead"><div><div class="detailTitle">${esc(x.title)}</div><div class="detailMeta">${esc(x.episode||'회차 미지정')} · ${esc(x.status||'초안')} · ${(x.body||'').length.toLocaleString()}자</div></div>${favButton('serials',x)}</div>${x.tags?`<div class="chips">${tags(x.tags)}</div>`:''}<div class="detailSection"><div class="detailLabel">본문</div><div class="detailBody">${body}</div></div><div class="detailFooter"><button onclick="exportItem('serials','${id}','pdf')">PDF</button><button onclick="exportItem('serials','${id}','txt')">TXT</button><button onclick="copySerialDoc('${id}')">복사</button><button class="primary" onclick="closeModal();setTimeout(()=>newSerial(getDoc('serials','${id}')),200)">수정</button></div></div>`)}
async function copySerialDoc(id){let x=getDoc('serials',id);if(!x)return;try{await navigator.clipboard.writeText(x.body||'');alert('본문을 복사했습니다.')}catch(_){alert('클립보드 접근이 제한됐습니다. 편집창의 전체 복사를 사용해 주세요.')}}
function serialPdfMetaTable(x){return `<table class="metaTable"><tbody><tr><th>제목</th><td>${esc(x.title||'제목 없음')}</td></tr><tr><th>횟차</th><td>${esc(x.episode||'미정')}</td></tr><tr><th>투고사항</th><td>${esc(x.status||'초안')}</td></tr><tr><th>태그</th><td>${esc(x.tags||'없음')}</td></tr><tr><th>글자수</th><td>${(x.body||'').length.toLocaleString()}자</td></tr></tbody></table>`}
function exportSerialFromEditor(id,format){let title=v('serialTitle').trim()||'연재본',episode=v('serialEpisode'),e=document.getElementById('serialBody'),temp={id,title,episode,status:v('serialStatus'),tags:v('serialTags'),body:e?.innerText||'',bodyHtml:sanitizeSerialHtml(e?.innerHTML||'')};exportSerialObject(temp,format)}
function exportSerialObject(x,format){let title=x.title+(x.episode?'_'+x.episode:'');if(format==='txt'){let txt=`${x.title}${x.episode?'\n'+x.episode:''}\n\n${x.body||''}`;return appSaveBlob(new Blob(['\ufeff'+txt],{type:'text/plain;charset=utf-8'}),title+'.txt')}let html=`<article class="pdfDoc"><header class="pdfHead"><div class="pdfEyebrow">연재본 편집</div><h1>${esc(x.title)}</h1></header>${serialPdfMetaTable(x)}<section class="pdfBody"><h2>내용</h2><div class="bodyText">${x.bodyHtml?sanitizeSerialHtml(x.bodyHtml):esc(x.body||'').replace(/\n/g,'<br>')}</div></section></article>`;if(appPrint(title,html))return;}

const __projectEntryHtmlV2=projectEntryHtml;
projectEntryHtml=async function(kind,x){if(kind==='serials')return `<div class="projectEntry storyEntry"><div class="entryEyebrow">연재본 편집</div><h3>${esc(x.title)}</h3>${serialPdfMetaTable(x)}<section class="entryBody"><h4>내용</h4><div class="bodyText">${x.bodyHtml?sanitizeSerialHtml(x.bodyHtml):esc(x.body||'').replace(/\n/g,'<br>')}</div></section></div>`;return __projectEntryHtmlV2(kind,x)};

const __itemTextV2=itemText;
itemText=function(kind,x){if(kind==='serials')return `${x.title}${x.episode?'\n회차: '+x.episode:''}\n상태: ${x.status||''}\n태그: ${x.tags||''}\n\n${x.body||''}`;return __itemTextV2(kind,x)};
const __exportItemV2=exportItem;
exportItem=async function(kind,id,format){if(kind==='serials'){let x=getDoc('serials',id);if(x)return exportSerialObject(x,format)}return __exportItemV2(kind,id,format)};

const __editDocV2=editDoc;
editDoc=function(kind,id){if(kind==='serials'){let x=getDoc(kind,id);if(!x)return;closeModal();return setTimeout(()=>newSerial(x),200)}return __editDocV2(kind,id)};

const __renderRecentV2=renderRecent;
renderRecent=function(){__renderRecentV2();let section=document.getElementById('projectRecent');if(!section)return;let serials=db.serials.filter(x=>x.project===currentProjectId).sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,5);if(serials.length)section.insertAdjacentHTML('beforeend',`<div class="toolbar" style="margin-top:16px"><h3>📖 최근 연재본</h3></div><div class="recentGrid">${serials.map(x=>`<div class="item compactRecent" onclick="viewSerial('${x.id}')"><b>${esc(x.title)}</b><div class="meta">${esc(x.episode||'회차 미지정')} · ${esc(x.status||'초안')}</div></div>`).join('')}</div>`)};

function selectedExportDefs(){return [['settings','설정'],['characters','캐릭터'],['relations','관계도'],['stories','썰 / 장문'],['serials','연재본'],['timeline','타임라인'],['images','이미지'],['sources','소스파일']]}
function refreshSelectedExportCategory(){
  const sel=document.getElementById('selectExportCategory');if(!sel)return;
  const pid=v('exportProject');const old=sel.value;
  const available=selectedExportDefs().filter(([k])=>(db[k]||[]).some(x=>x.project===pid));
  sel.innerHTML=available.length?available.map(([k,label])=>`<option value="${k}">${label}</option>`).join(''):'<option value="">항목 없음</option>';
  if(available.some(([k])=>k===old))sel.value=old;
  syncAppSelect(sel);
}
function renderSelectedExport(){
  let host=document.getElementById('selectExportGroups');if(!host)return;
  let pid=v('exportProject');if(!pid){host.innerHTML='<div class="empty">프로젝트를 선택해 주세요.</div>';return}
  refreshSelectedExportCategory();
  const category=v('selectExportCategory');
  if(!category){host.innerHTML='<div class="empty">내보낼 항목이 없습니다.</div>';return}
  const label=selectedExportDefs().find(([k])=>k===category)?.[1]||category;
  const arr=(db[category]||[]).filter(x=>x.project===pid);
  host.innerHTML=arr.length?`<div class="selectExportGroup"><h3>${label} <span class="meta">${arr.length}</span></h3>${arr.map(x=>`<label class="selectExportRow"><input type="checkbox" name="pdfPick" value="${category}:${x.id}"><span><b>${esc(titleOf(category,x))}</b><div class="meta">${esc(x.status||x.episode||x.type||x.fileName||'')}</div></span></label>`).join('')}</div>`:'<div class="empty">이 카테고리에 항목이 없습니다.</div>';
}
function selectAllPdfPicks(on=true){document.querySelectorAll('input[name=pdfPick]').forEach(x=>x.checked=on)}
async function selectedEntryHtml(kind,x){if(kind==='images'){let d=await getFile(x.id);return `<div class="projectEntry imageEntry"><div class="projectImageMedia">${d?`<img src="${d}">`:'<div class="imagePlaceholder">이미지 없음</div>'}</div><div class="projectImageInfo"><div class="entryEyebrow">이미지</div><h3>${esc(x.title)}</h3><div class="bodyText">${esc(x.note||'')}</div></div></div>`}if(kind==='sources')return `<div class="projectEntry"><div class="entryEyebrow">소스파일</div><h3>${esc(x.title)}</h3><table class="metaTable"><tr><th>파일</th><td>${esc(x.fileName||'PDF')}</td></tr><tr><th>메모</th><td>${esc(x.note||'없음')}</td></tr></table></div>`;if(kind==='serials')return `<div class="projectEntry storyEntry"><div class="entryEyebrow">연재본 편집</div><h3>${esc(x.title)}</h3>${serialPdfMetaTable(x)}<section class="entryBody"><h4>내용</h4><div class="bodyText">${x.bodyHtml?sanitizeSerialHtml(x.bodyHtml):esc(x.body||'').replace(/\n/g,'<br>')}</div></section></div>`;return projectEntryHtml(kind,x)}
async function exportSelectedPdf(){let picked=[...document.querySelectorAll('input[name=pdfPick]:checked')].map(x=>x.value);if(!picked.length)return alert('내보낼 항목을 선택해 주세요.');let pid=v('exportProject'),p=db.projects.find(x=>x.id===pid);if(!p)return;let html=`<article class="pdfDoc"><header class="pdfHead"><div class="pdfEyebrow">선택 항목 모음</div><h1>${esc(p.name)}</h1><p class="lead">선택한 ${picked.length}개 항목</p></header><section class="projectSection">`;for(let key of picked){let [kind,id]=key.split(':'),x=getDoc(kind,id);if(x)html+=await selectedEntryHtml(kind,x)}html+='</section></article>';if(appPrint(p.name+'_선택항목',html))return;}
function installSelectedExportUI(){
  let exportSec=document.getElementById('export');if(!exportSec||document.getElementById('selectedExportCard'))return;
  let card=document.createElement('div');card.id='selectedExportCard';card.className='card stack selectExportCard';
  card.innerHTML=`<h2>선택 항목 PDF</h2><div class="note">카테고리를 고른 뒤 필요한 문서만 선택하여 하나의 PDF로 묶어 저장할 수 있습니다.</div><select id="selectExportCategory" onchange="renderSelectedExport()"></select><div class="selectExportTools"><button onclick="selectAllPdfPicks(true)">전체 선택</button><button onclick="selectAllPdfPicks(false)">선택 해제</button></div><div id="selectExportGroups" class="selectExportGroups"></div><button class="primary" onclick="exportSelectedPdf()">선택 항목 PDF로 저장</button>`;
  exportSec.firstElementChild.insertAdjacentElement('afterend',card);
  let sel=document.getElementById('exportProject');sel?.addEventListener('change',()=>setTimeout(()=>{refreshSelectedExportCategory();renderSelectedExport()},0));
  refreshSelectedExportCategory();renderSelectedExport();enhanceAllSelects(card);
}

const __renderExportProjectsV2=renderExportProjects;
renderExportProjects=function(){__renderExportProjectsV2();syncAppSelect(document.getElementById('exportProject'));setTimeout(renderSelectedExport,0)};

const __trashProjectV2=trashProject;
trashProject=function(pid){let folders=db.storyFolders.filter(x=>x.project===pid);let serials=db.serials.filter(x=>x.project===pid);if(!folders.length&&!serials.length)return __trashProjectV2(pid);let p=db.projects.find(x=>x.id===pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','images','sources','stories','timeline','serials','storyFolders']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()};


// ===== 소소한 편의 기능 =====
const LAST_BACKUP_KEY='creative_studio_storyhand_last_backup_v1';
function renderLastBackup(){let el=document.getElementById('lastBackupInfo');if(!el)return;let t=Number(localStorage.getItem(LAST_BACKUP_KEY)||0);el.textContent=t?`마지막 백업: ${fmt(t)}`:'마지막 백업: 없음'}
const __exportDataConvenience=exportData;
exportData=async function(){await __exportDataConvenience();localStorage.setItem(LAST_BACKUP_KEY,String(Date.now()));renderLastBackup()};

function renderQuickMemos(){let host=document.getElementById('projectQuickMemos');if(!host)return;let arr=(db.quickMemos||[]).filter(x=>x.project===currentProjectId).sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0));host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0 0 4px">빠른 메모</h3><div class="meta">정리 전 아이디어를 가볍게 적어두는 공간</div></div></div><div class="quickMemoComposer"><textarea id="quickMemoInput" placeholder="떠오른 내용을 짧게 적어두세요..."></textarea><button class="primary" onclick="saveQuickMemo()">메모 저장</button></div><div class="quickMemoList">${arr.length?arr.map(x=>`<div class="quickMemoCard"><div class="quickMemoText">${esc(x.text||'')}</div><div class="quickMemoFoot"><span class="meta">${fmt(x.updated||x.created)}</span><div class="quickMemoActions"><button onclick="editQuickMemo('${x.id}')">수정</button><button class="danger" onclick="deleteQuickMemo('${x.id}')">삭제</button></div></div></div>`).join(''):'<div class="empty">아직 메모가 없습니다.</div>'}</div>`}
function saveQuickMemo(){let e=document.getElementById('quickMemoInput'),text=(e?.value||'').trim();if(!text)return alert('메모 내용을 입력해 주세요.');db.quickMemos.unshift({id:uid(),text,project:currentProjectId,created:Date.now(),updated:Date.now()});persist();renderQuickMemos();if(e)e.value=''}
function editQuickMemo(id){let x=(db.quickMemos||[]).find(m=>m.id===id);if(!x)return;openModal(`<div class="stack"><h2>빠른 메모 수정</h2><textarea id="quickMemoEdit" style="min-height:180px">${esc(x.text||'')}</textarea><div class="right"><button onclick="closeModal()">취소</button><button class="primary" onclick="saveQuickMemoEdit('${id}')">저장</button></div></div>`)}
function saveQuickMemoEdit(id){let x=(db.quickMemos||[]).find(m=>m.id===id),text=v('quickMemoEdit').trim();if(!x||!text)return alert('메모 내용을 입력해 주세요.');x.text=text;x.updated=Date.now();persist();closeModal();renderQuickMemos()}
function deleteQuickMemo(id){if(!confirm('이 메모를 삭제할까요?'))return;db.quickMemos=(db.quickMemos||[]).filter(x=>x.id!==id);persist();renderQuickMemos()}
const __renderProjectAllConvenience=renderProjectAll;
renderProjectAll=function(){__renderProjectAllConvenience();renderQuickMemos()};

async function previewProjectCover(id){let box=document.getElementById('projectCoverPreview');if(!box)return;if(!id){box.innerHTML='<span class="meta">대표 이미지 없음</span>';return}let d=await getFile(id);box.innerHTML=d?`<img src="${d}">`:'<span class="meta">이미지를 불러올 수 없습니다.</span>'}
newProject=function(p){if(typeof p==='string')p=decodeObj(p);p=p||{id:uid(),name:'',desc:'',color:'#7b61a8',projectType:'general',coverImageId:'',created:Date.now(),updated:Date.now()};let imgs=(db.images||[]).filter(x=>x.project===p.id);let coverOptions='<option value="">대표 이미지 없음</option>'+imgs.map(x=>`<option value="${x.id}" ${p.coverImageId===x.id?'selected':''}>${esc(x.title||'이미지')}</option>`).join('');openModal(`<div class="stack"><h2>${p.name?'프로젝트 수정':'새 프로젝트'}</h2><input id="pname" placeholder="프로젝트 이름" value="${esc(p.name)}"><select id="ptype" onchange="this.dataset.selected=this.value"><option value="general" ${(p.projectType||'general')==='general'?'selected':''}>일반 프로젝트 — 전체 기능</option><option value="short" ${p.projectType==='short'?'selected':''}>단편 프로젝트 — 단순화된 기능</option></select><div class="note">단편 프로젝트에서는 관계도와 타임라인을 숨기고 설정, 캐릭터, 이미지, 소스파일, 썰 중심으로 표시합니다. 이후 일반 프로젝트로 변경해도 기존 자료는 유지됩니다.</div><textarea id="pdesc" style="min-height:110px" placeholder="설명">${esc(p.desc||'')}</textarea><input id="pcolor" type="color" value="${esc(p.color||'#7b61a8')}"><div class="projectCoverPicker"><div class="meta">프로젝트 대표 이미지</div><select id="pcover" onchange="previewProjectCover(this.value)">${coverOptions}</select><div id="projectCoverPreview" class="projectCoverPreview"><span class="meta">${imgs.length?'대표 이미지를 선택해 주세요.':'이미지 자료를 등록한 뒤 프로젝트 수정에서 선택할 수 있습니다.'}</span></div></div><div class="right">${p.name?`<button class="danger" onclick="trashProject('${p.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveProject('${p.id}')">저장</button></div></div>`);setTimeout(()=>{syncAppSelect(document.getElementById('pcover'));previewProjectCover(p.coverImageId||'')},30)};
saveProject=function(id){let name=v('pname').trim();if(!name)return alert('프로젝트 이름을 입력해 주세요.');let old=db.projects.find(x=>x.id===id);upsert('projects',{...old,id,name,desc:v('pdesc'),color:v('pcolor'),projectType:v('ptype')||'general',coverImageId:v('pcover')||'',created:old?.created||Date.now(),updated:Date.now()});closeModal();if(currentProjectId===id)openProject(id)};
renderProjects=async function(){let q=v('projectSearch').toLowerCase(),mode=v('projectSort')||'latest',arr=sortArr(db.projects.filter(p=>`${p.name} ${p.desc||''}`.toLowerCase().includes(q)),mode),shown=arr.slice(0,limits.projects),blocks=[];for(let p of shown){let cover='';if(p.coverImageId)cover=await getFile(p.coverImageId);blocks.push(`<div class="card projectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead ${cover?'hasCover':''}">${cover?`<img class="projectCover" src="${cover}" alt="">`:''}<div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${p.projectType==='short'?'단편 프로젝트':'일반 프로젝트'}</span></div><div class="projectDesc">${esc(p.desc||'설명 없음')}</div>${projectStatsHtml(p)}<div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div>`)}document.getElementById('projectList').innerHTML=blocks.length?blocks.join(''):'<div class="empty">새 프로젝트를 만들어 보세요.</div>';toggleMore('projectMore',arr.length,limits.projects);setTimeout(()=>animateStagger(document.getElementById('projectList')),20)};

async function duplicateCharacter(id){let src=getDoc('characters',id);if(!src)return;let copy=JSON.parse(JSON.stringify(src));copy.id=uid();copy.name=(src.name||'캐릭터')+' 복사본';copy.favorite=false;copy.updated=Date.now();let tracks=[];for(let m of(src.musicTracks||[])){let data=await getFile(m.id),nm={...m,id:data?'music_'+uid():m.id};if(data)await putFile(nm.id,data);tracks.push(nm)}copy.musicTracks=tracks;db.characters.unshift(copy);persist();closeModal();renderCharacters();alert('캐릭터를 복제했습니다.')}
const __viewDocConvenience=viewDoc;
viewDoc=async function(kind,id){await __viewDocConvenience(kind,id);if(kind!=='characters')return;let foot=document.querySelector('#modalCard .detailFooter');if(!foot||foot.querySelector('.duplicateCharacterBtn'))return;let b=document.createElement('button');b.className='duplicateCharacterBtn';b.textContent='복제';b.onclick=()=>duplicateCharacter(id);let edit=[...foot.querySelectorAll('button')].find(x=>x.textContent.trim()==='수정');if(edit)foot.insertBefore(b,edit);else foot.appendChild(b);foot.classList.add('withDuplicate')};

trashProject=function(pid){let p=db.projects.find(x=>x.id===pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','images','sources','stories','timeline','serials','storyFolders','quickMemos']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()};


// ===== 프로젝트 유형 확장: 고급 / 일반 / 단편 / 일기장 / 메모장 =====
limits.diaries=20;limits.pictureDiaries=20;
function projectTypeLabel(t){return {advanced:'고급 프로젝트',general:'일반 프로젝트',short:'단편 프로젝트',diary:'일기장',memo:'메모장'}[t]||'일반 프로젝트'}
function projectById(id){return db.projects.find(p=>p.id===id)}
function isAdvancedProject(id=currentProjectId){return (projectById(id)?.projectType||'general')==='advanced'}
function currentProjectType(){return projectById(currentProjectId)?.projectType||'general'}
function todayLocal(){let d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}

async function newDiary(x){
  if(typeof x==='string')x=decodeObj(x);x=x||{id:uid(),title:'',date:todayLocal(),body:'',bodyHtml:'',project:currentProjectId,created:Date.now(),updated:Date.now()};
  openModal(`<div class="stack"><h2>${x.id&&db.diaries.some(d=>d.id===x.id)?'일기 수정':'새 일기'}</h2><input id="diaryDate" type="date" value="${esc(x.date||todayLocal())}"><input id="diaryTitle" placeholder="제목 (선택)" value="${esc(x.title||'')}"><textarea id="diaryBody" style="min-height:260px" placeholder="오늘의 기록을 작성해 주세요.">${esc(x.body||'')}</textarea><div class="right">${db.diaries.some(d=>d.id===x.id)?`<button class="danger" onclick="deleteDiary('${x.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveDiary('${x.id}')">저장</button></div></div>`)
}
function saveDiary(id){let old=db.diaries.find(x=>x.id===id)||{},date=v('diaryDate')||todayLocal(),title=v('diaryTitle').trim();let body=v('diaryBody');if(!body.trim()&&!title)return alert('내용이나 제목을 입력해 주세요.');let obj={...old,id:id||uid(),title,date,body,bodyHtml:'',project:currentProjectId,created:old.created||Date.now(),updated:Date.now()};let i=db.diaries.findIndex(x=>x.id===obj.id);if(i>=0)db.diaries[i]=obj;else db.diaries.unshift(obj);persist();closeModal();renderDiaries()}
function deleteDiary(id){if(!confirm('이 일기를 삭제하시겠습니까?'))return;db.diaries=db.diaries.filter(x=>x.id!==id);persist();closeModal();renderDiaries()}
function renderDiaries(){let host=document.getElementById('projectDiaries');if(!host)return;let q=(document.getElementById('diarySearch')?.value||'').toLowerCase();let arr=db.diaries.filter(x=>x.project===currentProjectId&&`${x.title||''} ${x.body||''} ${x.date||''}`.toLowerCase().includes(q)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.updated||0)-(a.updated||0));let shown=arr.slice(0,limits.diaries);host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0 0 4px">일기장</h3><div class="meta">날짜별로 가볍게 기록하는 공간입니다.</div></div><button class="primary" onclick="newDiary()">+ 새 일기</button></div><div class="toolbar"><input id="diarySearch" class="search" placeholder="날짜/제목/내용 검색..." value="${esc(q)}" oninput="limits.diaries=20;renderDiaries()"></div><div class="diaryList">${shown.length?shown.map(x=>`<div class="diaryCard" onclick="newDiary(${encodeObj(x)})"><div class="diaryDate">${esc(x.date||'날짜 없음')}</div>${x.title?`<div class="diaryTitle">${esc(x.title)}</div>`:''}<div class="diaryBody">${esc(x.body||'내용 없음')}</div></div>`).join(''):'<div class="empty">아직 작성한 일기가 없습니다.</div>'}</div>${arr.length>limits.diaries?`<button class="loadMore" onclick="limits.diaries+=20;renderDiaries()">더 보기 +20</button>`:''}`}

async function pictureDiaryData(id){return id?await getFile(id):''}
async function newPictureDiary(x){
  if(typeof x==='string')x=decodeObj(x);x=x||{id:uid(),title:'',date:todayLocal(),body:'',imageId:'',project:currentProjectId,created:Date.now(),updated:Date.now()};
  let existing=x.imageId?await pictureDiaryData(x.imageId):'';
  openModal(`<div class="stack"><h2>${(db.pictureDiaries||[]).some(d=>d.id===x.id)?'그림일기 수정':'새 그림일기'}</h2><input id="pdDate" type="date" value="${esc(x.date||todayLocal())}"><input id="pdTitle" placeholder="제목 (선택)" value="${esc(x.title||'')}"><textarea id="pdBody" style="min-height:220px" placeholder="오늘의 기록을 작성해 주세요.">${esc(x.body||'')}</textarea><div class="linkedBox"><b>그림 / 사진</b><div class="meta">이미지 한 장과 글을 함께 기록할 수 있습니다.</div><label class="btn" style="text-align:center">이미지 선택<input id="pdFile" type="file" accept="image/*" hidden></label><div id="pdPreview" class="pictureDiaryPreview">${existing?`<img src="${existing}">`:'<span class="meta">선택된 이미지가 없습니다.</span>'}</div></div><div class="right">${(db.pictureDiaries||[]).some(d=>d.id===x.id)?`<button class="danger" onclick="deletePictureDiary('${x.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="savePictureDiary('${x.id}')">저장</button></div></div>`);
  centerDiaryEntryModal();
  window._editingPictureDiary={imageId:x.imageId||'',data:''};
  let input=document.getElementById('pdFile');if(input)input.onchange=async e=>{let f=e.target.files?.[0];if(!f)return;let data=await fileToData(f);window._editingPictureDiary={imageId:x.imageId||'',data,fileName:f.name};document.getElementById('pdPreview').innerHTML=`<img src="${data}">`}
}
async function savePictureDiary(id){
  let old=(db.pictureDiaries||[]).find(x=>x.id===id)||{},date=v('pdDate')||todayLocal(),title=v('pdTitle').trim(),body=v('pdBody');let edit=window._editingPictureDiary||{};if(!body.trim()&&!title&&!old.imageId&&!edit.data)return alert('내용이나 이미지를 입력해 주세요.');let imageId=old.imageId||edit.imageId||'';if(edit.data){if(!imageId)imageId='pdiary_'+uid();await putFile(imageId,edit.data)}let obj={...old,id:id||uid(),title,date,body,imageId,project:currentProjectId,created:old.created||Date.now(),updated:Date.now()};let i=(db.pictureDiaries||[]).findIndex(x=>x.id===obj.id);if(i>=0)db.pictureDiaries[i]=obj;else db.pictureDiaries.unshift(obj);persist();window._editingPictureDiary=null;closeModal();renderPictureDiaries();renderProjects()}
async function deletePictureDiary(id){let x=(db.pictureDiaries||[]).find(z=>z.id===id);if(!x||!confirm('이 그림일기를 삭제하시겠습니까?'))return;if(x.imageId)await delFile(x.imageId);db.pictureDiaries=db.pictureDiaries.filter(z=>z.id!==id);persist();closeModal();renderPictureDiaries();renderProjects()}
async function renderPictureDiaries(){let host=document.getElementById('projectPictureDiaries');if(!host)return;let q=(document.getElementById('pictureDiarySearch')?.value||'').toLowerCase();let arr=(db.pictureDiaries||[]).filter(x=>x.project===currentProjectId&&`${x.title||''} ${x.body||''} ${x.date||''}`.toLowerCase().includes(q)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.updated||0)-(a.updated||0));let shown=arr.slice(0,limits.pictureDiaries||20),blocks=[];for(let x of shown){let d=x.imageId?await getFile(x.imageId):'';blocks.push(`<div class="pictureDiaryCard" onclick="newPictureDiary(${encodeObj(x)})">${d?`<img src="${d}" alt="">`:'<div class="pictureDiaryPreview"><span class="meta">이미지 없음</span></div>'}<div><div class="pictureDiaryDate">${esc(x.date||'날짜 없음')}</div>${x.title?`<div class="pictureDiaryTitle">${esc(x.title)}</div>`:''}<div class="pictureDiaryBody">${esc(x.body||'내용 없음')}</div></div></div>`)}host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0 0 4px">그림일기장</h3><div class="meta">이미지와 글을 함께 기록할 수 있습니다.</div></div><button class="primary" onclick="newPictureDiary()">+ 새 그림일기</button></div><div class="toolbar"><input id="pictureDiarySearch" class="search" placeholder="날짜/제목/내용 검색..." value="${esc(q)}" oninput="limits.pictureDiaries=20;renderPictureDiaries()"></div><div class="pictureDiaryList">${blocks.length?blocks.join(''):'<div class="empty">아직 작성한 그림일기가 없습니다.</div>'}</div>${arr.length>(limits.pictureDiaries||20)?`<button class="loadMore" onclick="limits.pictureDiaries=(limits.pictureDiaries||20)+20;renderPictureDiaries()">더 보기 +20</button>`:''}`}

function projectTypeVisibleTabs(type){
  if(type==='memo')return ['quickMemos'];
  if(type==='diary')return ['diaries','pictureDiaries'];
  if(type==='short')return ['recent','quickMemos','settings','characters','images','sources','stories','serials'];
  return ['recent','quickMemos','settings','characters','relations','images','sources','stories','serials','timeline'];
}
function applyExpandedProjectType(p){
  let type=p.projectType||'general',visible=new Set(projectTypeVisibleTabs(type));
  document.querySelectorAll('.subtabs button[data-subtab]').forEach(b=>b.classList.toggle('hidden',!visible.has(b.dataset.subtab)));
  document.querySelectorAll('.subsec').forEach(s=>{let key=s.id.replace(/^project/,'');key=key.charAt(0).toLowerCase()+key.slice(1);if(!visible.has(key))s.classList.add('hidden')});
  let active=document.querySelector('.subtabs button.active');
  if(!active||active.classList.contains('hidden')){let first=[...document.querySelectorAll('.subtabs button[data-subtab]')].find(b=>!b.classList.contains('hidden'));if(first)first.click()}
  let qm=document.querySelector('[data-subtab="quickMemos"]');if(qm)qm.textContent=type==='memo'?'메모':'빠른 메모';
}

const __newProjectTypeBase=newProject;
newProject=function(p){
  if(typeof p==='string')p=decodeObj(p);p=p||{id:uid(),name:'',desc:'',color:'#7b61a8',projectType:'general',coverImageId:'',created:Date.now(),updated:Date.now()};
  let imgs=(db.images||[]).filter(x=>x.project===p.id),coverOptions='<option value="">대표 이미지 없음</option>'+imgs.map(x=>`<option value="${x.id}" ${p.coverImageId===x.id?'selected':''}>${esc(x.title||'이미지')}</option>`).join('');
  openModal(`<div class="stack"><h2>${p.name?'프로젝트 수정':'새 프로젝트'}</h2><input id="pname" placeholder="프로젝트 이름" value="${esc(p.name)}"><select id="ptype" onchange="this.dataset.selected=this.value"><option value="advanced" ${p.projectType==='advanced'?'selected':''}>고급 프로젝트 — 음악·동영상 포함</option><option value="general" ${(p.projectType||'general')==='general'?'selected':''}>일반 프로젝트 — 음악·동영상 제외</option><option value="short" ${p.projectType==='short'?'selected':''}>단편 프로젝트 — 단편용 간소화</option><option value="diary" ${p.projectType==='diary'?'selected':''}>일기장 — 날짜별 기록</option><option value="memo" ${p.projectType==='memo'?'selected':''}>메모장 — 간단 메모 중심</option></select><div class="note">고급은 모든 창작 기능과 음악·짧은 동영상을 사용합니다. 일반은 같은 창작 기능에서 음악·동영상만 제외합니다. 단편은 관계도·타임라인을 숨깁니다. 일기장과 메모장은 기록에 필요한 기능만 표시합니다. 유형을 바꿔도 기존 자료는 삭제되지 않습니다.</div><textarea id="pdesc" style="min-height:110px" placeholder="설명">${esc(p.desc||'')}</textarea><input id="pcolor" type="color" value="${esc(p.color||'#7b61a8')}"><div class="projectCoverPicker"><div class="meta">프로젝트 대표 이미지</div><select id="pcover" onchange="previewProjectCover(this.value)">${coverOptions}</select><div id="projectCoverPreview" class="projectCoverPreview"><span class="meta">${imgs.length?'대표 이미지를 선택해 주세요.':'이미지 자료를 등록한 뒤 프로젝트 수정에서 선택할 수 있습니다.'}</span></div></div><div class="right">${p.name?`<button class="danger" onclick="trashProject('${p.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveProject('${p.id}')">저장</button></div></div>`);setTimeout(()=>{let pt=document.getElementById('ptype');if(pt)pt.dataset.selected=p.projectType||'general';syncAppSelect(pt);syncAppSelect(document.getElementById('pcover'));previewProjectCover(p.coverImageId||'')},30)
};

const __saveProjectExpandedBase=saveProject;
saveProject=function(id){let name=v('pname').trim();if(!name)return alert('프로젝트 이름을 입력해 주세요.');let old=db.projects.find(x=>x.id===id);upsert('projects',{...old,id,name,desc:v('pdesc'),color:v('pcolor'),projectType:(document.getElementById('ptype')?.dataset.selected||v('ptype')||'general'),projectTypeVersion:2,coverImageId:v('pcover')||'',created:old?.created||Date.now(),updated:Date.now()});closeModal();if(currentProjectId===id)openProject(id)};

function expandedProjectStatsHtml(p){let t=p.projectType||'general',items=[];if(t==='memo')items=[['메모',(db.quickMemos||[]).filter(x=>x.project===p.id).length]];else if(t==='diary')items=[['일기',(db.diaries||[]).filter(x=>x.project===p.id).length],['그림일기',(db.pictureDiaries||[]).filter(x=>x.project===p.id).length]];else{items=[['설정',cnt('settings',p.id)],['캐릭터',cnt('characters',p.id)],['썰',cnt('stories',p.id)],['연재본',cnt('serials',p.id)]];if(t!=='short')items.push(['관계도',cnt('relations',p.id)],['타임라인',cnt('timeline',p.id)])}return `<div class="projectStats">${items.map(([k,v])=>`<span class="statPill">${k} ${v}</span>`).join('')}</div>`}
projectStatsHtml=expandedProjectStatsHtml;

renderProjects=async function(){let q=v('projectSearch').toLowerCase(),mode=v('projectSort')||'latest',arr=sortArr(db.projects.filter(p=>`${p.name} ${p.desc||''}`.toLowerCase().includes(q)),mode),shown=arr.slice(0,limits.projects),blocks=[];for(let p of shown){let cover='';if(p.coverImageId)cover=await getFile(p.coverImageId);blocks.push(`<div class="card projectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead ${cover?'hasCover':''}">${cover?`<img class="projectCover" src="${cover}" alt="">`:''}<div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span></div><div class="projectDesc">${esc(p.desc||'설명 없음')}</div>${expandedProjectStatsHtml(p)}<div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div>`)}document.getElementById('projectList').innerHTML=blocks.length?blocks.join(''):'<div class="empty">새 프로젝트를 만들어 보세요.</div>';toggleMore('projectMore',arr.length,limits.projects);setTimeout(()=>animateStagger(document.getElementById('projectList')),20)};

const __openProjectExpandedBase=openProject;
openProject=function(id){__openProjectExpandedBase(id);let p=projectById(id);if(!p)return;document.getElementById('projectDesc').innerHTML=`<span class="typeBadge">${projectTypeLabel(p.projectType)}</span> ${esc(p.desc||'설명 없음')}`;applyExpandedProjectType(p);renderDiaries();renderPictureDiaries()};

const __renderProjectAllExpandedBase=renderProjectAll;
renderProjectAll=function(){__renderProjectAllExpandedBase();renderDiaries();renderPictureDiaries()};

// 일반/단편은 음악 기능을 보이지 않게 하되 기존 파일 데이터는 보존한다.
const __newSettingExpandedBase=newSetting;
newSetting=async function(x){await __newSettingExpandedBase(x);if(!isAdvancedProject()){let boxes=[...document.querySelectorAll('#modalCard .linkedBox')];boxes.filter(b=>b.textContent.includes('설정 음악 / 테마곡')).forEach(b=>b.remove())}};
const __newCharacterExpandedBase=newCharacter;
newCharacter=async function(x){await __newCharacterExpandedBase(x);if(!isAdvancedProject()){let boxes=[...document.querySelectorAll('#modalCard .linkedBox')];boxes.filter(b=>b.textContent.includes('캐릭터송 / 음악')).forEach(b=>b.remove())}};
const __renderSettingsExpandedBase=renderSettings;
renderSettings=function(){__renderSettingsExpandedBase();if(!isAdvancedProject())document.querySelectorAll('#settingsList .meta').forEach(e=>{if(e.textContent.includes('🎵 음악'))e.remove()})};
const __renderCharactersExpandedBase=renderCharacters;
renderCharacters=async function(){await __renderCharactersExpandedBase();if(!isAdvancedProject())document.querySelectorAll('#charactersList .pill').forEach(e=>{if(e.textContent.includes('캐릭터송'))e.remove()})};
const __viewDocExpandedBase=viewDoc;
viewDoc=async function(kind,id){await __viewDocExpandedBase(kind,id);let x=getDoc(kind,id);if(x&&!isAdvancedProject(x.project)){document.querySelectorAll('#modalCard .detailSection').forEach(s=>{let l=s.querySelector('.detailLabel')?.textContent.trim();if(l==='음악'||l==='캐릭터송')s.remove()})}};
const __pdfMetaRowsExpandedBase=pdfMetaRows;
pdfMetaRows=function(kind,x){let rows=__pdfMetaRowsExpandedBase(kind,x);if(!isAdvancedProject(x.project))rows=rows.filter(([k])=>k!=='음악');return rows};
const __pdfMetaTableExpandedBase=pdfMetaTableHtml;
pdfMetaTableHtml=function(kind,x){if(kind!=='characters'||isAdvancedProject(x.project))return __pdfMetaTableExpandedBase(kind,x);const pairs=[['상태',x.status||'아이디어'],['나이',x.age||'미정'],['역할/직업',x.role||'미정'],['종족',getDoc('settings',x.raceId)?.title||'미지정'],['지역',getDoc('settings',x.regionId)?.title||'미지정'],['태그',x.tags||'없음'],['관계/소속',characterRelationHtml(x)],['','']];let rows='';for(let i=0;i<pairs.length;i+=2){let a=pairs[i],b=pairs[i+1];rows+=`<tr><th>${esc(a[0])}</th><td>${a[0]==='관계/소속'?a[1]:esc(a[1])}</td>${b[0]?`<th>${esc(b[0])}</th><td>${b[0]==='관계/소속'?b[1]:esc(b[1])}</td>`:'<th></th><td></td>'}</tr>`}return `<table class="metaTable metaTableWide characterMetaTable"><tbody>${rows}</tbody></table>`};

// 프로젝트 삭제/복원 묶음에 일기 포함
const __trashProjectExpandedBase=trashProject;
trashProject=function(pid){let p=projectById(pid);if(!p)return;let diaries=(db.diaries||[]).filter(x=>x.project===pid);if(!diaries.length)return __trashProjectExpandedBase(pid);if(!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','images','sources','stories','timeline','serials','storyFolders','quickMemos','diaries','pictureDiaries']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()};


// ===== 고급 프로젝트 전용: 10초 이내 짧은 동영상 =====
const VIDEO_MAX_SECONDS=10.15;
const VIDEO_MAX_BYTES=30*1024*1024;
function formatBytes(n=0){if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(1)+' KB';return (n/1024/1024).toFixed(1)+' MB'}
function formatDuration(sec=0){return Number.isFinite(Number(sec))?Number(sec).toFixed(1)+'초':'-'}
function readVideoDuration(file){return new Promise((resolve,reject)=>{let u=URL.createObjectURL(file),v=document.createElement('video');let done=()=>{try{URL.revokeObjectURL(u)}catch(_){};v.remove()};v.preload='metadata';v.onloadedmetadata=()=>{let d=v.duration;done();Number.isFinite(d)?resolve(d):reject(new Error('duration'))};v.onerror=()=>{done();reject(new Error('metadata'))};v.src=u})}
async function validateVideoFile(file){if(!file)return null;if(file.size>VIDEO_MAX_BYTES){alert('동영상은 최대 30MB까지 넣을 수 있습니다.');return null}let duration=0;try{duration=await readVideoDuration(file)}catch(_){alert('이 동영상의 재생 시간을 확인할 수 없습니다. MP4 등 일반적인 형식을 사용해 주세요.');return null}if(duration>VIDEO_MAX_SECONDS){alert(`동영상은 10초 이내만 사용할 수 있습니다.\n선택한 영상: ${duration.toFixed(1)}초`);return null}return duration}
function videoControlsHtml(){return controls('videos','짧은 동영상','newVideo','제목/태그/메모 검색...')}
const __setupSectionsVideoBase=setupSections;
setupSections=function(){__setupSectionsVideoBase();let h=document.getElementById('projectVideos');if(h)h.innerHTML=videoControlsHtml()};

async function newVideo(x){
  if(!isAdvancedProject())return alert('동영상은 고급 프로젝트에서만 사용할 수 있습니다.');
  if(typeof x==='string')x=decodeObj(x);x=x||{id:uid(),title:'',tags:'',note:'',favorite:false,fileName:'',fileType:'',size:0,duration:0,project:currentProjectId,created:Date.now(),updated:Date.now()};
  let data=x.fileName?await getFile(x.id):'';window._editingVideo={data:'',file:null,duration:x.duration||0};
  openModal(`<div class="stack"><h2>${x.fileName?'동영상 수정':'새 동영상'}</h2><input id="vtitle" placeholder="제목" value="${esc(x.title||'')}"><label class="checkRow"><input id="vfav" type="checkbox" ${x.favorite?'checked':''}> 즐겨찾기</label><input id="vtags" placeholder="태그" value="${esc(x.tags||'')}"><textarea id="vnote" style="min-height:110px" placeholder="메모">${esc(x.note||'')}</textarea><div class="linkedBox videoPreviewBox"><b>짧은 동영상</b><div class="videoLimitNote">최대 10초 · 최대 30MB. 고급 프로젝트에서만 저장됩니다. MP4 형식을 권장합니다.</div><label class="btn" style="text-align:center">${x.fileName?'영상 교체':'동영상 선택'}<input id="vfile" type="file" accept="video/*,.mp4,.webm,.m4v" hidden></label><div id="videoPreview">${data?`<video class="videoPlayer" controls preload="metadata" src="${data}"></video><div class="meta videoFileName">${esc(x.fileName)} · ${formatDuration(x.duration)} · ${formatBytes(x.size)}</div>`:'<div class="empty">동영상을 선택해 주세요.</div>'}</div></div><div class="right">${x.fileName?`<button onclick="downloadStoredFile('${x.id}','${esc(x.fileName||x.title+'.mp4')}')">원본 저장</button><button class="danger" onclick="trashItem('videos','${x.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveVideo('${x.id}')">저장</button></div></div>`);
  document.getElementById('vfile').onchange=async e=>{let f=e.target.files?.[0];if(!f)return;let d=await validateVideoFile(f);if(d==null){e.target.value='';return}let data=await fileToData(f);window._editingVideo={data,file:f,duration:d};document.getElementById('videoPreview').innerHTML=`<video class="videoPlayer" controls preload="metadata" src="${data}"></video><div class="meta videoFileName">${esc(f.name)} · ${formatDuration(d)} · ${formatBytes(f.size)}</div>`};
}
async function saveVideo(id){if(!isAdvancedProject())return alert('고급 프로젝트에서만 저장할 수 있습니다.');let title=v('vtitle').trim();if(!title)return alert('제목을 입력해 주세요.');let old=(db.videos||[]).find(x=>x.id===id),ed=window._editingVideo||{};if(!old&&!ed.file)return alert('동영상을 선택해 주세요.');if(ed.file&&ed.data)await putFile(id,ed.data);let f=ed.file;upsert('videos',{...old,id,title,tags:v('vtags'),note:v('vnote'),favorite:!!document.getElementById('vfav')?.checked,fileName:f?.name||old?.fileName||title+'.mp4',fileType:f?.type||old?.fileType||'video/mp4',size:f?.size||old?.size||0,duration:f?ed.duration:(old?.duration||0),project:currentProjectId,created:old?.created||Date.now(),updated:Date.now()},false);window._editingVideo=null;closeModal();renderVideos();renderProjects()}
async function viewVideo(id){let x=(db.videos||[]).find(z=>z.id===id);if(!x)return alert('동영상을 찾을 수 없습니다.');let d=await getFile(x.id);openModal(`<div class="stack"><div class="detailHead"><div style="min-width:0"><div class="detailTitle">${esc(x.title||'동영상')}</div><div class="detailMeta">${formatDuration(x.duration)} · ${formatBytes(x.size)}</div></div></div>${x.tags?`<div class="chips">${tags(x.tags)}</div>`:''}<div class="detailSection">${d?`<video class="videoPlayer" controls preload="metadata" src="${d}"></video>`:'<div class="empty">동영상 파일을 불러올 수 없습니다.</div>'}</div><div class="detailSection"><div class="detailLabel">메모</div><div class="detailBody">${x.note?esc(x.note).replace(/\n/g,'<br>'):'메모가 없습니다.'}</div></div><div class="detailFooter"><span></span><button onclick="closeModal()">닫기</button><button onclick="downloadStoredFile('${x.id}','${esc(x.fileName||x.title+'.mp4')}')">원본 저장</button><button class="primary" onclick="closeModal();newVideo(${encodeObj(x)})">수정</button></div></div>`)}
async function renderVideos(){let host=document.getElementById('videosList');if(!host)return;if(!isAdvancedProject()){host.innerHTML='<div class="empty">동영상은 고급 프로젝트에서만 사용할 수 있습니다.</div>';return}let a=listData('videos',['title','tags','note','fileName']),blocks=[];for(let x of a)blocks.push(`<div class="videoCard ${x.favorite?'favorite':''}" onclick="viewVideo('${x.id}')"><div class="videoIcon">🎬</div><div class="videoInfo"><div class="videoTitle">${esc(x.title||'동영상')}</div><div class="videoMeta">${formatDuration(x.duration)} · ${formatBytes(x.size)}${x.tags?' · '+esc(x.tags):''}</div>${x.note?`<div class="snippet">${esc(x.note)}</div>`:''}</div><div class="videoFav">${favButton('videos',x)}</div></div>`);host.className='videoList';host.innerHTML=blocks.length?blocks.join(''):'<div class="empty">등록된 동영상이 없습니다.</div>'}

const __kindLabelVideoBase=kindLabel;kindLabel=function(k){return k==='videos'?'동영상':__kindLabelVideoBase(k)};
const __projectTypeVisibleTabsVideoBase=projectTypeVisibleTabs;projectTypeVisibleTabs=function(type){let a=__projectTypeVisibleTabsVideoBase(type);if(type==='advanced'&&!a.includes('videos')){let i=a.indexOf('images');a=[...a];a.splice(i>=0?i+1:a.length,0,'videos')}return a};
expandedProjectStatsHtml=function(p){let t=p.projectType||'general',items=[];if(t==='memo')items=[['메모',(db.quickMemos||[]).filter(x=>x.project===p.id).length]];else if(t==='diary')items=[['일기',(db.diaries||[]).filter(x=>x.project===p.id).length],['그림일기',(db.pictureDiaries||[]).filter(x=>x.project===p.id).length]];else{items=[['설정',cnt('settings',p.id)],['캐릭터',cnt('characters',p.id)],['썰',cnt('stories',p.id)],['연재본',cnt('serials',p.id)]];if(t==='advanced')items.push(['영상',cnt('videos',p.id)]);if(t!=='short')items.push(['관계도',cnt('relations',p.id)],['타임라인',cnt('timeline',p.id)])}return `<div class="projectStats">${items.map(([k,v])=>`<span class="statPill">${k} ${v}</span>`).join('')}</div>`};projectStatsHtml=expandedProjectStatsHtml;
const __renderProjectAllVideoBase=renderProjectAll;renderProjectAll=function(){__renderProjectAllVideoBase();renderVideos()};

// 동영상 파일까지 JSON 백업에 포함
exportData=async function(){let b=JSON.parse(JSON.stringify(db));b._fileData={};for(let x of[...(db.images||[]),...(db.sources||[]),...(db.videos||[])]){let d=await getFile(x.id);if(d)b._fileData[x.id]=d}for(let x of(db.pictureDiaries||[])){if(!x.imageId)continue;let d=await getFile(x.imageId);if(d)b._fileData[x.imageId]=d}for(let group of [db.characters||[],db.settings||[]])for(let c of group)for(let m of(c.musicTracks||[])){let d=await getFile(m.id);if(d)b._fileData[m.id]=d}appSaveBlob(new Blob([JSON.stringify(b)],{type:'application/json'}),'창작소_내손안에이야기_백업.json');localStorage.setItem(LAST_BACKUP_KEY,String(Date.now()));renderLastBackup()};

// 프로젝트/휴지통 처리에도 동영상 파일 포함
trashProject=function(pid){let p=projectById(pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','images','videos','sources','stories','timeline','serials','storyFolders','quickMemos','diaries','pictureDiaries']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()};
purgeTrash=async function(id){let t=db.trash.find(x=>x.id===id);if(!t)return;if(!confirm('영구 삭제하시겠습니까? 삭제 후에는 복원할 수 없습니다.'))return;let ids=[];if(['images','sources','videos'].includes(t.kind))ids=[t.data.id];if(t.kind==='characters'||t.kind==='settings')ids=(t.data.musicTracks||[]).map(m=>m.id);if(t.kind==='project'){ids=[...(t.data.items?.images||[]),...(t.data.items?.sources||[]),...(t.data.items?.videos||[])].map(x=>x.id);ids.push(...(t.data.items?.pictureDiaries||[]).map(x=>x.imageId).filter(Boolean));for(let k of ['characters','settings'])for(let c of(t.data.items?.[k]||[]))ids.push(...(c.musicTracks||[]).map(m=>m.id))}for(let fid of ids)await delFile(fid);db.trash=db.trash.filter(x=>x.id!==id);persist();renderTrash()};
emptyTrash=async function(){if(!db.trash.length||!confirm('휴지통의 모든 항목을 영구 삭제하시겠습니까?'))return;for(let t of [...db.trash]){let ids=t.kind==='project'?[...(t.data.items?.images||[]),...(t.data.items?.sources||[]),...(t.data.items?.videos||[])].map(x=>x.id):(['images','sources','videos'].includes(t.kind)?[t.data.id]:((t.kind==='characters'||t.kind==='settings')?(t.data.musicTracks||[]).map(m=>m.id):[]));if(t.kind==='project'){ids.push(...(t.data.items?.pictureDiaries||[]).map(x=>x.imageId).filter(Boolean));for(let k of ['characters','settings'])for(let c of(t.data.items?.[k]||[]))ids.push(...(c.musicTracks||[]).map(m=>m.id))}for(let fid of ids)await delFile(fid)}db.trash=[];persist();renderTrash()};


// ===== fix8: 프로젝트 유형 표시 / 일기 입력 안정화 / 일기장 타임라인 이미지 =====
const __openModalFix8Base=openModal;
openModal=function(h){
  const m=document.getElementById('modal');
  if(m)m.classList.remove('keyboardStable');
  return __openModalFix8Base(h);
};
const __adjustModalPlacementFix8Base=adjustModalPlacement;
adjustModalPlacement=function(){
  const m=document.getElementById('modal');
  if(m?.classList.contains('keyboardStable')){m.classList.remove('centerShort');return;}
  const a=document.activeElement;
  if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable))return;
  return __adjustModalPlacementFix8Base();
};

// 프로젝트 유형 선택지는 이름만 간결하게 표시합니다.
newProject=function(p){
  if(typeof p==='string')p=decodeObj(p);
  p=p||{id:uid(),name:'',desc:'',color:'#7b61a8',projectType:'general',coverImageId:'',created:Date.now(),updated:Date.now()};
  let imgs=(db.images||[]).filter(x=>x.project===p.id);
  let coverOptions='<option value="">대표 이미지 없음</option>'+imgs.map(x=>`<option value="${x.id}" ${p.coverImageId===x.id?'selected':''}>${esc(x.title||'이미지')}</option>`).join('');
  openModal(`<div class="stack"><h2>${p.name?'프로젝트 수정':'새 프로젝트'}</h2><input id="pname" placeholder="프로젝트 이름" value="${esc(p.name)}"><select id="ptype"><option value="advanced" ${p.projectType==='advanced'?'selected':''}>고급 프로젝트</option><option value="general" ${(p.projectType||'general')==='general'?'selected':''}>일반 프로젝트</option><option value="short" ${p.projectType==='short'?'selected':''}>단편 프로젝트</option><option value="diary" ${p.projectType==='diary'?'selected':''}>일기장</option><option value="memo" ${p.projectType==='memo'?'selected':''}>메모장</option></select><div class="note">프로젝트 유형은 나중에 변경할 수 있으며, 기존 자료는 삭제되지 않습니다.</div><textarea id="pdesc" style="min-height:110px" placeholder="설명">${esc(p.desc||'')}</textarea><input id="pcolor" type="color" value="${esc(p.color||'#7b61a8')}"><div class="projectCoverPicker"><div class="meta">프로젝트 대표 이미지</div><select id="pcover" onchange="previewProjectCover(this.value)">${coverOptions}</select><div id="projectCoverPreview" class="projectCoverPreview"><span class="meta">${imgs.length?'대표 이미지를 선택해 주세요.':'이미지 자료를 등록한 뒤 프로젝트 수정에서 선택할 수 있습니다.'}</span></div></div><div class="right">${p.name?`<button class="danger" onclick="trashProject('${p.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveProject('${p.id}')">저장</button></div></div>`);
  setTimeout(()=>{syncAppSelect(document.getElementById('ptype'));syncAppSelect(document.getElementById('pcover'));previewProjectCover(p.coverImageId||'')},30);
};
saveProject=function(id){
  let name=v('pname').trim();if(!name)return alert('프로젝트 이름을 입력해 주세요.');
  let old=db.projects.find(x=>x.id===id),type=v('ptype')||'general';
  upsert('projects',{...old,id,name,desc:v('pdesc'),color:v('pcolor'),projectType:type,projectTypeVersion:3,coverImageId:v('pcover')||'',created:old?.created||Date.now(),updated:Date.now()});
  closeModal();if(currentProjectId===id)openProject(id);
};

// 모션 래퍼가 늦게 프로젝트 설명을 다시 쓰므로, 실제 화면 전환 뒤 유형 배지를 다시 확정합니다.
const __openProjectFix8Base=openProject;
openProject=function(id){
  __openProjectFix8Base(id);
  const refresh=()=>{
    const p=projectById(id);if(!p||currentProjectId!==id)return;
    const desc=document.getElementById('projectDesc');
    if(desc)desc.innerHTML=`<span class="typeBadge">${projectTypeLabel(p.projectType)}</span> ${esc(p.desc||'설명 없음')}`;
    applyExpandedProjectType(p);
    renderDiaries();renderPictureDiaries();renderTimeline();
  };
  setTimeout(refresh,190);setTimeout(refresh,320);
};

// 일기장은 일기장 / 그림일기장 / 타임라인만 사용합니다.
const __projectTypeVisibleTabsFix8Base=projectTypeVisibleTabs;
projectTypeVisibleTabs=function(type){
  if(type==='diary')return ['diaries','pictureDiaries','timeline','calendar'];
  return __projectTypeVisibleTabsFix8Base(type);
};
const __applyExpandedProjectTypeFix8Base=applyExpandedProjectType;
applyExpandedProjectType=function(p){
  __applyExpandedProjectTypeFix8Base(p);
  const diary=p?.projectType==='diary';
  const d=document.querySelector('[data-subtab="diaries"]'),pd=document.querySelector('[data-subtab="pictureDiaries"]');
  if(d)d.textContent=diary?'일기장':'일기';
  if(pd)pd.textContent=diary?'그림일기장':'그림일기';
};
expandedProjectStatsHtml=function(p){
  let t=p.projectType||'general',items=[];
  if(t==='memo')items=[['메모',(db.quickMemos||[]).filter(x=>x.project===p.id).length]];
  else if(t==='diary')items=[['일기',(db.diaries||[]).filter(x=>x.project===p.id).length],['그림일기',(db.pictureDiaries||[]).filter(x=>x.project===p.id).length],['타임라인',cnt('timeline',p.id)]];
  else{items=[['설정',cnt('settings',p.id)],['캐릭터',cnt('characters',p.id)],['썰',cnt('stories',p.id)],['연재본',cnt('serials',p.id)]];if(t==='advanced')items.push(['영상',cnt('videos',p.id)]);if(t!=='short')items.push(['관계도',cnt('relations',p.id)],['타임라인',cnt('timeline',p.id)])}
  return `<div class="projectStats">${items.map(([k,v])=>`<span class="statPill">${k} ${v}</span>`).join('')}</div>`;
};
projectStatsHtml=expandedProjectStatsHtml;

// 일기장 작성창은 짧을 때 화면 중앙에 표시합니다.
function centerDiaryEntryModal(){const m=document.getElementById('modal');if(!m)return;m.classList.add('keyboardStable','diaryEntryCenter');m.classList.remove('centerShort')}

// Android WebView에서 키보드가 닫히지 않도록 일기 편집 중에는 모달 재배치를 멈춥니다.
newDiary=function(x){
  if(typeof x==='string')x=decodeObj(x);
  x=x||{id:uid(),title:'',date:todayLocal(),body:'',bodyHtml:'',project:currentProjectId,created:Date.now(),updated:Date.now()};
  const exists=(db.diaries||[]).some(d=>d.id===x.id);
  openModal(`<div class="stack"><h2>${exists?'일기 수정':'새 일기'}</h2><input id="diaryDate" type="date" value="${esc(x.date||todayLocal())}"><input id="diaryTitle" placeholder="제목 (선택)" value="${esc(x.title||'')}"><textarea id="diaryBody" class="diaryStableInput" rows="12" placeholder="오늘의 기록을 작성해 주세요.">${esc(x.body||'')}</textarea><div class="right">${exists?`<button class="danger" onclick="deleteDiary('${x.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveDiary('${x.id}')">저장</button></div></div>`);
  centerDiaryEntryModal();
};

// 일기장 타임라인은 글과 이미지 한 장을 함께 저장할 수 있습니다.
const __newTimelineFix8Base=newTimeline;
const __saveTimelineFix8Base=saveTimeline;
const __renderTimelineFix8Base=renderTimeline;
async function timelineImageData(id){return id?await getFile(id):''}
newTimeline=async function(t){
  if(currentProjectType()!=='diary')return __newTimelineFix8Base(t);
  if(typeof t==='string')t=decodeObj(t);
  t=t||{id:uid(),title:'',dateLabel:todayLocal(),order:'',tags:'',body:'',status:'아이디어',favorite:false,linkedIds:[],timelineImageId:'',project:currentProjectId};
  const existing=t.timelineImageId?await timelineImageData(t.timelineImageId):'';
  window._editingDiaryTimelineImage={imageId:t.timelineImageId||'',data:''};
  openModal(`<div class="stack"><h2>${getDoc('timeline',t.id)?'타임라인 수정':'새 타임라인'}</h2><input id="lttitle" placeholder="제목" value="${esc(t.title||'')}"><input id="ltdate" type="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(t.dateLabel||'')?esc(t.dateLabel):todayLocal()}"><input id="lttags" placeholder="태그" value="${esc(t.tags||'')}"><textarea id="ltbodyDiary" class="diaryStableInput" rows="10" placeholder="기록할 내용을 작성해 주세요.">${esc(t.body||'')}</textarea><div class="linkedBox"><b>이미지</b><div class="meta">타임라인 기록에 이미지 한 장을 함께 첨부할 수 있습니다.</div><label class="btn" style="text-align:center">이미지 선택<input id="ltDiaryFile" type="file" accept="image/*" hidden></label><div id="ltDiaryPreview" class="pictureDiaryPreview">${existing?`<img src="${existing}">`:'<span class="meta">선택된 이미지가 없습니다.</span>'}</div></div><div class="right">${getDoc('timeline',t.id)?`<button class="danger" onclick="trashItem('timeline','${t.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveTimeline('${t.id}')">저장</button></div></div>`);
  centerDiaryEntryModal();
  const fi=document.getElementById('ltDiaryFile');if(fi)fi.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const data=await fileToData(f);window._editingDiaryTimelineImage={imageId:t.timelineImageId||'',data};document.getElementById('ltDiaryPreview').innerHTML=`<img src="${data}">`};
};
saveTimeline=async function(id){
  if(currentProjectType()!=='diary')return __saveTimelineFix8Base(id);
  const title=v('lttitle').trim();if(!title)return alert('제목을 입력해 주세요.');
  const old=getDoc('timeline',id)||{},edit=window._editingDiaryTimelineImage||{};
  let imageId=old.timelineImageId||edit.imageId||'';
  if(edit.data){if(!imageId)imageId='dtimeline_'+uid();await putFile(imageId,edit.data)}
  upsert('timeline',{...old,id:id||uid(),title,dateLabel:v('ltdate')||todayLocal(),order:old.order||'',tags:v('lttags'),body:v('ltbodyDiary'),bodyHtml:'',timelineImageId:imageId,project:currentProjectId,updated:Date.now(),...commonData(old)});
  window._editingDiaryTimelineImage=null;closeModal();renderTimeline();renderProjects();
};
renderTimeline=async function(){
  if(currentProjectType()!=='diary')return __renderTimelineFix8Base();
  const host=document.getElementById('timelineList');if(!host)return;
  let a=listData('timeline',['title','dateLabel','tags','body','status']);
  a=[...a].sort((x,y)=>String(y.dateLabel||'').localeCompare(String(x.dateLabel||''))||(y.updated||0)-(x.updated||0));
  let blocks=[];
  for(const x of a){const d=x.timelineImageId?await getFile(x.timelineImageId):'';blocks.push(`<div class="item diaryTimelineItem ${d?'hasImage ':''}${x.favorite?'favorite':''}" onclick="newTimeline(${encodeObj(x)})">${d?`<img class="diaryTimelineThumb" src="${d}" alt="">`:''}<div class="itemBody"><div class="itemTitleLine"><span class="itemTitle">${esc(x.title)}</span>${x.status?`<span class="status">${esc(x.status)}</span>`:''}</div><div class="meta">${esc(x.dateLabel||'날짜 미정')}</div>${x.tags?tags(x.tags):''}<div class="snippet">${esc(x.body||'내용 없음')}</div></div></div>`)}
  host.innerHTML=blocks.length?blocks.join(''):'<div class="empty">등록된 타임라인 기록이 없습니다.</div>';
};

// 일기장 타임라인 이미지도 백업 파일에 포함합니다.
const __exportDataFix8Base=exportData;
exportData=async function(){
  let b=JSON.parse(JSON.stringify(db));b._fileData={};
  for(let x of[...(db.images||[]),...(db.sources||[]),...(db.videos||[])]){let d=await getFile(x.id);if(d)b._fileData[x.id]=d}
  for(let x of(db.pictureDiaries||[])){if(x.imageId){let d=await getFile(x.imageId);if(d)b._fileData[x.imageId]=d}}
  for(let x of(db.timeline||[])){if(x.timelineImageId){let d=await getFile(x.timelineImageId);if(d)b._fileData[x.timelineImageId]=d}}
  for(let group of [db.characters||[],db.settings||[]])for(let c of group)for(let m of(c.musicTracks||[])){let d=await getFile(m.id);if(d)b._fileData[m.id]=d}
  appSaveBlob(new Blob([JSON.stringify(b)],{type:'application/json'}),'창작소_내손안에이야기_백업.json');localStorage.setItem(LAST_BACKUP_KEY,String(Date.now()));renderLastBackup();
};



// ===== fix9: 일기장 검색 입력 안정화 =====
// 검색 중 목록 전체를 다시 그리면 Android WebView에서 input이 교체되어
// 포커스/키보드가 끊기므로 검색창은 유지하고 결과 목록만 갱신합니다.
function renderDiarySearchResults(){
  const host=document.getElementById('projectDiaries');if(!host)return;
  const input=document.getElementById('diarySearch');
  const q=(input?.value||'').toLowerCase();
  let arr=(db.diaries||[]).filter(x=>x.project===currentProjectId&&`${x.title||''} ${x.body||''} ${x.date||''}`.toLowerCase().includes(q)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.updated||0)-(a.updated||0));
  const shown=arr.slice(0,limits.diaries||20),list=host.querySelector('.diaryList'),more=host.querySelector('.diaryMore');
  if(list)list.innerHTML=shown.length?shown.map(x=>`<div class="diaryCard" onclick="newDiary(${encodeObj(x)})"><div class="diaryDate">${esc(x.date||'날짜 없음')}</div>${x.title?`<div class="diaryTitle">${esc(x.title)}</div>`:''}<div class="diaryBody">${esc(x.body||'내용 없음')}</div></div>`).join(''):'<div class="empty">아직 작성한 일기가 없습니다.</div>';
  if(more){more.classList.toggle('hidden',arr.length<=(limits.diaries||20));more.textContent='더 보기 +20'}
}
renderDiaries=function(){
  const host=document.getElementById('projectDiaries');if(!host)return;
  if(host.dataset.project!==String(currentProjectId||'')){
    host.dataset.project=String(currentProjectId||'');
    host.innerHTML='';
  }
  if(!document.getElementById('diarySearch')){
    host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0 0 4px">일기장</h3><div class="meta">날짜별로 가볍게 기록하는 공간입니다.</div></div><button class="primary" onclick="newDiary()">+ 새 일기</button></div><div class="toolbar"><input id="diarySearch" class="search" placeholder="날짜/제목/내용 검색..."></div><div class="diaryList"></div><button class="loadMore diaryMore hidden" onclick="limits.diaries=(limits.diaries||20)+20;renderDiarySearchResults()">더 보기 +20</button>`;
    const input=document.getElementById('diarySearch');
    if(input)input.addEventListener('input',()=>{limits.diaries=20;renderDiarySearchResults()});
  }
  renderDiarySearchResults();
};

// 그림일기 검색도 같은 방식으로 고정해 두어 동일한 포커스 문제가 생기지 않게 합니다.
async function renderPictureDiarySearchResults(){
  const host=document.getElementById('projectPictureDiaries');if(!host)return;
  const input=document.getElementById('pictureDiarySearch');
  const q=(input?.value||'').toLowerCase();
  let arr=(db.pictureDiaries||[]).filter(x=>x.project===currentProjectId&&`${x.title||''} ${x.body||''} ${x.date||''}`.toLowerCase().includes(q)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.updated||0)-(a.updated||0));
  const shown=arr.slice(0,limits.pictureDiaries||20),list=host.querySelector('.pictureDiaryList'),more=host.querySelector('.pictureDiaryMore');
  let blocks=[];
  for(const x of shown){const d=x.imageId?await getFile(x.imageId):'';blocks.push(`<div class="pictureDiaryCard" onclick="newPictureDiary(${encodeObj(x)})">${d?`<img src="${d}" alt="">`:'<div class="pictureDiaryPreview"><span class="meta">이미지 없음</span></div>'}<div><div class="pictureDiaryDate">${esc(x.date||'날짜 없음')}</div>${x.title?`<div class="pictureDiaryTitle">${esc(x.title)}</div>`:''}<div class="pictureDiaryBody">${esc(x.body||'내용 없음')}</div></div></div>`)}
  if(list)list.innerHTML=blocks.length?blocks.join(''):'<div class="empty">아직 작성한 그림일기가 없습니다.</div>';
  if(more){more.classList.toggle('hidden',arr.length<=(limits.pictureDiaries||20));more.textContent='더 보기 +20'}
}
renderPictureDiaries=async function(){
  const host=document.getElementById('projectPictureDiaries');if(!host)return;
  if(host.dataset.project!==String(currentProjectId||'')){
    host.dataset.project=String(currentProjectId||'');
    host.innerHTML='';
  }
  if(!document.getElementById('pictureDiarySearch')){
    host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0 0 4px">그림일기장</h3><div class="meta">이미지와 글을 함께 기록할 수 있습니다.</div></div><button class="primary" onclick="newPictureDiary()">+ 새 그림일기</button></div><div class="toolbar"><input id="pictureDiarySearch" class="search" placeholder="날짜/제목/내용 검색..."></div><div class="pictureDiaryList"></div><button class="loadMore pictureDiaryMore hidden" onclick="limits.pictureDiaries=(limits.pictureDiaries||20)+20;renderPictureDiarySearchResults()">더 보기 +20</button>`;
    const input=document.getElementById('pictureDiarySearch');
    if(input)input.addEventListener('input',()=>{limits.pictureDiaries=20;renderPictureDiarySearchResults()});
  }
  await renderPictureDiarySearchResults();
};



// ===== fix10: 일기장 캘린더 =====
let diaryCalendarCursor=null,diaryCalendarSelected=null;
function diaryCalendarDateString(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function diaryCalendarParseDate(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?{y:+m[1],m:+m[2]-1,d:+m[3]}:null}
function diaryCalendarToday(){const n=new Date();return diaryCalendarDateString(n.getFullYear(),n.getMonth(),n.getDate())}
function diaryCalendarEntries(date){
  const out=[];
  for(const x of(db.diaries||[]))if(x.project===currentProjectId&&x.date===date)out.push({kind:'diary',x});
  for(const x of(db.pictureDiaries||[]))if(x.project===currentProjectId&&x.date===date)out.push({kind:'picture',x});
  for(const x of(db.timeline||[]))if(x.project===currentProjectId&&String(x.dateLabel||'').slice(0,10)===date)out.push({kind:'timeline',x});
  return out.sort((a,b)=>(b.x.updated||0)-(a.x.updated||0));
}
function diaryCalendarOpenEntry(kind,id){
  if(kind==='diary'){const x=(db.diaries||[]).find(z=>z.id===id);if(x)newDiary(x)}
  else if(kind==='picture'){const x=(db.pictureDiaries||[]).find(z=>z.id===id);if(x)newPictureDiary(x)}
  else {const x=getDoc('timeline',id);if(x)newTimeline(x)}
}
function diaryCalendarNew(kind,date){
  if(kind==='diary')newDiary({id:uid(),title:'',date,body:'',project:currentProjectId,created:Date.now(),updated:Date.now()});
  else if(kind==='picture')newPictureDiary({id:uid(),title:'',date,body:'',imageId:'',project:currentProjectId,created:Date.now(),updated:Date.now()});
  else newTimeline({id:uid(),title:'',dateLabel:date,tags:'',body:'',status:'아이디어',favorite:false,linkedIds:[],project:currentProjectId});
}
function diaryCalendarMove(delta){
  if(!diaryCalendarCursor){const n=new Date();diaryCalendarCursor={y:n.getFullYear(),m:n.getMonth()}}
  diaryCalendarCursor.m+=delta;
  while(diaryCalendarCursor.m<0){diaryCalendarCursor.m+=12;diaryCalendarCursor.y--}
  while(diaryCalendarCursor.m>11){diaryCalendarCursor.m-=12;diaryCalendarCursor.y++}
  renderDiaryCalendar();
}
function diaryCalendarGoToday(){const n=new Date();diaryCalendarCursor={y:n.getFullYear(),m:n.getMonth()};diaryCalendarSelected=diaryCalendarToday();renderDiaryCalendar()}
function diaryCalendarSelect(date){diaryCalendarSelected=date;const p=diaryCalendarParseDate(date);if(p)diaryCalendarCursor={y:p.y,m:p.m};renderDiaryCalendar()}
function renderDiaryCalendarSelected(){
  const host=document.getElementById('calendarSelected');if(!host)return;
  const date=diaryCalendarSelected||diaryCalendarToday(),items=diaryCalendarEntries(date);
  const rows=items.map(({kind,x})=>{const label=kind==='diary'?'일기':kind==='picture'?'그림일기':'타임라인';const title=x.title||x.dateLabel||'제목 없음';const body=x.body||'';return `<div class="calendarEntry" onclick="diaryCalendarOpenEntry('${kind}','${x.id}')"><div class="calendarEntryType">${label}</div><div class="calendarEntryTitle">${esc(title)}</div>${body?`<div class="calendarEntryBody">${esc(body)}</div>`:''}</div>`}).join('');
  host.innerHTML=`<div class="calendarSelectedHead"><div><b>${esc(date)}</b><div class="meta">${items.length?`${items.length}개의 기록이 있습니다.`:'기록이 없습니다.'}</div></div><div class="calendarQuickActions"><button onclick="diaryCalendarNew('diary','${date}')">+ 일기</button><button onclick="diaryCalendarNew('picture','${date}')">+ 그림일기</button><button onclick="diaryCalendarNew('timeline','${date}')">+ 타임라인</button></div></div><div>${rows||'<div class="empty" style="padding:20px 12px">이 날짜에는 아직 기록이 없습니다.</div>'}</div>`;
}
function renderDiaryCalendar(){
  const host=document.getElementById('projectCalendar');if(!host||currentProjectType()!=='diary')return;
  // Re-entry hardening: never inherit an expanded intrinsic width from a previous calendar render.
  host.style.width='100%';host.style.maxWidth='100%';host.style.minWidth='0';host.style.overflowX='hidden';
  if(!diaryCalendarCursor){const n=new Date();diaryCalendarCursor={y:n.getFullYear(),m:n.getMonth()}}
  if(!diaryCalendarSelected)diaryCalendarSelected=diaryCalendarToday();
  const y=diaryCalendarCursor.y,m=diaryCalendarCursor.m,first=new Date(y,m,1),start=first.getDay(),days=new Date(y,m+1,0).getDate(),prevDays=new Date(y,m,0).getDate(),today=diaryCalendarToday();
  const cells=[];
  for(let i=0;i<42;i++){
    let cy=y,cm=m,day=i-start+1,outside=false;
    if(day<1){cm=m-1;if(cm<0){cm=11;cy--}day=prevDays+day;outside=true}
    else if(day>days){day-=days;cm=m+1;if(cm>11){cm=0;cy++}outside=true}
    const date=diaryCalendarDateString(cy,cm,day),entries=diaryCalendarEntries(date),hasD=entries.some(e=>e.kind==='diary'),hasP=entries.some(e=>e.kind==='picture'),hasT=entries.some(e=>e.kind==='timeline');
    cells.push(`<button type="button" class="calendarDay${outside?' outside':''}${date===today?' today':''}${date===diaryCalendarSelected?' selected':''}" onclick="diaryCalendarSelect('${date}')"><span class="calendarDateNum">${day}</span>${entries.length?`<span class="calendarCount">${entries.length}</span>`:''}<span class="calendarMarks">${hasD?'<i class="calendarMark"></i>':''}${hasP?'<i class="calendarMark picture"></i>':''}${hasT?'<i class="calendarMark timeline"></i>':''}</span></button>`)
  }
  host.replaceChildren();
  host.innerHTML=`<div class="diaryCalendarWrap"><div class="calendarHead"><div class="calendarNav"><button onclick="diaryCalendarMove(-1)">‹</button><button onclick="diaryCalendarGoToday()">오늘</button><button onclick="diaryCalendarMove(1)">›</button></div><div class="calendarHeadTitle">${y}년 ${m+1}월</div></div><div class="calendarLegend"><span><i></i>일기</span><span class="pic"><i></i>그림일기</span><span class="tl"><i></i>타임라인</span></div><div class="calendarWeek"><div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div></div><div class="calendarGrid">${cells.join('')}</div><div id="calendarSelected" class="calendarSelected"></div></div>`;
  renderDiaryCalendarSelected();
}
const __renderProjectAllCalendarBase=renderProjectAll;
renderProjectAll=function(){__renderProjectAllCalendarBase();renderDiaryCalendar()};
setTimeout(()=>{const b=document.querySelector('[data-subtab="calendar"]');if(b)b.addEventListener('click',()=>setTimeout(renderDiaryCalendar,0))},0);


// ===== fix14: 안정화 / 실사용 편의 / 그룹 / 인물 관계 =====
const ICON_COLORS={default:'기본',red:'빨강',orange:'주황',yellow:'노랑',green:'초록',blue:'파랑',purple:'보라',pink:'분홍'};
function creativeStatusValue(v){return /완성|완료/.test(String(v||''))?'완성':'초안'}
function setCreativeStatusSelect(){const s=document.getElementById('xstatus');if(!s)return;const val=creativeStatusValue(s.value);s.innerHTML=`<option value="초안" ${val==='초안'?'selected':''}>초안</option><option value="완성" ${val==='완성'?'selected':''}>완성</option>`;syncAppSelect(s)}
function groupName(x){return String(x?.group||'').trim()||'미분류'}
function groupWrap(groups,render){return [...groups.entries()].map(([name,items])=>`<details class="groupBlock" open><summary><span>${esc(name)}</span><span class="groupCount">${items.length}개</span></summary><div class="groupItems">${render(items)}</div></details>`).join('')}
function groupMap(arr){const m=new Map();for(const x of arr){const g=groupName(x);if(!m.has(g))m.set(g,[]);m.get(g).push(x)}return m}

const __openModalFix14=openModal;
openModal=function(h){__openModalFix14(h);const c=document.getElementById('modalCard');if(c){c.scrollTop=0;requestAnimationFrame(()=>{c.scrollTop=0})}}

const __newSettingFix14=newSetting;
newSetting=async function(x){await __newSettingFix14(x);const obj=typeof x==='string'?decodeObj(x):(x||{});const anchor=document.getElementById('stitle')?.closest('.row');if(anchor&&!document.getElementById('sgroup'))anchor.insertAdjacentHTML('afterend',`<input id="sgroup" placeholder="그룹 (예: 세계관, 국가, 종족)" value="${esc(obj.group||'')}">`);setCreativeStatusSelect();document.getElementById('modalCard').scrollTop=0}
const __saveSettingFix14=saveSetting;
saveSetting=function(id){const g=v('sgroup'),st=creativeStatusValue(v('xstatus'));__saveSettingFix14(id);const d=getDoc('settings',id);if(d){d.group=g;d.status=st;persist();renderSettings()}}

const __newCharacterFix14=newCharacter;
newCharacter=async function(x){await __newCharacterFix14(x);const obj=typeof x==='string'?decodeObj(x):(x||{});const anchor=document.getElementById('cname')?.closest('.row');if(anchor&&!document.getElementById('cgroup'))anchor.insertAdjacentHTML('afterend',`<input id="cgroup" placeholder="그룹 (예: 주연, 조연, 왕국 A)" value="${esc(obj.group||'')}">`);document.getElementById('modalCard').scrollTop=0}
const __saveCharacterFix14=saveCharacter;
saveCharacter=function(id){const g=v('cgroup');__saveCharacterFix14(id);const d=getDoc('characters',id);if(d){d.group=g;persist();renderCharacters()}}

const __newStoryFix14=newStory;
newStory=async function(x){const obj=typeof x==='string'?decodeObj(x):(x||{});await __newStoryFix14(x);setCreativeStatusSelect();let anchor=document.getElementById('storyFolder')?.closest('.stack')||document.getElementById('ttags');if(anchor&&!document.getElementById('storyIconColor')){const sel=`<div class="stack"><div class="meta">파일 아이콘 색상</div><select id="storyIconColor">${Object.entries(ICON_COLORS).map(([k,n])=>`<option value="${k}" ${(obj.iconColor||'default')===k?'selected':''}>${n}</option>`).join('')}</select></div>`;anchor.insertAdjacentHTML('afterend',sel);syncAppSelect(document.getElementById('storyIconColor'))}const ed=document.getElementById('tbody');if(ed&&!document.getElementById('storyCopyAll')){const bar=document.createElement('div');bar.className='storyCopyBar';bar.innerHTML='<button type="button" id="storyCopyAll" onclick="copyStoryAll()">전체 복사</button>';ed.closest('.richWrap')?.insertAdjacentElement('afterend',bar)}document.getElementById('modalCard').scrollTop=0}
const __saveStoryFix14=saveStory;
saveStory=async function(id){const col=v('storyIconColor')||'default',st=creativeStatusValue(v('xstatus'));await __saveStoryFix14(id);const d=getDoc('stories',id);if(d){d.iconColor=col;d.status=st;persist();renderStories()}}
async function copyStoryAll(){const text=richText('tbody');try{await navigator.clipboard.writeText(text);alert('전체 내용을 복사했습니다.')}catch(_){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('전체 내용을 복사했습니다.')}}

const __newTimelineFix14=newTimeline;
newTimeline=async function(x){const obj=typeof x==='string'?decodeObj(x):(x||{});await __newTimelineFix14(x);let st=document.getElementById('xstatus');if(st)setCreativeStatusSelect();else{let anchor=document.getElementById('lttags');if(anchor&&!document.getElementById('ltCreativeStatus')){anchor.insertAdjacentHTML('beforebegin',`<select id="ltCreativeStatus"><option value="초안" ${creativeStatusValue(obj.status)==='초안'?'selected':''}>초안</option><option value="완성" ${creativeStatusValue(obj.status)==='완성'?'selected':''}>완성</option></select>`);syncAppSelect(document.getElementById('ltCreativeStatus'))}}document.getElementById('modalCard').scrollTop=0}
const __saveTimelineFix14=saveTimeline;
saveTimeline=async function(id){const st=creativeStatusValue(v('ltCreativeStatus')||v('xstatus'));await __saveTimelineFix14(id);const d=getDoc('timeline',id);if(d){d.status=st;persist();renderTimeline()}}

renderSettings=function(){let a=listData('settings',['title','type','tags','body','status','group']);const groups=groupMap(a);settingsList.innerHTML=a.length?groupWrap(groups,items=>items.map(x=>`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('settings','${x.id}')">${itemTop(x.title,creativeStatusValue(x.status),`${esc(x.type)} · ${fmt(x.updated)}`,'settings',x)}<div class="itemBody"><div class="chips"><span class="pill">그룹 · ${esc(groupName(x))}</span></div>${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div>${isAdvancedProject()&&(x.musicTracks||[]).length?`<div class="meta">🎵 음악 ${(x.musicTracks||[]).length}곡</div>`:''}<div class="snippet">${esc(x.body||'내용 없음')}</div></div></div>`).join('')):'<div class="empty">등록된 설정 문서가 없습니다.</div>'}
renderCharacters=async function(){let a=listData('characters',['name','alias','role','tags','body','status','group']),groups=groupMap(a),out=[];for(const [name,items] of groups){let rows=[];for(const c of items){let portrait=c.portraitId?await getFile(c.portraitId):'',race=getDoc('settings',c.raceId)?.title,region=getDoc('settings',c.regionId)?.title,rels=(c.relationIds||[]).map(id=>{let r=getDoc('relations',id);return r?`${r.title}${c.relationRanks?.[id]?' · '+c.relationRanks[id]:''}`:''}).filter(Boolean);rows.push(`<div class="item ${c.favorite?'favorite':''}" onclick="viewDoc('characters','${c.id}')"><div class="characterCardTop ${portrait?'':'characterCardNoImage'}">${portrait?`<img class="characterPortraitBig" src="${portrait}">`:''}<div class="characterSummary"><div class="itemTitleLine"><span class="itemTitle">${esc(c.name)}</span><span class="status">${esc(c.status||'아이디어')}</span></div><div class="meta itemMeta">${esc(c.age||'나이 미정')} · ${esc(c.role||'역할 미정')} · ${fmt(c.updated)}</div>${c.alias?`<div class="meta" style="margin-top:5px">별칭 · ${esc(c.alias)}</div>`:''}</div><div class="characterFav">${favButton('characters',c)}</div></div><div class="itemBody"><div class="chips"><span class="pill">그룹 · ${esc(groupName(c))}</span>${race?`<span class="pill">종족 · ${esc(race)}</span>`:''}${region?`<span class="pill">지역 · ${esc(region)}</span>`:''}${isAdvancedProject()&&(c.musicTracks||[]).length?`<span class="pill">🎵 캐릭터송 ${(c.musicTracks||[]).length}곡</span>`:''}</div>${tags(c.tags)}${rels.length?`<div class="meta">관계/소속 · ${rels.map(esc).join(' · ')}</div>`:''}<div class="chips">${linkedChips(c.linkedIds)}</div><div class="snippet">${esc(c.body||'설정 없음')}</div></div></div>`)}out.push(`<details class="groupBlock" open><summary><span>${esc(name)}</span><span class="groupCount">${items.length}명</span></summary><div class="groupItems">${rows.join('')}</div></details>`)}charactersList.innerHTML=out.length?out.join(''):'<div class="empty">등록된 캐릭터가 없습니다.</div>'}
renderStories=async function(){refreshStoryFolderFilter();let a=listData('stories',['title','tags','body','status']),folder=v('storiesFolderFilter');if(folder==='__none')a=a.filter(x=>!x.folderId);else if(folder)a=a.filter(x=>x.folderId===folder);let blocks=[];for(let x of a){let thumbs=[];for(let iid of(x.imageIds||[]).slice(0,4)){let d=await getFile(iid);if(d)thumbs.push(`<img class="storyThumb" src="${d}">`)}let folderName=storyFolderName(x.folderId),icon=x.iconColor||'default';blocks.push(`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('stories','${x.id}')">${itemTop(x.title,creativeStatusValue(x.status),`${folderName?esc(folderName)+' · ':''}${fmt(x.updated)} · ${(x.body||'').length.toLocaleString()}자`,'stories',x,`<div class="storyFileIcon storyIcon-${icon}">📄</div>`)}<div class="itemBody">${folderName?`<div class="chips"><span class="pill">📁 ${esc(folderName)}</span></div>`:''}${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div>${thumbs.length?`<div class="thumbRow">${thumbs.join('')}</div>`:''}</div></div>`)}storiesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">저장된 썰이 없습니다.</div>';setTimeout(()=>animateStagger(storiesList),20)}

async function duplicateDocSafe(kind,id){const src=getDoc(kind,id);if(!src)return;const copy=JSON.parse(JSON.stringify(src));copy.id=uid();copy.favorite=false;copy.updated=Date.now();copy.created=Date.now();if(kind==='settings'){copy.title=(src.title||'설정')+' 복사본';const tracks=[];for(const m of(src.musicTracks||[])){const data=await getFile(m.id),nm={...m};if(data){nm.id='smusic_'+uid();await putFile(nm.id,data)}tracks.push(nm)}copy.musicTracks=tracks;db.settings.unshift(copy)}else if(kind==='stories'){copy.title=(src.title||'썰')+' 복사본';db.stories.unshift(copy)}else if(kind==='timeline'){copy.title=(src.title||'타임라인')+' 복사본';if(src.timelineImageId){const d=await getFile(src.timelineImageId);if(d){copy.timelineImageId='dtimeline_'+uid();await putFile(copy.timelineImageId,d)}}db.timeline.unshift(copy)}persist();closeModal();renderAll();setTimeout(()=>{({settings:newSetting,stories:newStory,timeline:newTimeline}[kind])(copy)},220)}

function characterPersonRelations(cid){return (db.characterRelations||[]).filter(r=>r.project===currentProjectId&&(r.a===cid||r.b===cid))}
function personRelationDisplay(cid,r){const isA=r.a===cid,target=getDoc('characters',isA?r.b:r.a);if(!target)return'';let arrow=r.direction==='both'?'↔':(isA?'→':'←');return `<div class="personRelationRow"><div class="personRelationMain"><div><span class="personRelationLabel">${esc(r.label||'관계')}</span><span class="personRelationArrow">${arrow}</span>${esc(target.name||'이름 없음')}</div>${r.note?`<div class="meta">${esc(r.note)}</div>`:''}</div><button onclick="viewDoc('characters','${target.id}')">프로필</button></div>`}
function openCharacterRelations(cid){const c=getDoc('characters',cid);if(!c)return;const others=db.characters.filter(x=>x.project===currentProjectId&&x.id!==cid);const rows=characterPersonRelations(cid).map(r=>personRelationEditRow(cid,r,others)).join('');openModal(`<div class="stack"><h2>${esc(c.name)} · 인물 관계</h2><div class="note">↔는 양방향, →는 현재 인물에서 상대에게 향하는 단방향 관계입니다.</div><div id="personRelationEditor" class="stack">${rows}</div><button onclick="addPersonRelationRow('${cid}')">+ 관계 추가</button><div class="right"><button onclick="viewDoc('characters','${cid}')">취소</button><button class="primary" onclick="saveCharacterRelations('${cid}')">저장</button></div></div>`)}
function personRelationEditRow(cid,r,others){const isA=r.a===cid,targetId=isA?r.b:r.a;const dir=r.direction==='both'?'both':(isA?'out':'in');return `<div class="personRelationEdit" data-rel-id="${r.id}"><select class="prTarget"><option value="">상대 선택</option>${others.map(o=>`<option value="${o.id}" ${o.id===targetId?'selected':''}>${esc(o.name)}</option>`).join('')}</select><select class="prDir"><option value="both" ${dir==='both'?'selected':''}>↔ 양방향</option><option value="out" ${dir==='out'?'selected':''}>→ 내가 상대에게</option><option value="in" ${dir==='in'?'selected':''}>← 상대가 나에게</option></select><input class="prLabel" placeholder="관계명 (예: 소꿉친구)" value="${esc(r.label||'')}"><input class="prNote" placeholder="관계 설명" value="${esc(r.note||'')}"><button class="danger full" onclick="this.parentElement.remove()">이 관계 삭제</button></div>`}
function addPersonRelationRow(cid){const others=db.characters.filter(x=>x.project===currentProjectId&&x.id!==cid),host=document.getElementById('personRelationEditor');host.insertAdjacentHTML('beforeend',personRelationEditRow(cid,{id:'',a:cid,b:'',direction:'both',label:'',note:''},others));enhanceAllSelects(host.lastElementChild)}
function saveCharacterRelations(cid){const existing=characterPersonRelations(cid),keep=new Set(),now=Date.now();for(const row of document.querySelectorAll('#personRelationEditor .personRelationEdit')){const target=row.querySelector('.prTarget')?.value||'',label=row.querySelector('.prLabel')?.value.trim()||'',note=row.querySelector('.prNote')?.value.trim()||'',dir=row.querySelector('.prDir')?.value||'both';if(!target||target===cid)continue;let id=row.dataset.relId||uid(),old=(db.characterRelations||[]).find(r=>r.id===id),a=cid,b=target,direction='both';if(dir==='in'){a=target;b=cid;direction='out'}else if(dir==='out')direction='out';const obj={...(old||{}),id,project:currentProjectId,a,b,direction,label:label||'관계',note,visual:old?.visual||{},created:old?.created||now,updated:now};const i=db.characterRelations.findIndex(r=>r.id===id);if(i>=0)db.characterRelations[i]=obj;else db.characterRelations.unshift(obj);keep.add(id)}db.characterRelations=db.characterRelations.filter(r=>!(r.project===currentProjectId&&(r.a===cid||r.b===cid))||keep.has(r.id));persist();viewDoc('characters',cid)}

const __viewDocFix14=viewDoc;
viewDoc=async function(kind,id){await __viewDocFix14(kind,id);const x=getDoc(kind,id);if(!x)return;const card=document.getElementById('modalCard');if(!card)return;const head=card.querySelector('.detailHead');if(head&&(kind==='settings'||kind==='characters')&&x.group){head.insertAdjacentHTML('afterend',`<div class="chips"><span class="pill">그룹 · ${esc(groupName(x))}</span></div>`)}if(kind==='characters'){const rels=characterPersonRelations(id),section=document.createElement('div');section.className='detailSection';section.innerHTML=`<div class="detailLabel">인물 관계</div><div class="personRelationList">${rels.length?rels.map(r=>personRelationDisplay(id,r)).join(''):'<div class="meta">등록된 인물 관계가 없습니다.</div>'}</div><button style="margin-top:9px" onclick="openCharacterRelations('${id}')">인물 관계 관리</button>`;const foot=card.querySelector('.detailFooter');foot?.before(section)}if(['settings','stories','timeline'].includes(kind)){const foot=card.querySelector('.detailFooter');if(foot&&!foot.querySelector('.duplicateGenericBtn')){const b=document.createElement('button');b.className='duplicateGenericBtn';b.textContent='복제';b.onclick=()=>duplicateDocSafe(kind,id);const edit=[...foot.querySelectorAll('button')].find(q=>q.textContent.trim()==='수정');if(edit)foot.insertBefore(b,edit);else foot.appendChild(b);foot.classList.add('withDuplicate')}}card.scrollTop=0}

const __trashProjectFix14=trashProject;
trashProject=function(pid){let p=db.projects.find(x=>x.id===pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','characterRelations','images','sources','stories','timeline','serials','storyFolders','videos','quickMemos','diaries','pictureDiaries']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()}

const __APP_FONTS_FIX14=APP_FONTS;APP_FONTS.mono={name:'둥글고 귀여운 글꼴',css:'"StoryHandKkubulim",sans-serif'};APP_FONTS.light={name:'손글씨 / 캐주얼 글꼴',css:'"StoryHandPrettyNight",cursive'};APP_FONTS.condensed={name:'굵고 개성 있는 글꼴',css:'"StoryHandNuri",sans-serif'};
openFontPicker=function(){const cur=localStorage.getItem(APP_FONT_KEY)||'system';openModal(`<div class="stack"><h2>글꼴</h2><div class="note">기본 고딕과 명조체는 유지하고, 아래 세 글꼴은 앱에 포함된 한글 글꼴을 사용합니다.</div><div class="fontChoices">${Object.entries(APP_FONTS).map(([k,f])=>`<button class="fontChoice" onclick="applyAppFont('${k}');closeModal()"><span class="fontSample" style="font-family:${f.css}">${esc(f.name)} · 가나다 ABC</span><span class="fontCheck">${cur===k?'✓':''}</span></button>`).join('')}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`)}

function installScrollTop(){if(document.getElementById('scrollTopBtn'))return;const b=document.createElement('button');b.id='scrollTopBtn';b.type='button';b.textContent='↑';b.setAttribute('aria-label','맨 위로');document.body.appendChild(b);const card=document.getElementById('modalCard');const update=()=>{const modalOpen=!document.getElementById('modal')?.classList.contains('hidden'),pos=modalOpen?(card?.scrollTop||0):(window.scrollY||document.documentElement.scrollTop||0);b.classList.toggle('show',pos>420)};b.onclick=()=>{const modalOpen=!document.getElementById('modal')?.classList.contains('hidden');if(modalOpen&&card)card.scrollTo({top:0,behavior:'smooth'});else window.scrollTo({top:0,behavior:'smooth'})};window.addEventListener('scroll',update,{passive:true});card?.addEventListener('scroll',update,{passive:true});setInterval(update,1200)}
setTimeout(installScrollTop,0);

applyAppFont(localStorage.getItem(APP_FONT_KEY)||'system');
setTimeout(()=>{installSelectedExportUI();renderLastBackup()},0);

try{new ResizeObserver(()=>requestAnimationFrame(adjustModalPlacement)).observe(document.getElementById('modalCard'))}catch(_){};window.visualViewport?.addEventListener('resize',adjustModalPlacement);
// ===== 대용량 전체 ZIP 백업 / 복원 =====
function zipStatus(msg=''){const el=document.getElementById('zipBackupStatus');if(el)el.textContent=msg}
function collectBackupFileIds(){
  const ids=new Set();
  for(const x of [...(db.images||[]),...(db.sources||[]),...(db.videos||[])])if(x?.id)ids.add(x.id);
  for(const x of (db.pictureDiaries||[]))if(x?.imageId)ids.add(x.imageId);
  for(const x of (db.timeline||[]))if(x?.timelineImageId)ids.add(x.timelineImageId);
  for(const group of [db.characters||[],db.settings||[]])for(const x of group)for(const m of(x.musicTracks||[]))if(m?.id)ids.add(m.id);
  return [...ids];
}
async function exportZipBackup(){
  if(!window.Android?.beginZipBackup||!window.Android?.addZipDataUrl||!window.Android?.finishZipBackup){alert('전체 ZIP 백업은 Android 앱에서 사용할 수 있습니다.');return}
  const ids=collectBackupFileIds();
  const meta=JSON.parse(JSON.stringify(db));
  meta._backupFormat='storyhand-zip-v1';
  meta._backupCreated=Date.now();
  try{
    zipStatus(`전체 백업 준비 중… 첨부 파일 ${ids.length}개`);
    if(!Android.beginZipBackup(JSON.stringify(meta)))throw new Error('ZIP 백업을 시작하지 못했습니다.');
    let done=0,missing=0;
    for(const id of ids){
      const data=await getFile(id);
      if(data){if(!Android.addZipDataUrl(id,data))throw new Error(`첨부 파일을 백업하지 못했습니다: ${id}`)}else missing++;
      done++;zipStatus(`전체 백업 생성 중… ${done}/${ids.length}${missing?` · 누락 ${missing}`:''}`);
      await new Promise(r=>setTimeout(r,0));
    }
    if(!Android.finishZipBackup('창작소_내손안에이야기_전체백업.zip'))throw new Error('ZIP 파일을 마무리하지 못했습니다.');
    zipStatus('저장 위치를 선택해 주세요.');
  }catch(e){zipStatus('전체 ZIP 백업 실패');alert(e?.message||'전체 ZIP 백업 중 오류가 발생했습니다.')}
}
function zipBackupSaved(){localStorage.setItem(LAST_BACKUP_KEY,String(Date.now()));renderLastBackup();zipStatus('전체 ZIP 백업이 완료되었습니다.')}
function importZipBackup(){
  if(!window.Android?.chooseZipBackup){alert('ZIP 백업 복원은 Android 앱에서 사용할 수 있습니다.');return}
  if(!confirm('ZIP 백업을 복원하시겠습니까?\n\n복원 파일이 완전히 준비되기 전에는 현재 데이터를 변경하지 않습니다. 중요한 자료가 있다면 먼저 백업해 주세요.'))return;
  zipStatus('ZIP 백업 파일을 선택해 주세요.');
  Android.chooseZipBackup();
}
let __zipRestore=null;
function decodeUtf8Base64(b64){const bin=atob(b64),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(a)}
function zipRestoreBegin(jsonB64,total){
  try{
    const raw=JSON.parse(decodeUtf8Base64(jsonB64));delete raw._backupFormat;delete raw._backupCreated;delete raw._fileData;delete raw._imageData;
    __zipRestore={nextDb:normalize(raw),session:'zip_'+Date.now()+'_'+Math.random().toString(36).slice(2),chunks:[],currentId:'',items:[],done:0,total:Number(total)||0};
    zipStatus(`ZIP 백업 확인 완료 · 첨부 파일 ${__zipRestore.total}개 복원 준비 중…`);
    return 'ok';
  }catch(e){zipRestoreFail('백업 데이터가 올바르지 않습니다.');return 'error'}
}
function zipRestoreChunk(id,b64){
  if(!__zipRestore)return;
  if(__zipRestore.currentId!==id){__zipRestore.currentId=id;__zipRestore.chunks=[]}
  __zipRestore.chunks.push(b64);
}
async function zipRestoreEntryDone(id,mime){
  if(!__zipRestore)return;
  try{
    const tempId=`__ziprestore__${__zipRestore.session}__${id}`;
    const data=`data:${mime||'application/octet-stream'};base64,${__zipRestore.chunks.join('')}`;
    __zipRestore.chunks=[];__zipRestore.currentId='';
    await putFile(tempId,data);
    __zipRestore.items.push({id,tempId});__zipRestore.done++;
    zipStatus(`ZIP 복원 준비 중… ${__zipRestore.done}/${__zipRestore.total}`);
    Android.zipRestoreEntryAck();
  }catch(e){zipRestoreFail('첨부 파일을 임시 저장하지 못했습니다.')}
}
async function zipRestoreFinish(){
  if(!__zipRestore)return;
  const state=__zipRestore;
  try{
    zipStatus('복원 데이터를 적용하는 중…');
    for(let i=0;i<state.items.length;i++){
      const it=state.items[i],data=await getFile(it.tempId);if(!data)throw new Error('임시 파일 누락');
      await putFile(it.id,data);
      zipStatus(`복원 데이터를 적용하는 중… ${i+1}/${state.items.length}`);
    }
    for(const it of state.items)await delFile(it.tempId);
    db=state.nextDb;currentProjectId=null;persist();applyTheme();renderAll();
    document.getElementById('projectView')?.classList.add('hidden');document.getElementById('projectHome')?.classList.remove('hidden');
    __zipRestore=null;zipStatus('ZIP 백업 복원이 완료되었습니다.');alert('전체 ZIP 백업 복원이 완료되었습니다.');
  }catch(e){zipRestoreFail('복원 데이터를 적용하지 못했습니다. 기존 데이터는 유지됩니다.')}
}
async function zipRestoreFail(msg){
  const state=__zipRestore;__zipRestore=null;
  if(state?.items)for(const it of state.items){try{await delFile(it.tempId)}catch(_){}}
  zipStatus('ZIP 백업 복원 실패');alert(msg||'ZIP 백업 복원 중 오류가 발생했습니다.');
}
window.zipBackupSaved=zipBackupSaved;window.zipRestoreBegin=zipRestoreBegin;window.zipRestoreChunk=zipRestoreChunk;window.zipRestoreEntryDone=zipRestoreEntryDone;window.zipRestoreFinish=zipRestoreFinish;window.zipRestoreFail=zipRestoreFail;



// ===== fix15: 장기 실사용 피드백 반영 =====
if(!Array.isArray(db.characterGroups))db.characterGroups=[];
if(!Array.isArray(db.settingGroups))db.settingGroups=[];

// 사용자 제공 폰트가 WebView에서 확실히 로드되도록 절대 asset 경로까지 지정한다.
APP_FONTS.mono={name:'둥글고 귀여운 · 꾸불림',css:'"Fix15Kkubulim","StoryHandKkubulim",sans-serif'};
APP_FONTS.light={name:'손글씨 / 캐주얼 · One Pretty Night',css:'"Fix15PrettyNight","StoryHandPrettyNight",cursive'};
APP_FONTS.condensed={name:'개성 있는 한글 · 한글누리',css:'"Fix15Nuri","StoryHandNuri",sans-serif'};
try{document.fonts?.load('16px Fix15Kkubulim');document.fonts?.load('16px Fix15PrettyNight');document.fonts?.load('16px Fix15Nuri')}catch(_){ }
applyAppFont(localStorage.getItem(APP_FONT_KEY)||'system');

function groupStoreName(kind){return kind==='characters'?'characterGroups':'settingGroups'}
function groupItemKind(kind){return kind==='characters'?'characters':'settings'}
function groupLabelFor(kind){return kind==='characters'?'캐릭터':'설정'}
function ensureManagedGroups(kind){
  const store=groupStoreName(kind);if(!Array.isArray(db[store]))db[store]=[];
  const names=new Set(db[store].filter(x=>x.project===currentProjectId).map(x=>x.name));
  let changed=false;
  for(const x of(db[groupItemKind(kind)]||[]).filter(x=>x.project===currentProjectId)){const n=(x.group||'').trim();if(n&&!names.has(n)){db[store].push({id:uid(),name:n,project:currentProjectId,created:Date.now()});names.add(n);changed=true}}
  if(changed)persist();
  return db[store].filter(x=>x.project===currentProjectId).sort((a,b)=>(a.created||0)-(b.created||0));
}
function managedGroupOptions(kind,selected=''){const arr=ensureManagedGroups(kind);return `<option value="">미분류</option>`+arr.map(g=>`<option value="${esc(g.name)}" ${selected===g.name?'selected':''}>${esc(g.name)}</option>`).join('')}
function openManagedGroupManager(kind){const arr=ensureManagedGroups(kind),label=groupLabelFor(kind);openModal(`<div class="stack"><h2>${label} 그룹 관리</h2><div class="note">썰 / 장문 폴더처럼 그룹을 먼저 만든 뒤 ${label} 작성 화면에서 선택합니다. 기존 자유입력 그룹은 자동으로 목록에 보존됩니다.</div><div class="row"><input id="managedGroupName" placeholder="새 그룹 이름"><button class="primary" onclick="addManagedGroup('${kind}')">+ 그룹 추가</button></div><div class="stack">${arr.length?arr.map(g=>`<div class="managedGroupRow"><span class="managedGroupPreview"></span><b>${esc(g.name)}</b><button class="danger" onclick="deleteManagedGroup('${kind}','${g.id}')">삭제</button></div>`).join(''):'<div class="empty">아직 만든 그룹이 없습니다.</div>'}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`)}
function addManagedGroup(kind){const name=v('managedGroupName').trim();if(!name)return;const arr=ensureManagedGroups(kind);if(arr.some(g=>g.name===name))return alert('같은 이름의 그룹이 이미 있습니다.');db[groupStoreName(kind)].push({id:uid(),name,project:currentProjectId,created:Date.now()});persist();openManagedGroupManager(kind)}
function deleteManagedGroup(kind,id){const store=groupStoreName(kind),g=(db[store]||[]).find(x=>x.id===id);if(!g)return;if(!confirm(`'${g.name}' 그룹을 삭제할까요? 그룹 안의 항목은 삭제되지 않고 미분류로 이동합니다.`))return;for(const x of(db[groupItemKind(kind)]||[]))if(x.project===currentProjectId&&x.group===g.name)x.group='';db[store]=db[store].filter(x=>x.id!==id);persist();openManagedGroupManager(kind);if(kind==='characters')renderCharacters();else renderSettings()}
function replaceGroupInputWithSelect(kind,id){const old=document.getElementById(id);if(!old)return;const selected=old.value||'';const wrap=document.createElement('div');wrap.className='row';wrap.innerHTML=`<select id="${id}">${managedGroupOptions(kind,selected)}</select><button type="button" onclick="openManagedGroupManager('${kind}')">그룹 관리</button>`;old.replaceWith(wrap);syncAppSelect(document.getElementById(id))}

const __setupSectionsFix15=setupSections;
setupSections=function(){__setupSectionsFix15();if(!document.getElementById('characterGroupManageBar'))projectCharacters?.insertAdjacentHTML('afterbegin',`<div id="characterGroupManageBar" class="groupManageBar"><button onclick="openManagedGroupManager('characters')">캐릭터 그룹 관리</button></div>`);if(!document.getElementById('settingGroupManageBar'))projectSettings?.insertAdjacentHTML('afterbegin',`<div id="settingGroupManageBar" class="groupManageBar"><button onclick="openManagedGroupManager('settings')">설정 그룹 관리</button></div>`)};

const __newSettingFix15=newSetting;
newSetting=async function(x){await __newSettingFix15(x);replaceGroupInputWithSelect('settings','sgroup');document.getElementById('modalCard').scrollTop=0};

function inlineRelationRows(cid){const others=db.characters.filter(x=>x.project===currentProjectId&&x.id!==cid);return characterPersonRelations(cid).map(r=>personRelationEditRow(cid,r,others)).join('')}
function addInlinePersonRelationRow(cid){const others=db.characters.filter(x=>x.project===currentProjectId&&x.id!==cid),host=document.getElementById('inlinePersonRelationEditor');if(!host)return;host.insertAdjacentHTML('beforeend',personRelationEditRow(cid,{id:'',a:cid,b:'',direction:'both',label:'',note:''},others));enhanceAllSelects(host.lastElementChild)}
function collectInlinePersonRelations(cid){const host=document.getElementById('inlinePersonRelationEditor');if(!host)return null;const out=[];for(const row of host.querySelectorAll('.personRelationEdit')){const target=row.querySelector('.prTarget')?.value||'',label=row.querySelector('.prLabel')?.value.trim()||'',note=row.querySelector('.prNote')?.value.trim()||'',dir=row.querySelector('.prDir')?.value||'both';if(target&&target!==cid)out.push({id:row.dataset.relId||'',target,label:label||'관계',note,dir})}return out}
function applyInlinePersonRelations(cid,rows){if(rows==null)return;const keep=new Set(),now=Date.now();for(const q of rows){let id=q.id||uid(),old=(db.characterRelations||[]).find(r=>r.id===id),a=cid,b=q.target,direction='both';if(q.dir==='in'){a=q.target;b=cid;direction='out'}else if(q.dir==='out')direction='out';const obj={...(old||{}),id,project:currentProjectId,a,b,direction,label:q.label,note:q.note,visual:old?.visual||{},created:old?.created||now,updated:now};const i=db.characterRelations.findIndex(r=>r.id===id);if(i>=0)db.characterRelations[i]=obj;else db.characterRelations.unshift(obj);keep.add(id)}db.characterRelations=db.characterRelations.filter(r=>!(r.project===currentProjectId&&(r.a===cid||r.b===cid))||keep.has(r.id));persist()}
const __newCharacterFix15=newCharacter;
newCharacter=async function(x){let obj=typeof x==='string'?decodeObj(x):x;if(!obj)obj={id:uid(),name:'',alias:'',age:'',role:'',tags:'',body:'',relationIds:[],relationNotes:{},relationRanks:{},raceId:'',regionId:'',portraitId:'',musicTracks:[],status:'아이디어',favorite:false,linkedIds:[],group:'',project:currentProjectId};await __newCharacterFix15(obj);replaceGroupInputWithSelect('characters','cgroup');const card=document.getElementById('modalCard'),foot=card?.querySelector('.stack>.right:last-child');if(card&&foot&&!document.getElementById('inlinePersonRelationEditor')){const box=document.createElement('div');box.className='inlineRelationBox';box.innerHTML=`<div><b>인물 관계</b><div class="meta">처음 캐릭터를 만들 때도 관계를 바로 등록할 수 있습니다.</div></div><div id="inlinePersonRelationEditor" class="stack">${inlineRelationRows(obj.id)}</div><button type="button" onclick="addInlinePersonRelationRow('${obj.id}')">+ 관계 추가</button>`;foot.before(box);enhanceAllSelects(box)}card.scrollTop=0};
const __saveCharacterFix15=saveCharacter;
saveCharacter=function(id){const rels=collectInlinePersonRelations(id);__saveCharacterFix15(id);applyInlinePersonRelations(id,rels);renderCharacters()};

// 썰 / 장문 파일 아이콘 색상은 제거하고, 폴더 자체에 색상을 준다.
const FOLDER_COLORS={yellow:['노랑','#e2b84d'],red:['빨강','#d86767'],orange:['주황','#dd9145'],green:['초록','#62a873'],blue:['파랑','#5d8fd3'],purple:['보라','#8b72c9'],pink:['분홍','#d879a5'],gray:['회색','#8d8b91']};
function folderColor(id){const f=db.storyFolders.find(x=>x.id===id);return FOLDER_COLORS[f?.color]?.[1]||FOLDER_COLORS.yellow[1]}
function folderColorIcon(id){return `<span class="folderColorIcon" style="--folder:${folderColor(id)}"></span>`}
storyFolderOptions=function(selected=''){let arr=db.storyFolders.filter(f=>f.project===currentProjectId);return `<option value="">폴더 없음</option>`+arr.map(f=>`<option value="${f.id}" ${selected===f.id?'selected':''}>📁 ${esc(f.name)}</option>`).join('')};
openStoryFolderManager=function(){let arr=db.storyFolders.filter(f=>f.project===currentProjectId);openModal(`<div class="stack"><h2>썰 / 장문 폴더</h2><div class="row"><input id="newFolderName" placeholder="새 폴더 이름"><select id="newFolderColor" class="folderColorSelect">${Object.entries(FOLDER_COLORS).map(([k,v])=>`<option value="${k}" ${k==='yellow'?'selected':''}>${v[0]}</option>`).join('')}</select></div><button class="primary" onclick="addStoryFolder()">+ 폴더 추가</button><div class="folderList">${arr.length?arr.map(f=>`<div class="folderRow"><div><div class="folderNameLine">${folderColorIcon(f.id)}<div class="folderName">${esc(f.name)}</div></div><div class="folderCount">${db.stories.filter(x=>x.project===currentProjectId&&x.folderId===f.id).length}개 문서</div></div><select class="folderColorSelect" onchange="setStoryFolderColor('${f.id}',this.value)">${Object.entries(FOLDER_COLORS).map(([k,v])=>`<option value="${k}" ${(f.color||'yellow')===k?'selected':''}>${v[0]}</option>`).join('')}</select><button class="danger" onclick="deleteStoryFolder('${f.id}')">삭제</button></div>`).join(''):'<div class="empty">아직 폴더가 없습니다.</div>'}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`);syncAppSelect(document.getElementById('newFolderColor'));document.querySelectorAll('.folderColorSelect').forEach(syncAppSelect)};
addStoryFolder=function(){let name=v('newFolderName').trim();if(!name)return;db.storyFolders.push({id:uid(),name,color:v('newFolderColor')||'yellow',project:currentProjectId,created:Date.now()});persist();openStoryFolderManager()};
function setStoryFolderColor(id,color){const f=db.storyFolders.find(x=>x.id===id);if(!f)return;f.color=FOLDER_COLORS[color]?color:'yellow';persist();renderStories();openStoryFolderManager()}
const __newStoryFix15=newStory;
newStory=async function(x){await __newStoryFix15(x);const old=document.getElementById('storyIconColor');old?.closest('.stack')?.remove();const ed=document.getElementById('tbody');if(ed){ed.classList.add('storyLongEditor');ed.style.height='';ed.style.maxHeight='';ed.style.overflowY='auto'}document.getElementById('modalCard').scrollTop=0};
renderStories=async function(){refreshStoryFolderFilter();let a=listData('stories',['title','tags','body','status']),folder=v('storiesFolderFilter');if(folder==='__none')a=a.filter(x=>!x.folderId);else if(folder)a=a.filter(x=>x.folderId===folder);let blocks=[];for(let x of a){let thumbs=[];for(let iid of(x.imageIds||[]).slice(0,4)){let d=await getFile(iid);if(d)thumbs.push(`<img class="storyThumb" src="${d}">`)}let folderName=storyFolderName(x.folderId);blocks.push(`<div class="item ${x.favorite?'favorite':''}" onclick="viewDoc('stories','${x.id}')">${itemTop(x.title,creativeStatusValue(x.status),`${folderName?esc(folderName)+' · ':''}${fmt(x.updated)} · ${(x.body||'').length.toLocaleString()}자`,'stories',x)}<div class="itemBody">${folderName?`<div class="chips"><span class="pill storyFolderPill">${folderColorIcon(x.folderId)}${esc(folderName)}</span></div>`:''}${tags(x.tags)}<div class="chips">${linkedChips(x.linkedIds)}</div><div class="snippet">${esc(x.body||'내용 없음')}</div>${thumbs.length?`<div class="thumbRow">${thumbs.join('')}</div>`:''}</div></div>`)}storiesList.innerHTML=blocks.length?blocks.join(''):'<div class="empty">저장된 썰이 없습니다.</div>';setTimeout(()=>animateStagger(storiesList),20)};

// 일반/고급 타임라인 이미지 첨부와 연대기 노드를 보강한다.
const __newTimelineFix15=newTimeline;
newTimeline=async function(x){const obj=typeof x==='string'?decodeObj(x):(x||{});await __newTimelineFix15(x);if(currentProjectType()==='diary')return;const anchor=document.getElementById('lttags');if(!anchor||document.getElementById('ltTimelineFile'))return;const oldId=obj.timelineImageId||'',data=oldId?await getFile(oldId):'';const box=document.createElement('div');box.className='timelineImageEditor linkedBox';box.innerHTML=`<b>타임라인 이미지</b><div id="ltTimelinePreview" class="timelineImagePreview">${data?`<img src="${data}">`:'<span class="meta">첨부 이미지 없음</span>'}</div><div class="timelineImageActions"><label class="btn">이미지 선택<input id="ltTimelineFile" type="file" accept="image/*" hidden></label>${oldId?'<label class="checkRow"><input id="ltTimelineRemove" type="checkbox"> 기존 이미지 제거</label>':''}</div>`;anchor.insertAdjacentElement('afterend',box);const fi=document.getElementById('ltTimelineFile');fi.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const d=await fileToData(f);document.getElementById('ltTimelinePreview').innerHTML=`<img src="${d}">`};document.getElementById('modalCard').scrollTop=0};
const __saveTimelineFix15=saveTimeline;
saveTimeline=async function(id){if(currentProjectType()==='diary')return __saveTimelineFix15(id);const before=getDoc('timeline',id)||{},oldId=before.timelineImageId||'',remove=!!document.getElementById('ltTimelineRemove')?.checked,fi=document.getElementById('ltTimelineFile');let imageId=remove?'':oldId;if(fi?.files?.[0]){const data=await fileToData(fi.files[0]);imageId='timeline_'+uid();await putFile(imageId,data)}await __saveTimelineFix15(id);const d=getDoc('timeline',id);if(d){d.timelineImageId=imageId;persist();renderTimeline()}};
const __renderTimelineFix15=renderTimeline;
renderTimeline=async function(){if(currentProjectType()==='diary')return __renderTimelineFix15();let a=listData('timeline',['title','dateLabel','tags','body','status']);a=[...a].sort((x,y)=>{let ax=x.order===''||x.order==null?999999:Number(x.order),ay=y.order===''||y.order==null?999999:Number(y.order);return ax-ay||(x.updated||0)-(y.updated||0)});if(!a.length){timelineList.innerHTML='<div class="empty">등록된 타임라인 사건이 없습니다.</div>';return}let rows=[];for(const t of a){const d=t.timelineImageId?await getFile(t.timelineImageId):'';rows.push(`<div class="item timelineItem ${d?'hasTimelineImage ':''}${t.favorite?'favorite':''}" onclick="viewDoc('timeline','${t.id}')"><div class="right">${favButton('timeline',t)}</div><b>${esc(t.title)}</b> <span class="status">${esc(creativeStatusValue(t.status))}</span><div class="meta">${esc(t.dateLabel||'시기 미정')}${t.order!==''&&t.order!=null?' · 순서 '+esc(t.order):''}</div>${tags(t.tags)}<div class="chips">${linkedChips(t.linkedIds)}</div><div class="snippet">${esc(t.body||'내용 없음')}</div>${d?`<img class="timelineThumb" src="${d}" alt="">`:''}</div>`)}timelineList.innerHTML=`<div class="timelineLine">${rows.join('')}</div>`};

const __viewDocFix15=viewDoc;
viewDoc=async function(kind,id){await __viewDocFix15(kind,id);if(kind==='timeline'){const x=getDoc('timeline',id);if(x?.timelineImageId){const data=await getFile(x.timelineImageId),card=document.getElementById('modalCard');if(data&&card&&!card.querySelector('.timelineDetailImage')){const img=document.createElement('div');img.className='timelineDetailImage timelineImagePreview';img.innerHTML=`<img src="${data}">`;const foot=card.querySelector('.detailFooter');foot?.before(img)}}}};

// PDF: 긴 본문은 자연스럽게 다음 페이지로 넘기고, 이미지/표 자체만 페이지 중간에서 잘리지 않게 한다.
const __pdfPrintCssFix15=pdfPrintCss;
pdfPrintCss=function(){return __pdfPrintCssFix15()+`\n.projectEntry{break-inside:auto!important;page-break-inside:auto!important}.projectEntry .entryBody,.projectEntry .bodyText{break-inside:auto!important;page-break-inside:auto!important}.metaTable,table,.pdfImage,.projectImageMedia,.portraitBox,.imageEntry,.pdfHero,.pdfHeroEntry{break-inside:avoid!important;page-break-inside:avoid!important}.pdfImage img,.projectImageMedia img,.portraitBox img{break-inside:avoid!important;page-break-inside:avoid!important;max-width:100%!important;height:auto}.imageEntry{break-inside:avoid!important;page-break-inside:avoid!important}`};

// 새 그룹 저장소도 프로젝트 휴지통/복원에 함께 묶는다.
trashProject=function(pid){let p=db.projects.find(x=>x.id===pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','characterRelations','images','sources','stories','timeline','serials','storyFolders','videos','quickMemos','diaries','pictureDiaries','characterGroups','settingGroups']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()};



// ===== fix16: 메모 프로젝트 단순화 / 프로젝트 유형 고정 / 실사용 UI 보정 =====
function memoProjectItems(){return (db.quickMemos||[]).filter(x=>x.project===currentProjectId)}
function memoDisplayTitle(x){const t=(x.title||'').trim();if(t)return t;const first=(x.text||'').trim().replace(/\s+/g,' ');return first.slice(0,42)||(x.text?'메모':'제목 없음')}
function memoTagList(x){return String(x.tags||'').split(',').map(t=>t.trim()).filter(Boolean)}
function renderMemoProjectList(){
  const list=document.getElementById('memoProjectList');if(!list)return;
  const q=(document.getElementById('memoProjectSearch')?.value||'').trim().toLowerCase();
  const favOnly=!!document.getElementById('memoFavOnly')?.checked;
  let arr=memoProjectItems().filter(x=>!q||`${x.title||''} ${x.text||''} ${x.tags||''}`.toLowerCase().includes(q));
  if(favOnly)arr=arr.filter(x=>x.favorite);
  arr.sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0));
  const count=document.getElementById('memoProjectCount');if(count)count.textContent=`메모 ${arr.length}개`;
  list.innerHTML=arr.length?arr.map(x=>`<div class="memoCardCompact ${x.favorite?'favorite':''}" onclick="editQuickMemo('${x.id}')"><button class="favBtn memoFavBtn" type="button" onclick="event.stopPropagation();toggleMemoFavorite('${x.id}')">${x.favorite?'★':'☆'}</button><h4>${esc(memoDisplayTitle(x))}</h4><div class="memoPreview">${esc((x.text||'').trim()||'내용 없음')}</div>${memoTagList(x).length?`<div class="memoTags">${memoTagList(x).map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>`:''}<div class="meta">${fmt(x.updated||x.created)}</div></div>`).join(''):'<div class="empty">저장된 메모가 없습니다.</div>';
}
function renderMemoProject(){
  const host=document.getElementById('projectQuickMemos');if(!host)return;
  host.innerHTML=`<div class="memoProjectWrap"><div class="toolbar"><div><h3 style="margin:0 0 4px">메모</h3><div class="meta">떠오르는 내용을 바로 적고 저장할 수 있습니다.</div></div></div><div class="memoComposer"><input id="memoTitleInput" placeholder="제목 (선택)"><textarea id="memoBodyInput" placeholder="메모 내용을 입력해 주세요."></textarea><input id="memoTagsInput" placeholder="태그 (쉼표로 구분, 선택)"><div class="memoSaveRow"><span class="meta">제목이 없으면 본문 앞부분이 목록 제목으로 표시됩니다.</span><button class="primary" type="button" onclick="saveMemoProjectEntry()">저장</button></div></div><div class="memoFilterBar"><input id="memoProjectSearch" placeholder="메모 검색..." oninput="renderMemoProjectList()"><label class="checkRow"><input id="memoFavOnly" type="checkbox" onchange="renderMemoProjectList()"> 즐겨찾기만</label></div><div class="toolbar" style="margin:0"><span id="memoProjectCount" class="meta"></span></div><div id="memoProjectList" class="memoListCompact"></div></div>`;
  renderMemoProjectList();
}
const __renderQuickMemosFix16=renderQuickMemos;
renderQuickMemos=function(){if(currentProjectType()==='memo')return renderMemoProject();return __renderQuickMemosFix16()};
function saveMemoProjectEntry(){
  const title=(document.getElementById('memoTitleInput')?.value||'').trim(),text=(document.getElementById('memoBodyInput')?.value||'').trim(),tags=(document.getElementById('memoTagsInput')?.value||'').trim();
  if(!text)return alert('메모 내용을 입력해 주세요.');
  db.quickMemos.unshift({id:uid(),title,text,tags,favorite:false,project:currentProjectId,created:Date.now(),updated:Date.now()});persist();
  const ti=document.getElementById('memoTitleInput'),bi=document.getElementById('memoBodyInput'),tg=document.getElementById('memoTagsInput');if(ti)ti.value='';if(bi)bi.value='';if(tg)tg.value='';renderMemoProjectList();
  requestAnimationFrame(()=>{try{bi?.focus({preventScroll:true})}catch(_){bi?.focus()}});
}
function toggleMemoFavorite(id){const x=(db.quickMemos||[]).find(m=>m.id===id);if(!x)return;x.favorite=!x.favorite;x.updated=Date.now();persist();renderMemoProjectList()}
editQuickMemo=function(id){let x=(db.quickMemos||[]).find(m=>m.id===id);if(!x)return;openModal(`<div class="stack"><h2>메모 수정</h2><input id="quickMemoEditTitle" placeholder="제목 (선택)" value="${esc(x.title||'')}"><textarea id="quickMemoEdit" style="min-height:220px">${esc(x.text||'')}</textarea><input id="quickMemoEditTags" placeholder="태그 (쉼표로 구분, 선택)" value="${esc(x.tags||'')}"><label class="checkRow"><input id="quickMemoEditFav" type="checkbox" ${x.favorite?'checked':''}> 즐겨찾기</label><div class="right"><button class="danger" onclick="deleteQuickMemo('${id}');closeModal()">삭제</button><button onclick="closeModal()">취소</button><button class="primary" onclick="saveQuickMemoEdit('${id}')">저장</button></div></div>`)};
saveQuickMemoEdit=function(id){let x=(db.quickMemos||[]).find(m=>m.id===id),text=v('quickMemoEdit').trim();if(!x||!text)return alert('메모 내용을 입력해 주세요.');x.title=v('quickMemoEditTitle').trim();x.text=text;x.tags=v('quickMemoEditTags').trim();x.favorite=!!document.getElementById('quickMemoEditFav')?.checked;x.updated=Date.now();persist();closeModal();if(currentProjectType()==='memo')renderMemoProjectList();else renderQuickMemos()};
const __deleteQuickMemoFix16=deleteQuickMemo;
deleteQuickMemo=function(id){if(!confirm('이 메모를 삭제할까요?'))return;db.quickMemos=(db.quickMemos||[]).filter(x=>x.id!==id);persist();if(currentProjectType()==='memo')renderMemoProjectList();else renderQuickMemos()};

// 메모장 / 일기장은 생성 후 고정, 창작 프로젝트 3종만 상호 변경 가능.
newProject=function(p){
  if(typeof p==='string')p=decodeObj(p);
  p=p||{id:uid(),name:'',desc:'',color:'#7b61a8',projectType:'general',coverImageId:'',created:Date.now(),updated:Date.now()};
  const existing=db.projects.find(x=>x.id===p.id),fixed=existing&&(existing.projectType==='diary'||existing.projectType==='memo');
  let imgs=(db.images||[]).filter(x=>x.project===p.id),coverOptions='<option value="">대표 이미지 없음</option>'+imgs.map(x=>`<option value="${x.id}" ${p.coverImageId===x.id?'selected':''}>${esc(x.title||'이미지')}</option>`).join('');
  let typeControl='';
  if(fixed){typeControl=`<div class="projectTypeLocked">${projectTypeLabel(existing.projectType)} (변경 불가)</div><div class="note projectTypeLockNote">일기장과 메모장은 전용 프로젝트 유형으로 생성 후 변경할 수 없습니다.</div>`}
  else if(existing){typeControl=`<select id="ptype"><option value="advanced" ${p.projectType==='advanced'?'selected':''}>고급 프로젝트</option><option value="general" ${p.projectType==='general'?'selected':''}>일반 프로젝트</option><option value="short" ${p.projectType==='short'?'selected':''}>단편 프로젝트</option></select><div class="note">고급 / 일반 / 단편 프로젝트끼리만 유형을 변경할 수 있습니다. 일기장과 메모장으로는 변경할 수 없습니다.</div>`}
  else{typeControl=`<select id="ptype"><option value="advanced">고급 프로젝트</option><option value="general" selected>일반 프로젝트</option><option value="short">단편 프로젝트</option><option value="diary">일기장</option><option value="memo">메모장</option></select><div class="note">일기장과 메모장은 전용 프로젝트 유형으로, 생성 후 다른 유형으로 변경할 수 없습니다.</div>`}
  openModal(`<div class="stack"><h2>${existing?'프로젝트 수정':'새 프로젝트'}</h2><input id="pname" placeholder="프로젝트 이름" value="${esc(p.name||'')}">${typeControl}<textarea id="pdesc" style="min-height:110px" placeholder="설명">${esc(p.desc||'')}</textarea><input id="pcolor" type="color" value="${esc(p.color||'#7b61a8')}"><div class="projectCoverPicker"><div class="meta">프로젝트 대표 이미지</div><select id="pcover" onchange="previewProjectCover(this.value)">${coverOptions}</select><div id="projectCoverPreview" class="projectCoverPreview"><span class="meta">${imgs.length?'대표 이미지를 선택해 주세요.':'이미지 자료를 등록한 뒤 프로젝트 수정에서 선택할 수 있습니다.'}</span></div></div><div class="right">${existing?`<button class="danger" onclick="trashProject('${p.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveProject('${p.id}')">저장</button></div></div>`);
  setTimeout(()=>{syncAppSelect(document.getElementById('ptype'));syncAppSelect(document.getElementById('pcover'));previewProjectCover(p.coverImageId||'')},30)
};
saveProject=function(id){
  let name=v('pname').trim();if(!name)return alert('프로젝트 이름을 입력해 주세요.');
  let old=db.projects.find(x=>x.id===id),type='general';
  if(old){if(old.projectType==='diary'||old.projectType==='memo')type=old.projectType;else{const requested=v('ptype')||old.projectType||'general';type=['advanced','general','short'].includes(requested)?requested:(old.projectType||'general')}}
  else{const requested=v('ptype')||'general';type=['advanced','general','short','diary','memo'].includes(requested)?requested:'general'}
  upsert('projects',{...old,id,name,desc:v('pdesc'),color:v('pcolor'),projectType:type,projectTypeVersion:4,coverImageId:v('pcover')||'',created:old?.created||Date.now(),updated:Date.now()});closeModal();if(currentProjectId===id)openProject(id)
};

// 메모 프로젝트 진입 직후 본문 입력으로 바로 이어지게 하되, 다른 화면에는 영향을 주지 않습니다.
const __openProjectFix16=openProject;
openProject=function(id){__openProjectFix16(id);setTimeout(()=>{if(currentProjectId===id&&projectById(id)?.projectType==='memo'){const e=document.getElementById('memoBodyInput');if(e){try{e.focus({preventScroll:true})}catch(_){e.focus()}}}},380)};

// 모달의 저장/취소 버튼 위로 상단 이동 버튼을 피해서 배치합니다.
const __openModalFix16=openModal;
openModal=function(h){const r=__openModalFix16(h);requestAnimationFrame(()=>document.getElementById('scrollTopBtn')?.classList.add('modalMode'));return r};
const __closeModalFix16=closeModal;
closeModal=function(){document.getElementById('scrollTopBtn')?.classList.remove('modalMode');return __closeModalFix16()};


// ===== fix17: 메모 생성 직후 작성 / 키보드 유지 / 일괄 선택 삭제 / 상단 초기화 / 위로 버튼 위치 =====
const __saveProjectFix17=saveProject;
saveProject=function(id){
  const wasExisting=!!db.projects.find(x=>x.id===id);
  const requestedType=wasExisting?(db.projects.find(x=>x.id===id)?.projectType||'general'):(v('ptype')||'general');
  __saveProjectFix17(id);
  if(!wasExisting&&requestedType==='memo'){
    setTimeout(()=>{
      openProject(id);
      setTimeout(()=>{const e=document.getElementById('memoBodyInput');if(e){try{e.focus({preventScroll:true})}catch(_){e.focus()}}},260);
    },240);
  }
};

const __renderMemoProjectFix17=renderMemoProject;
renderMemoProject=function(){
  __renderMemoProjectFix17();
  const btn=document.querySelector('.memoComposer .memoSaveRow button.primary');
  if(btn&&!btn.dataset.keepFocus){btn.dataset.keepFocus='1';btn.addEventListener('pointerdown',e=>e.preventDefault())}
};
const __saveMemoProjectEntryFix17=saveMemoProjectEntry;
saveMemoProjectEntry=function(){
  const bi=document.getElementById('memoBodyInput');
  __saveMemoProjectEntryFix17();
  setTimeout(()=>{if(bi&&document.body.contains(bi)){try{bi.focus({preventScroll:true})}catch(_){bi.focus()}}},40);
  setTimeout(()=>{if(bi&&document.body.contains(bi)){try{bi.focus({preventScroll:true})}catch(_){bi.focus()}}},180);
};

function resetActiveScrollTop(){
  try{window.scrollTo(0,0)}catch(_){document.documentElement.scrollTop=0;document.body.scrollTop=0}
  const card=document.getElementById('modalCard');if(card)card.scrollTop=0;
  const pv=document.getElementById('projectView');if(pv)pv.scrollTop=0;
  document.querySelectorAll('.subsec').forEach(x=>x.scrollTop=0);
}
const __openProjectFix17=openProject;
openProject=function(id){resetActiveScrollTop();__openProjectFix17(id);requestAnimationFrame(resetActiveScrollTop);setTimeout(resetActiveScrollTop,80)};
const __openModalFix17=openModal;
openModal=function(h){const r=__openModalFix17(h);const card=document.getElementById('modalCard');if(card)card.scrollTop=0;requestAnimationFrame(()=>{if(card)card.scrollTop=0});setTimeout(()=>{if(card)card.scrollTop=0},50);return r};

// 주요 목록에서 길게 눌러 다중 선택 후 한꺼번에 휴지통으로 이동합니다.
const bulkSelection={active:false,items:new Map()};
function bulkKey(kind,id){return kind+'::'+id}
function bulkLabel(kind){return {settings:'설정',characters:'캐릭터',relations:'관계도',images:'이미지',sources:'소스파일',stories:'썰 / 장문',timeline:'타임라인',serials:'연재본',quickMemos:'메모',diaries:'일기',pictureDiaries:'그림일기'}[kind]||kind}
function parseBulkTarget(el){
  if(!el)return null;const code=el.getAttribute('onclick')||'';let m;
  m=code.match(/viewDoc\('([^']+)'\s*,\s*'([^']+)'\)/);if(m)return {kind:m[1],id:m[2]};
  m=code.match(/viewSerial\('([^']+)'\)/);if(m)return {kind:'serials',id:m[1]};
  m=code.match(/editQuickMemo\('([^']+)'\)/);if(m)return {kind:'quickMemos',id:m[1]};
  m=code.match(/newDiary\('([^']+)'\)/);if(m){try{return {kind:'diaries',id:decodeObj(m[1]).id}}catch(_){}}
  m=code.match(/newPictureDiary\('([^']+)'\)/);if(m){try{return {kind:'pictureDiaries',id:decodeObj(m[1]).id}}catch(_){}}
  return null;
}
function decorateBulkSelectable(root=document){
  root.querySelectorAll?.('[onclick]').forEach(el=>{if(el.dataset.bulkKind)return;const t=parseBulkTarget(el);if(t&&db[t.kind]?.some(x=>x.id===t.id)){el.dataset.bulkKind=t.kind;el.dataset.bulkId=t.id;el.classList.add('bulkSelectable')}})
}
function ensureBulkBar(){
  let bar=document.getElementById('bulkSelectBar');if(bar)return bar;
  bar=document.createElement('div');bar.id='bulkSelectBar';bar.innerHTML=`<div><b id="bulkSelectCount">0개 선택</b><div class="meta">항목을 눌러 추가 선택할 수 있습니다.</div></div><div class="right"><button type="button" onclick="cancelBulkSelection()">취소</button><button type="button" class="danger" onclick="deleteBulkSelection()">선택 삭제</button></div>`;document.body.appendChild(bar);return bar
}
function updateBulkUI(){
  const bar=ensureBulkBar();bar.classList.toggle('show',bulkSelection.active);const c=document.getElementById('bulkSelectCount');if(c)c.textContent=`${bulkSelection.items.size}개 선택`;
  document.body.classList.toggle('bulkSelecting',bulkSelection.active);
  document.querySelectorAll('[data-bulk-kind][data-bulk-id]').forEach(el=>el.classList.toggle('bulkSelected',bulkSelection.items.has(bulkKey(el.dataset.bulkKind,el.dataset.bulkId))))
}
function enterBulkSelection(el){const t=parseBulkTarget(el);if(!t)return;bulkSelection.active=true;bulkSelection.items.set(bulkKey(t.kind,t.id),t);updateBulkUI()}
function toggleBulkSelection(el){const t=parseBulkTarget(el);if(!t)return;const k=bulkKey(t.kind,t.id);bulkSelection.items.has(k)?bulkSelection.items.delete(k):bulkSelection.items.set(k,t);if(!bulkSelection.items.size){cancelBulkSelection();return}updateBulkUI()}
function cancelBulkSelection(){bulkSelection.active=false;bulkSelection.items.clear();updateBulkUI()}
function deleteBulkSelection(){
  const arr=[...bulkSelection.items.values()];if(!arr.length)return cancelBulkSelection();
  if(!confirm(`${arr.length}개 항목을 휴지통으로 이동하시겠습니까?`))return;
  for(const t of arr){const list=db[t.kind]||[],x=list.find(z=>z.id===t.id);if(!x)continue;db.trash.unshift({id:uid(),kind:t.kind,data:x,deletedAt:Date.now()});db[t.kind]=list.filter(z=>z.id!==t.id)}
  persist();cancelBulkSelection();renderAll();if(currentProjectType()==='memo')renderMemoProjectList();renderTrash();
}
let bulkPressTimer=null,bulkStartX=0,bulkStartY=0,bulkPressedEl=null,bulkLongTriggered=false,bulkSuppressClickUntil=0;
// 마우스/스타일러스만 pointer 경로를 사용합니다. 터치는 아래 touch 전용 경로에서 한 번만 처리합니다.
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch')return;
  if(e.button!=null&&e.button!==0)return;if(e.target.closest('button,input,textarea,select,a,label'))return;const el=e.target.closest('[data-bulk-kind][data-bulk-id]');if(!el)return;
  if(bulkSelection.active){e.preventDefault();e.stopPropagation();toggleBulkSelection(el);bulkSuppressClickUntil=Date.now()+450;return}
  bulkStartX=e.clientX;bulkStartY=e.clientY;bulkPressedEl=el;bulkLongTriggered=false;clearTimeout(bulkPressTimer);bulkPressTimer=setTimeout(()=>{bulkLongTriggered=true;bulkSuppressClickUntil=Date.now()+650;enterBulkSelection(el);try{navigator.vibrate?.(25)}catch(_){}},560)
},true);
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!bulkPressTimer)return;if(Math.abs(e.clientX-bulkStartX)>10||Math.abs(e.clientY-bulkStartY)>10){clearTimeout(bulkPressTimer);bulkPressTimer=null}},true);
for(const ev of ['pointerup','pointercancel'])document.addEventListener(ev,e=>{if(e.pointerType==='touch')return;clearTimeout(bulkPressTimer);bulkPressTimer=null;bulkPressedEl=null},true);
document.addEventListener('click',e=>{const el=e.target.closest('[data-bulk-kind][data-bulk-id]');if(!el)return;if(bulkSelection.active||bulkLongTriggered||Date.now()<bulkSuppressClickUntil){e.preventDefault();e.stopImmediatePropagation();bulkLongTriggered=false}},true);
const bulkObserver=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)decorateBulkSelectable(n)});bulkObserver.observe(document.body,{childList:true,subtree:true});setTimeout(()=>decorateBulkSelectable(document),100);



// ===== fix18: 프로젝트 화면 빠른 메모 / 모바일 길게 선택 / 연재 툴바 / 타임라인 헤더 정돈 =====
const fix18Style=document.createElement('style');
fix18Style.textContent=`
.projectMemoQuick{margin-top:2px;padding-top:12px;border-top:1px solid var(--line);display:grid;gap:8px}
.projectMemoQuick textarea{min-height:74px;max-height:150px;resize:vertical;padding:10px 11px;font-size:13px;line-height:1.55}
.projectMemoQuickRow{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.projectMemoQuickRow .meta{margin-right:auto}
.projectMemoQuick button{padding:8px 14px}
.serialToolbar select{appearance:none!important;-webkit-appearance:none!important;background-image:none!important;padding-right:9px!important}
.timelineTitleLine{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;padding-right:42px;margin-bottom:2px}
.timelineTitleLine>b{min-width:0;overflow-wrap:anywhere}
.timelineTitleLine>.status{padding:2px 6px;margin:0;font-size:9px;line-height:1.35;flex:0 0 auto}
.timelineItem>.meta{padding-right:42px;line-height:1.4;margin-top:0}
.bulkSelectable{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
.bulkSelecting .bulkSelectable{touch-action:manipulation}
`;
document.head.appendChild(fix18Style);

// 메모 프로젝트를 만들었을 때 프로젝트 내부로 자동 진입시키지 않습니다.
// 프로젝트 카드 안에서 빠르게 기록하고, 저장된 내용은 프로젝트 내부 목록에서만 확인합니다.
saveProject=function(id){return __saveProjectFix17(id)};
// 메모 프로젝트도 사용자가 직접 작성란을 눌렀을 때만 키보드가 열리도록 자동 포커스를 제거합니다.
openProject=function(id){resetActiveScrollTop();__openProjectFix16(id);requestAnimationFrame(resetActiveScrollTop);setTimeout(resetActiveScrollTop,80)};

function saveProjectCardMemo(pid){
  const box=document.querySelector(`.projectMemoQuick[data-project-id="${pid}"]`),ta=box?.querySelector('textarea');
  const text=(ta?.value||'').trim();if(!text)return alert('메모 내용을 입력해 주세요.');
  db.quickMemos.unshift({id:uid(),title:'',text,tags:'',favorite:false,project:pid,created:Date.now(),updated:Date.now()});
  const p=db.projects.find(x=>x.id===pid);if(p)p.updated=Date.now();persist();
  if(ta){ta.value='';try{ta.focus({preventScroll:true})}catch(_){ta.focus()}}
  const c=box?.querySelector('[data-memo-count]');if(c)c.textContent=`저장됨 · 메모 ${(db.quickMemos||[]).filter(x=>x.project===pid).length}개`;
}

renderProjects=async function(){
  let q=v('projectSearch').toLowerCase(),mode=v('projectSort')||'latest',arr=sortArr(db.projects.filter(p=>`${p.name} ${p.desc||''}`.toLowerCase().includes(q)),mode),shown=arr.slice(0,limits.projects),blocks=[];
  for(let p of shown){
    let cover='';if(p.coverImageId)cover=await getFile(p.coverImageId);
    const memoQuick=p.projectType==='memo'?`<div class="projectMemoQuick" data-project-id="${p.id}" onclick="event.stopPropagation()"><textarea placeholder="여기에 바로 메모를 작성해 주세요." onclick="event.stopPropagation()"></textarea><div class="projectMemoQuickRow"><span class="meta" data-memo-count>메모 ${(db.quickMemos||[]).filter(x=>x.project===p.id).length}개</span><button class="primary" type="button" onpointerdown="event.preventDefault()" onclick="event.stopPropagation();saveProjectCardMemo('${p.id}')">저장</button></div></div>`:'';
    blocks.push(`<div class="card projectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead ${cover?'hasCover':''}">${cover?`<img class="projectCover" src="${cover}" alt="">`:''}<div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span></div><div class="projectDesc">${esc(p.desc||'설명 없음')}</div>${expandedProjectStatsHtml(p)}${memoQuick}<div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div>`)
  }
  document.getElementById('projectList').innerHTML=blocks.length?blocks.join(''):'<div class="empty">새 프로젝트를 만들어 보세요.</div>';
  toggleMore('projectMore',arr.length,limits.projects);setTimeout(()=>animateStagger(document.getElementById('projectList')),20)
};

// 타임라인 제목/상태를 한 줄 그룹으로 묶어 상태 배지가 연대/본문과 겹치지 않게 합니다.
renderTimeline=async function(){
  if(currentProjectType()==='diary')return __renderTimelineFix15();
  let a=listData('timeline',['title','dateLabel','tags','body','status']);
  a=[...a].sort((x,y)=>{let ax=x.order===''||x.order==null?999999:Number(x.order),ay=y.order===''||y.order==null?999999:Number(y.order);return ax-ay||(x.updated||0)-(y.updated||0)});
  if(!a.length){timelineList.innerHTML='<div class="empty">등록된 타임라인 사건이 없습니다.</div>';return}
  let rows=[];
  for(const t of a){
    const d=t.timelineImageId?await getFile(t.timelineImageId):'';
    rows.push(`<div class="item timelineItem ${d?'hasTimelineImage ':''}${t.favorite?'favorite':''}" onclick="viewDoc('timeline','${t.id}')"><div class="right">${favButton('timeline',t)}</div><div class="timelineTitleLine"><b>${esc(t.title)}</b><span class="status">${esc(creativeStatusValue(t.status))}</span></div><div class="meta">${esc(t.dateLabel||'시기 미정')}${t.order!==''&&t.order!=null?' · 순서 '+esc(t.order):''}</div>${tags(t.tags)}<div class="chips">${linkedChips(t.linkedIds)}</div><div class="snippet">${esc(t.body||'내용 없음')}</div>${d?`<img class="timelineThumb" src="${d}" alt="">`:''}</div>`)
  }
  timelineList.innerHTML=`<div class="timelineLine">${rows.join('')}</div>`;
  setTimeout(()=>decorateBulkSelectable(timelineList),0);
};

// Android WebView 터치 전용 다중 선택. long-press 뒤 contextmenu/pointer가 중복 실행되지 않게 한 경로만 사용합니다.
function bulkCandidateFromTarget(target){
  let el=target?.closest?.('[data-bulk-kind][data-bulk-id]');if(el)return el;
  el=target?.closest?.('.item,.memoCardCompact');if(!el)return null;
  const t=parseBulkTarget(el);if(!t||!db[t.kind]?.some(x=>x.id===t.id))return null;
  el.dataset.bulkKind=t.kind;el.dataset.bulkId=t.id;el.classList.add('bulkSelectable');return el;
}
let fix18TouchTimer=null,fix18TouchEl=null,fix18TouchX=0,fix18TouchY=0,fix18TouchTriggered=false,fix18LastLongAt=0;
document.addEventListener('touchstart',e=>{
  if(e.touches?.length!==1||e.target.closest('button,input,textarea,select,a,label'))return;
  const el=bulkCandidateFromTarget(e.target);if(!el)return;
  if(bulkSelection.active){
    e.preventDefault();e.stopPropagation();toggleBulkSelection(el);bulkSuppressClickUntil=Date.now()+650;return;
  }
  const t=e.touches[0];fix18TouchX=t.clientX;fix18TouchY=t.clientY;fix18TouchEl=el;fix18TouchTriggered=false;clearTimeout(fix18TouchTimer);
  fix18TouchTimer=setTimeout(()=>{fix18TouchTriggered=true;bulkLongTriggered=true;fix18LastLongAt=Date.now();bulkSuppressClickUntil=Date.now()+900;enterBulkSelection(el);try{navigator.vibrate?.(30)}catch(_){}},520);
},{capture:true,passive:false});
document.addEventListener('touchmove',e=>{if(!fix18TouchTimer||!e.touches?.[0])return;const t=e.touches[0];if(Math.abs(t.clientX-fix18TouchX)>14||Math.abs(t.clientY-fix18TouchY)>14){clearTimeout(fix18TouchTimer);fix18TouchTimer=null;fix18TouchEl=null}},true);
for(const ev of ['touchend','touchcancel'])document.addEventListener(ev,e=>{
  clearTimeout(fix18TouchTimer);fix18TouchTimer=null;fix18TouchEl=null;
  if(fix18TouchTriggered){e.preventDefault();e.stopPropagation();bulkSuppressClickUntil=Date.now()+700;setTimeout(()=>{fix18TouchTriggered=false},220)}
},{capture:true,passive:false});
document.addEventListener('contextmenu',e=>{
  const el=bulkCandidateFromTarget(e.target);if(!el)return;e.preventDefault();e.stopPropagation();
  // Android가 long-press 직후 보내는 contextmenu는 이미 선택 처리됐으므로 무시합니다.
  if(Date.now()-fix18LastLongAt<1200||fix18TouchTriggered)return;
  if(!bulkSelection.active)enterBulkSelection(el);
},true);


// ===== fix19: 메모 프로젝트 카드 압축 / 연재 툴바 화살표 제거 보강 =====
const fix19Style=document.createElement('style');
fix19Style.textContent=`
.projectCard.memoProjectCard{padding:14px 16px 13px;display:grid;gap:9px}
.memoProjectCard .projectHead{position:relative;min-height:38px;padding-right:84px;display:block}
.memoProjectCard .projectTitleWrap h3{margin:0 0 3px;font-size:16px;line-height:1.3}
.memoProjectCard .projectTitleWrap .meta{font-size:11px}
.memoProjectCard .typeBadge{position:absolute;right:0;top:0;margin:0;padding:5px 9px;font-size:10px}
.memoProjectCard .projectMemoQuick{margin:0;padding:0;border:0;display:grid;gap:8px}
.memoProjectCard .projectMemoQuick textarea{box-sizing:border-box;width:100%;height:44px;min-height:44px;max-height:44px;resize:none;overflow-y:auto;padding:10px 12px;line-height:22px;white-space:pre-wrap}
.memoProjectCard .projectMemoQuickRow{display:none}
.memoProjectCard .projectActions{margin-top:0;display:flex;justify-content:flex-end;gap:8px;align-items:center}
.memoProjectCard .projectActions .memoCountInline{margin-right:auto;font-size:11px;color:var(--muted)}
.memoProjectCard .projectActions button{padding:9px 14px;min-width:64px}
.serialToolbar .appSelectButton:after{content:none!important;display:none!important}
.serialToolbar .appSelectButton{justify-content:center!important;gap:0!important;padding-right:10px!important}
`;
document.head.appendChild(fix19Style);

renderProjects=async function(){
  let q=v('projectSearch').toLowerCase(),mode=v('projectSort')||'latest',arr=sortArr(db.projects.filter(p=>`${p.name} ${p.desc||''}`.toLowerCase().includes(q)),mode),shown=arr.slice(0,limits.projects),blocks=[];
  for(let p of shown){
    let cover='';if(p.coverImageId)cover=await getFile(p.coverImageId);
    if(p.projectType==='memo'){
      const count=(db.quickMemos||[]).filter(x=>x.project===p.id).length;
      blocks.push(`<div class="card projectCard memoProjectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead"><div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span></div><div class="projectMemoQuick" data-project-id="${p.id}" onclick="event.stopPropagation()"><textarea rows="1" placeholder="여기에 바로 메모를 작성해 주세요." onclick="event.stopPropagation()"></textarea></div><div class="projectActions"><span class="memoCountInline" data-memo-count>메모 ${count}개</span><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button><button class="primary" type="button" onpointerdown="event.preventDefault()" onclick="event.stopPropagation();saveProjectCardMemo('${p.id}')">저장</button></div></div>`);
      continue;
    }
    blocks.push(`<div class="card projectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead ${cover?'hasCover':''}">${cover?`<img class="projectCover" src="${cover}" alt="">`:''}<div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span></div><div class="projectDesc">${esc(p.desc||'설명 없음')}</div>${expandedProjectStatsHtml(p)}<div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div>`)
  }
  document.getElementById('projectList').innerHTML=blocks.length?blocks.join(''):'<div class="empty">새 프로젝트를 만들어 보세요.</div>';
  toggleMore('projectMore',arr.length,limits.projects);setTimeout(()=>animateStagger(document.getElementById('projectList')),20)
};

// custom select로 치환된 연재본 문단/크기 버튼의 화살표도 확실히 제거합니다.
const __newSerialFix19=newSerial;
newSerial=function(x){
  const r=__newSerialFix19(x);
  requestAnimationFrame(()=>document.querySelectorAll('#modalCard .serialToolbar .appSelectButton').forEach(b=>b.classList.add('serialNoArrow')));
  return r;
};

// ===== fix20: 편의성 + 가계부 프로젝트 =====
const fix20Style=document.createElement('style');
fix20Style.textContent=`
button:disabled{opacity:.45;cursor:not-allowed;transform:none!important}
.fontChoice .fontSample{font-synthesis:none!important;font-weight:400!important;letter-spacing:0!important}
.selectExportSubgroup{border:1px solid var(--line);border-radius:13px;overflow:hidden;background:var(--card);margin:8px 0}
.selectExportSubgroup>summary{cursor:pointer;padding:10px 12px;font-weight:760;background:var(--soft);display:flex;justify-content:space-between;gap:8px}
.selectExportSubgroup .selectExportRows{padding:5px 9px 9px}
.ledgerSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.ledgerSummary .ledgerSumCard{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--card);min-width:0}.ledgerSumCard b{display:block;font-size:16px;overflow-wrap:anywhere}.ledgerSumCard span{font-size:11px;color:var(--muted)}
.ledgerForm{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ledgerForm .full{grid-column:1/-1}.ledgerEntry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:13px;background:var(--card)}.ledgerAmount{font-weight:800;white-space:nowrap}.ledgerIncome{color:#357a4a}.ledgerExpense{color:#b14c56}.ledgerDayList{display:grid;gap:8px}.ledgerCalendarWrap{min-width:0;max-width:100%;overflow:hidden}.ledgerCalGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.ledgerCalHead{font-size:11px;color:var(--muted);text-align:center;padding:5px 0}.ledgerCalDay{min-width:0;min-height:70px;padding:7px 5px;border:1px solid var(--line);border-radius:10px;background:var(--card);text-align:left;overflow:hidden}.ledgerCalDay.out{opacity:.35}.ledgerCalDay.active{border-color:var(--theme);box-shadow:inset 0 0 0 1px var(--theme)}.ledgerCalDay .num{font-weight:750;font-size:12px}.ledgerCalDay .money{font-size:9.5px;line-height:1.35;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ledgerCalcDisplay{font-size:28px;text-align:right;padding:16px;min-height:70px;border:1px solid var(--line);border-radius:14px;background:var(--card);overflow-wrap:anywhere}.ledgerCalcKeys{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ledgerCalcKeys button{min-height:48px;font-size:16px}.ledgerMemoList{display:grid;gap:8px}
@media(max-width:640px){.ledgerSummary{gap:6px}.ledgerSummary .ledgerSumCard{padding:10px 8px}.ledgerSumCard b{font-size:14px}.ledgerForm{grid-template-columns:1fr}.ledgerForm .full{grid-column:auto}.ledgerCalDay{min-height:59px;padding:5px 3px}.ledgerCalDay .money{font-size:8.5px}}
`;
document.head.appendChild(fix20Style);

// 데이터 호환: 구형 백업에는 가계부 배열이 없어도 자동으로 빈 배열을 사용합니다.
const __normalizeFix20=normalize;
normalize=function(d){d=__normalizeFix20(d);for(const k of ['ledgerEntries','ledgerMemos','ledgerCategories'])if(!Array.isArray(d[k]))d[k]=[];return d};
for(const k of ['ledgerEntries','ledgerMemos','ledgerCategories'])if(!Array.isArray(db[k]))db[k]=[];

// 프로젝트 유형: 가계부는 일기장/메모장처럼 생성 후 고정합니다.
projectTypeLabel=function(t){return {advanced:'고급 프로젝트',general:'일반 프로젝트',short:'단편 프로젝트',diary:'일기장',memo:'메모장',ledger:'가계부'}[t]||'일반 프로젝트'};
const __projectTypeVisibleTabsFix20=projectTypeVisibleTabs;
projectTypeVisibleTabs=function(type){if(type==='ledger')return ['recent','calendar','quickMemos','settings'];return __projectTypeVisibleTabsFix20(type)};
const __expandedProjectStatsHtmlFix20=expandedProjectStatsHtml;
expandedProjectStatsHtml=function(p){if(p.projectType==='ledger'){const n=(db.ledgerEntries||[]).filter(x=>x.project===p.id).length;return `<div class="projectStats"><span class="statPill">내역 ${n}</span><span class="statPill">가계부</span></div>`}return __expandedProjectStatsHtmlFix20(p)};

newProject=function(p){
  if(typeof p==='string')p=decodeObj(p);
  p=p||{id:uid(),name:'',desc:'',color:'#7b61a8',projectType:'general',coverImageId:'',created:Date.now(),updated:Date.now()};
  const existing=db.projects.find(x=>x.id===p.id),fixed=existing&&['diary','memo','ledger'].includes(existing.projectType);
  let imgs=(db.images||[]).filter(x=>x.project===p.id),coverOptions='<option value="">대표 이미지 없음</option>'+imgs.map(x=>`<option value="${x.id}" ${p.coverImageId===x.id?'selected':''}>${esc(x.title||'이미지')}</option>`).join('');
  let typeControl='';
  if(fixed){typeControl=`<div class="projectTypeLocked">${projectTypeLabel(existing.projectType)} (변경 불가)</div><div class="note projectTypeLockNote">일기장, 메모장, 가계부는 전용 프로젝트 유형으로 생성 후 변경할 수 없습니다.</div>`}
  else if(existing){typeControl=`<select id="ptype"><option value="advanced" ${p.projectType==='advanced'?'selected':''}>고급 프로젝트</option><option value="general" ${p.projectType==='general'?'selected':''}>일반 프로젝트</option><option value="short" ${p.projectType==='short'?'selected':''}>단편 프로젝트</option></select><div class="note">고급 / 일반 / 단편 프로젝트끼리만 유형을 변경할 수 있습니다. 일기장, 메모장, 가계부로는 변경할 수 없습니다.</div>`}
  else{typeControl=`<select id="ptype"><option value="advanced">고급 프로젝트</option><option value="general" selected>일반 프로젝트</option><option value="short">단편 프로젝트</option><option value="diary">일기장</option><option value="memo">메모장</option><option value="ledger">가계부</option></select><div class="note">일기장, 메모장, 가계부는 전용 프로젝트 유형으로 생성 후 다른 유형으로 변경할 수 없습니다.</div>`}
  openModal(`<div class="stack"><h2>${existing?'프로젝트 수정':'새 프로젝트'}</h2><input id="pname" placeholder="프로젝트 이름" value="${esc(p.name||'')}">${typeControl}<textarea id="pdesc" style="min-height:110px" placeholder="설명">${esc(p.desc||'')}</textarea><input id="pcolor" type="color" value="${esc(p.color||'#7b61a8')}"><div class="projectCoverPicker"><div class="meta">프로젝트 대표 이미지</div><select id="pcover" onchange="previewProjectCover(this.value)">${coverOptions}</select><div id="projectCoverPreview" class="projectCoverPreview"><span class="meta">${imgs.length?'대표 이미지를 선택해 주세요.':'이미지 자료를 등록한 뒤 프로젝트 수정에서 선택할 수 있습니다.'}</span></div></div><div class="right">${existing?`<button class="danger" onclick="trashProject('${p.id}')">삭제</button>`:''}<button onclick="closeModal()">취소</button><button class="primary" onclick="saveProject('${p.id}')">저장</button></div></div>`);
  setTimeout(()=>{syncAppSelect(document.getElementById('ptype'));syncAppSelect(document.getElementById('pcover'));previewProjectCover(p.coverImageId||'')},30)
};
saveProject=function(id){
  let name=v('pname').trim();if(!name)return alert('프로젝트 이름을 입력해 주세요.');
  let old=db.projects.find(x=>x.id===id),type='general';
  if(old){if(['diary','memo','ledger'].includes(old.projectType))type=old.projectType;else{const requested=v('ptype')||old.projectType||'general';type=['advanced','general','short'].includes(requested)?requested:(old.projectType||'general')}}
  else{const requested=v('ptype')||'general';type=['advanced','general','short','diary','memo','ledger'].includes(requested)?requested:'general'}
  upsert('projects',{...old,id,name,desc:v('pdesc'),color:v('pcolor'),projectType:type,projectTypeVersion:5,coverImageId:v('pcover')||'',created:old?.created||Date.now(),updated:Date.now()});closeModal();if(currentProjectId===id)openProject(id)
};

// 글꼴 목록 자체를 해당 폰트로 강제 미리보기합니다.
openFontPicker=function(){const cur=localStorage.getItem(APP_FONT_KEY)||'system';openModal(`<div class="stack"><h2>글꼴</h2><div class="note">각 항목의 예시 문장이 실제 해당 글꼴로 표시됩니다.</div><div class="fontChoices">${Object.entries(APP_FONTS).map(([k,f])=>`<button class="fontChoice" onclick="applyAppFont('${k}');closeModal()"><span class="fontSample" style="font-family:${f.css}!important">${esc(f.name)} · 가나다라마바사 ABC 123</span><span class="fontCheck">${cur===k?'✓':''}</span></button>`).join('')}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`)};

// 캐릭터 삭제 잠금: 수정은 허용하고 삭제만 차단합니다.
const __newCharacterFix20=newCharacter;
newCharacter=async function(x){const obj=typeof x==='string'?decodeObj(x):(x||{});await __newCharacterFix20(x);const card=document.getElementById('modalCard');if(!card)return;const fav=document.getElementById('xfav');if(fav&&!document.getElementById('cDeleteLock')){const row=fav.closest('label')||fav.parentElement;const label=document.createElement('label');label.className='checkRow';label.innerHTML=`<input id="cDeleteLock" type="checkbox" ${obj.deleteLocked?'checked':''}> 잠금 (삭제 방지)`;row?.insertAdjacentElement('afterend',label)}if(obj.deleteLocked){for(const b of card.querySelectorAll('button.danger'))if(b.textContent.trim()==='삭제'){b.disabled=true;b.title='잠금을 해제해야 삭제할 수 있습니다.'}}};
const __saveCharacterFix20=saveCharacter;
saveCharacter=function(id){const locked=!!document.getElementById('cDeleteLock')?.checked;const r=__saveCharacterFix20(id);const d=(db.characters||[]).find(x=>x.id===id);if(d){d.deleteLocked=locked;persist();renderCharacters()}return r};
const __trashItemFix20=trashItem;
trashItem=function(kind,id){const x=getDoc(kind,id);if(kind==='characters'&&x?.deleteLocked){alert('잠긴 캐릭터입니다. 삭제하려면 캐릭터 편집에서 잠금을 해제해 주세요.');return}return __trashItemFix20(kind,id)};

// 다중 선택 하단에 선택 PDF를 추가하고 잠긴 캐릭터는 삭제하지 않습니다.
ensureBulkBar=function(){let bar=document.getElementById('bulkSelectBar');if(bar)return bar;bar=document.createElement('div');bar.id='bulkSelectBar';bar.innerHTML=`<div><b id="bulkSelectCount">0개 선택</b><div class="meta">항목을 눌러 추가 선택할 수 있습니다.</div></div><div class="right"><button type="button" onclick="cancelBulkSelection()">취소</button><button type="button" onclick="exportBulkSelectionPdf()">PDF 내보내기</button><button type="button" class="danger" onclick="deleteBulkSelection()">선택 삭제</button></div>`;document.body.appendChild(bar);return bar};
deleteBulkSelection=function(){const arr=[...bulkSelection.items.values()];if(!arr.length)return cancelBulkSelection();if(!confirm(`${arr.length}개 항목을 휴지통으로 이동하시겠습니까?`))return;let locked=0,deleted=0;for(const t of arr){const list=db[t.kind]||[],x=list.find(z=>z.id===t.id);if(!x)continue;if(t.kind==='characters'&&x.deleteLocked){locked++;continue}db.trash.unshift({id:uid(),kind:t.kind,data:x,deletedAt:Date.now()});db[t.kind]=list.filter(z=>z.id!==t.id);deleted++}persist();cancelBulkSelection();renderAll();if(currentProjectType()==='memo')renderMemoProjectList();renderTrash();if(locked)alert(`잠긴 캐릭터 ${locked}개는 삭제하지 않았습니다.${deleted?`\n나머지 ${deleted}개 항목은 휴지통으로 이동했습니다.`:''}`)};
async function exportBulkSelectionPdf(){const allowed=new Set(selectedExportDefs().map(x=>x[0]));const arr=[...bulkSelection.items.values()].filter(t=>allowed.has(t.kind));if(!arr.length)return alert('선택한 항목 중 PDF로 내보낼 수 있는 항목이 없습니다.');const byProject=new Map();for(const t of arr){const x=getDoc(t.kind,t.id);if(!x)continue;const pid=x.project||currentProjectId;if(!byProject.has(pid))byProject.set(pid,[]);byProject.get(pid).push({t,x})}let html=`<article class="pdfDoc"><header class="pdfHead"><div class="pdfEyebrow">선택 항목 모음</div><h1>선택 항목 PDF</h1><p class="lead">총 ${arr.length}개 항목</p></header>`;for(const [pid,rows] of byProject){const p=projectById(pid);html+=`<section class="projectSection"><h2>${esc(p?.name||'프로젝트')}</h2>`;for(const {t,x} of rows)html+=await selectedEntryHtml(t.kind,x);html+='</section>'}html+='</article>';appPrint('선택 항목',html)}

// 내보내기 / 백업의 선택 PDF 목록을 그룹/폴더 기준으로 소분류합니다.
renderSelectedExport=function(){let host=document.getElementById('selectExportGroups');if(!host)return;let pid=v('exportProject');if(!pid){host.innerHTML='<div class="empty">프로젝트를 선택해 주세요.</div>';return}refreshSelectedExportCategory();const category=v('selectExportCategory');if(!category){host.innerHTML='<div class="empty">내보낼 항목이 없습니다.</div>';return}const label=selectedExportDefs().find(([k])=>k===category)?.[1]||category,arr=(db[category]||[]).filter(x=>x.project===pid);if(!arr.length){host.innerHTML='<div class="empty">이 카테고리에 항목이 없습니다.</div>';return}const row=x=>`<label class="selectExportRow"><input type="checkbox" name="pdfPick" value="${category}:${x.id}"><span><b>${esc(titleOf(category,x))}</b><div class="meta">${esc(x.status||x.episode||x.type||x.fileName||'')}</div></span></label>`;let groups=new Map();if(category==='characters'||category==='settings'){for(const x of arr){const g=String(x.group||'').trim()||'미분류';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(x)}}else if(category==='stories'){const folders=(db.storyFolders||[]).filter(f=>f.project===pid),fm=new Map(folders.map(f=>[f.id,f.name||'이름 없는 폴더']));for(const x of arr){const g=x.folderId?(fm.get(x.folderId)||'미분류'):'미분류';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(x)}}else groups.set(label,arr);host.innerHTML=[...groups.entries()].map(([g,items])=>`<details class="selectExportSubgroup" open><summary><span>${esc(g)}</span><span class="meta">${items.length}개</span></summary><div class="selectExportRows">${items.map(row).join('')}</div></details>`).join('')};

// 썰/장문 복제 버튼은 본문 클립보드 복사로 변경합니다.
async function copyPlainText(text,msg='본문을 복사했습니다.'){try{await navigator.clipboard.writeText(text||'');alert(msg)}catch(_){const ta=document.createElement('textarea');ta.value=text||'';ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert(msg)}}
function copyStoryBodyById(id){const x=getDoc('stories',id);if(x)copyPlainText(x.body||'','본문을 복사했습니다.')}
const __viewDocFix20=viewDoc;
viewDoc=async function(kind,id){await __viewDocFix20(kind,id);const card=document.getElementById('modalCard');if(!card)return;if(kind==='stories'){const foot=card.querySelector('.detailFooter');foot?.querySelector('.duplicateGenericBtn')?.remove();if(foot&&!foot.querySelector('.storyCopyBtn')){const b=document.createElement('button');b.className='storyCopyBtn';b.textContent='복사';b.onclick=()=>copyStoryBodyById(id);const edit=[...foot.querySelectorAll('button')].find(q=>q.textContent.trim()==='수정');if(edit)foot.insertBefore(b,edit);else foot.appendChild(b)}}};
const __newStoryFix20=newStory;
newStory=async function(x){const obj=typeof x==='string'?decodeObj(x):(x||{});await __newStoryFix20(x);const foot=document.getElementById('modalCard')?.querySelector('.stack>.right:last-child');if(foot&&obj.id&&!foot.querySelector('.storyCopyBtn')){const b=document.createElement('button');b.type='button';b.className='storyCopyBtn';b.textContent='복사';b.onclick=()=>copyStoryBodyById(obj.id);foot.insertBefore(b,foot.firstChild)}};

// 메모 편집에도 본문 복사 버튼을 추가합니다.
const __editQuickMemoFix20=editQuickMemo;
editQuickMemo=function(id){__editQuickMemoFix20(id);const foot=document.getElementById('modalCard')?.querySelector('.stack>.right:last-child');if(foot&&!foot.querySelector('.memoCopyBtn')){const b=document.createElement('button');b.type='button';b.className='memoCopyBtn';b.textContent='복사';b.onclick=()=>{const x=(db.quickMemos||[]).find(m=>m.id===id);copyPlainText(x?.text||'','메모 본문을 복사했습니다.')};foot.insertBefore(b,foot.firstChild)}};

// ===== 가계부 =====
const LEDGER_EXPENSE=['식비','교통','쇼핑','생활','취미','기타'],LEDGER_INCOME=['급여','부수입','환급','기타'];
function ledgerToday(){const d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`}
function ledgerMoney(n){return `${Math.round(Number(n)||0).toLocaleString('ko-KR')}원`}
function ledgerEntries(pid=currentProjectId){return (db.ledgerEntries||[]).filter(x=>x.project===pid)}
function ledgerMonthKey(date){return String(date||'').slice(0,7)}
function ledgerSums(arr){let income=0,expense=0;for(const x of arr){const a=Number(x.amount)||0;x.type==='income'?income+=a:expense+=a}return {income,expense,balance:income-expense}}
function ledgerSummaryHtml(pid,month){const s=ledgerSums(ledgerEntries(pid).filter(x=>ledgerMonthKey(x.date)===month));return `<div class="ledgerSummary"><div class="ledgerSumCard"><span>총 수입</span><b class="ledgerIncome">${ledgerMoney(s.income)}</b></div><div class="ledgerSumCard"><span>총 지출</span><b class="ledgerExpense">${ledgerMoney(s.expense)}</b></div><div class="ledgerSumCard"><span>잔액</span><b>${ledgerMoney(s.balance)}</b></div></div>`}
function ledgerCategoryOptions(type,selected=''){const base=type==='income'?LEDGER_INCOME:LEDGER_EXPENSE,custom=(db.ledgerCategories||[]).filter(x=>x.project===currentProjectId&&x.type===type).map(x=>x.name),all=[...new Set([...base,...custom])];return all.map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}
let ledgerSelectedDate=ledgerToday(),ledgerCalendarCursor=new Date();
function saveLedgerEntry(id=''){const date=v('ledgerDate')||ledgerSelectedDate,type=v('ledgerType')||'expense',amount=Number(String(v('ledgerAmount')).replace(/,/g,''));if(!amount||amount<0)return alert('금액을 입력해 주세요.');const old=(db.ledgerEntries||[]).find(x=>x.id===id)||{};const obj={...old,id:id||uid(),project:currentProjectId,date,type,amount,category:v('ledgerCategory')||(type==='income'?'기타':'기타'),note:v('ledgerNote').trim(),created:old.created||Date.now(),updated:Date.now()};const i=db.ledgerEntries.findIndex(x=>x.id===obj.id);i>=0?db.ledgerEntries[i]=obj:db.ledgerEntries.unshift(obj);persist();ledgerSelectedDate=date;renderLedgerDay();renderProjects()}
function deleteLedgerEntry(id){if(!confirm('이 내역을 삭제하시겠습니까?'))return;db.ledgerEntries=db.ledgerEntries.filter(x=>x.id!==id);persist();closeModal();renderLedgerAll();renderProjects()}
function editLedgerEntry(id){const x=db.ledgerEntries.find(z=>z.id===id);if(!x)return;openModal(`<div class="stack"><h2>가계부 내역 수정</h2><input id="ledgerEditDate" type="date" value="${esc(x.date)}"><select id="ledgerEditType" onchange="ledgerEditCategoryRefresh('${esc(x.category||'기타')}')"><option value="expense" ${x.type==='expense'?'selected':''}>지출</option><option value="income" ${x.type==='income'?'selected':''}>수입</option></select><input id="ledgerEditAmount" inputmode="decimal" value="${esc(x.amount)}" placeholder="금액"><select id="ledgerEditCategory"></select><input id="ledgerEditNote" value="${esc(x.note||'')}" placeholder="메모"><div class="right"><button class="danger" onclick="deleteLedgerEntry('${id}')">삭제</button><button onclick="closeModal()">취소</button><button class="primary" onclick="saveLedgerEdit('${id}')">저장</button></div></div>`);ledgerEditCategoryRefresh(x.category||'기타');enhanceAllSelects(document.getElementById('modalCard'))}
function ledgerEditCategoryRefresh(selected=''){const type=v('ledgerEditType')||'expense',sel=document.getElementById('ledgerEditCategory');if(sel){sel.innerHTML=ledgerCategoryOptions(type,selected);if(selected)sel.value=selected;syncAppSelect(sel)}}
function saveLedgerEdit(id){const x=db.ledgerEntries.find(z=>z.id===id);if(!x)return;const amount=Number(String(v('ledgerEditAmount')).replace(/,/g,''));if(!amount)return alert('금액을 입력해 주세요.');Object.assign(x,{date:v('ledgerEditDate'),type:v('ledgerEditType'),amount,category:v('ledgerEditCategory'),note:v('ledgerEditNote').trim(),updated:Date.now()});persist();closeModal();renderLedgerAll();renderProjects()}
function renderLedgerDay(){const host=document.getElementById('projectRecent');if(!host||currentProjectType()!=='ledger')return;const date=ledgerSelectedDate||ledgerToday(),month=ledgerMonthKey(date),arr=ledgerEntries().filter(x=>x.date===date).sort((a,b)=>(b.updated||0)-(a.updated||0)),s=ledgerSums(arr);host.innerHTML=`${ledgerSummaryHtml(currentProjectId,month)}<div class="toolbar"><div><h3 style="margin:0">하루내역</h3><div class="meta">${esc(date)} · 수입 ${ledgerMoney(s.income)} · 지출 ${ledgerMoney(s.expense)}</div></div></div><div class="card stack" style="margin-bottom:12px"><div class="ledgerForm"><input id="ledgerDate" type="date" value="${esc(date)}" onchange="ledgerSelectedDate=this.value;renderLedgerDay()"><select id="ledgerType" onchange="ledgerTypeChanged()"><option value="expense">지출</option><option value="income">수입</option></select><input id="ledgerAmount" inputmode="decimal" placeholder="금액"><select id="ledgerCategory">${ledgerCategoryOptions('expense')}</select><input id="ledgerNote" class="full" placeholder="메모 (선택)"><button class="primary full" onclick="saveLedgerEntry()">내역 저장</button></div></div><div class="ledgerDayList">${arr.length?arr.map(x=>`<div class="ledgerEntry" onclick="editLedgerEntry('${x.id}')"><div><b>${esc(x.category||'기타')}</b><div class="meta">${esc(x.note||'메모 없음')}</div></div><div class="ledgerAmount ${x.type==='income'?'ledgerIncome':'ledgerExpense'}">${x.type==='income'?'+':'-'} ${ledgerMoney(x.amount)}</div></div>`).join(''):'<div class="empty">이 날짜의 내역이 없습니다.</div>'}</div>`;enhanceAllSelects(host)}
function ledgerTypeChanged(){const type=v('ledgerType')||'expense',sel=document.getElementById('ledgerCategory');if(sel){sel.innerHTML=ledgerCategoryOptions(type);syncAppSelect(sel)}}
function ledgerCalendarMove(delta){ledgerCalendarCursor=new Date(ledgerCalendarCursor.getFullYear(),ledgerCalendarCursor.getMonth()+delta,1);renderLedgerCalendar()}
function renderLedgerCalendar(){const host=document.getElementById('projectCalendar');if(!host||currentProjectType()!=='ledger')return;const y=ledgerCalendarCursor.getFullYear(),m=ledgerCalendarCursor.getMonth(),month=`${y}-${String(m+1).padStart(2,'0')}`,first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),byDate=new Map();for(const x of ledgerEntries()){if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x)}let cells='';for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,rows=byDate.get(ds)||[],sum=ledgerSums(rows);cells+=`<button class="ledgerCalDay ${d.getMonth()!==m?'out':''} ${ds===ledgerSelectedDate?'active':''}" onclick="ledgerSelectedDate='${ds}';renderLedgerCalendar()"><div class="num">${d.getDate()}</div>${rows.length?`<div class="money ledgerExpense">-${ledgerMoney(sum.expense)}</div>`:''}</button>`}const selected=byDate.get(ledgerSelectedDate)||[],ss=ledgerSums(selected);host.innerHTML=`${ledgerSummaryHtml(currentProjectId,month)}<div class="ledgerCalendarWrap"><div class="toolbar"><button onclick="ledgerCalendarMove(-1)">‹</button><b>${y}년 ${m+1}월</b><button onclick="ledgerCalendarMove(1)">›</button></div><div class="ledgerCalGrid">${['일','월','화','수','목','금','토'].map(x=>`<div class="ledgerCalHead">${x}</div>`).join('')}${cells}</div><div class="card" style="margin-top:12px"><b>${esc(ledgerSelectedDate)}</b><div class="meta">수입 ${ledgerMoney(ss.income)} · 지출 ${ledgerMoney(ss.expense)}</div><div class="ledgerDayList" style="margin-top:9px">${selected.length?selected.map(x=>`<div class="ledgerEntry" onclick="editLedgerEntry('${x.id}')"><div><b>${esc(x.category||'기타')}</b><div class="meta">${esc(x.note||'')}</div></div><div class="ledgerAmount ${x.type==='income'?'ledgerIncome':'ledgerExpense'}">${x.type==='income'?'+':'-'} ${ledgerMoney(x.amount)}</div></div>`).join(''):'<div class="meta">기록이 없습니다.</div>'}</div></div></div>`}
function saveLedgerMemo(){const title=v('ledgerMemoTitle').trim(),body=v('ledgerMemoBody').trim(),date=v('ledgerMemoDate')||ledgerToday();if(!body)return alert('메모 내용을 입력해 주세요.');db.ledgerMemos.unshift({id:uid(),project:currentProjectId,title,body,date,created:Date.now(),updated:Date.now()});persist();renderLedgerMemos()}
function deleteLedgerMemo(id){if(!confirm('이 메모를 삭제하시겠습니까?'))return;db.ledgerMemos=db.ledgerMemos.filter(x=>x.id!==id);persist();renderLedgerMemos()}
function renderLedgerMemos(){const host=document.getElementById('projectQuickMemos');if(!host||currentProjectType()!=='ledger')return;const arr=(db.ledgerMemos||[]).filter(x=>x.project===currentProjectId).sort((a,b)=>(b.updated||0)-(a.updated||0));host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0">간편메모</h3><div class="meta">가계부 안에서만 사용하는 간단한 메모입니다.</div></div></div><div class="card stack"><input id="ledgerMemoTitle" placeholder="제목 (선택)"><textarea id="ledgerMemoBody" style="min-height:110px" placeholder="내용"></textarea><input id="ledgerMemoDate" type="date" value="${ledgerToday()}"><button class="primary" onclick="saveLedgerMemo()">메모 저장</button></div><div class="ledgerMemoList" style="margin-top:12px">${arr.length?arr.map(x=>`<div class="item"><b>${esc(x.title||((x.body||'').slice(0,28)||'메모'))}</b><div class="meta">${esc(x.date||'')}</div><div class="snippet">${esc(x.body||'')}</div><div class="right"><button class="danger" onclick="event.stopPropagation();deleteLedgerMemo('${x.id}')">삭제</button></div></div>`).join(''):'<div class="empty">저장된 메모가 없습니다.</div>'}</div>`}
let ledgerCalcExpr='';function ledgerCalcPress(vv){if(vv==='AC')ledgerCalcExpr='';else if(vv==='BS')ledgerCalcExpr=ledgerCalcExpr.slice(0,-1);else if(vv==='='){try{const safe=ledgerCalcExpr.replace(/×/g,'*').replace(/÷/g,'/');if(!/^[0-9+\-*/. ]+$/.test(safe))throw 0;const n=Function('"use strict";return ('+safe+')')();ledgerCalcExpr=Number.isFinite(n)?String(Math.round((n+Number.EPSILON)*1000000)/1000000):''}catch(_){ledgerCalcExpr=''}}else if(vv==='%')ledgerCalcExpr+='÷100';else ledgerCalcExpr+=vv;const d=document.getElementById('ledgerCalcDisplay');if(d)d.textContent=ledgerCalcExpr||'0'}
function ledgerCalcRecord(type){let safe=ledgerCalcExpr.replace(/×/g,'*').replace(/÷/g,'/'),n=0;try{if(/^[0-9+\-*/. ]+$/.test(safe))n=Number(Function('"use strict";return ('+safe+')')())||0}catch(_){}if(!n)return alert('계산 결과가 없습니다.');ledgerSelectedDate=ledgerToday();document.querySelector('[data-subtab="recent"]')?.click();setTimeout(()=>{const a=document.getElementById('ledgerAmount'),t=document.getElementById('ledgerType');if(a)a.value=Math.abs(n);if(t){t.value=type;ledgerTypeChanged();syncAppSelect(t)}},50)}
function renderLedgerCalculator(){const host=document.getElementById('projectSettings');if(!host||currentProjectType()!=='ledger')return;host.innerHTML=`<div class="toolbar"><div><h3 style="margin:0">계산기</h3><div class="meta">간단한 금액 계산 후 바로 수입/지출로 기록할 수 있습니다.</div></div></div><div id="ledgerCalcDisplay" class="ledgerCalcDisplay">${esc(ledgerCalcExpr||'0')}</div><div class="ledgerCalcKeys" style="margin-top:10px">${['AC','BS','%','÷','7','8','9','×','4','5','6','-','1','2','3','+','0','00','.','='].map(k=>`<button ${k==='='?'class="primary"':''} onclick="ledgerCalcPress('${k}')">${k==='BS'?'⌫':k}</button>`).join('')}</div><div class="row" style="margin-top:10px"><button onclick="ledgerCalcRecord('expense')">지출로 기록</button><button onclick="ledgerCalcRecord('income')">수입으로 기록</button></div>`}
function renderLedgerAll(){if(currentProjectType()!=='ledger')return;renderLedgerDay();renderLedgerCalendar();renderLedgerMemos();renderLedgerCalculator()}
const __renderRecentFix20=renderRecent;
renderRecent=function(){if(currentProjectType()==='ledger')return renderLedgerDay();return __renderRecentFix20()};
const __renderProjectAllFix20=renderProjectAll;
renderProjectAll=function(){if(currentProjectType()==='ledger'){renderLedgerAll();return}return __renderProjectAllFix20()};
const __openProjectFix20=openProject;
openProject=function(id){__openProjectFix20(id);const p=projectById(id);if(p?.projectType==='ledger'){const names={recent:'하루내역',calendar:'캘린더',quickMemos:'간편메모',settings:'계산기'};for(const [k,n] of Object.entries(names)){const b=document.querySelector(`[data-subtab="${k}"]`);if(b)b.textContent=n}ledgerSelectedDate=ledgerToday();ledgerCalendarCursor=new Date();renderLedgerAll()}else{const names={recent:'최근',calendar:'캘린더',quickMemos:p?.projectType==='memo'?'메모':'빠른 메모',settings:'설정'};for(const [k,n] of Object.entries(names)){const b=document.querySelector(`[data-subtab="${k}"]`);if(b)b.textContent=n}}};

// 프로젝트 삭제/복원에 가계부 데이터도 포함합니다.
trashProject=function(pid){let p=db.projects.find(x=>x.id===pid);if(!p||!confirm(`'${p.name}' 프로젝트 전체를 휴지통으로 이동하시겠습니까?`))return;let bundle={project:p,items:{}};for(let k of ['settings','characters','relations','characterRelations','images','sources','stories','timeline','serials','storyFolders','videos','quickMemos','diaries','pictureDiaries','characterGroups','settingGroups','ledgerEntries','ledgerMemos','ledgerCategories']){bundle.items[k]=(db[k]||[]).filter(x=>x.project===pid);db[k]=(db[k]||[]).filter(x=>x.project!==pid)}db.projects=db.projects.filter(x=>x.id!==pid);db.trash.unshift({id:uid(),kind:'project',data:bundle,deletedAt:Date.now()});currentProjectId=null;persist();closeModal();closeProject();renderAll()};

// 가계부 프로젝트 카드와 기존 메모 전용 카드 렌더링을 함께 유지합니다.
renderProjects=async function(){let q=v('projectSearch').toLowerCase(),mode=v('projectSort')||'latest',arr=sortArr(db.projects.filter(p=>`${p.name} ${p.desc||''}`.toLowerCase().includes(q)),mode),shown=arr.slice(0,limits.projects),blocks=[];for(let p of shown){let cover='';if(p.coverImageId)cover=await getFile(p.coverImageId);if(p.projectType==='memo'){const count=(db.quickMemos||[]).filter(x=>x.project===p.id).length;blocks.push(`<div class="card projectCard memoProjectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead"><div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span></div><div class="projectMemoQuick" data-project-id="${p.id}" onclick="event.stopPropagation()"><textarea rows="1" placeholder="여기에 바로 메모를 작성해 주세요." onclick="event.stopPropagation()"></textarea></div><div class="projectActions"><span class="memoCountInline" data-memo-count>메모 ${count}개</span><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button><button class="primary" type="button" onpointerdown="event.preventDefault()" onclick="event.stopPropagation();saveProjectCardMemo('${p.id}')">저장</button></div></div>`);continue}if(p.projectType==='ledger'){blocks.push(`<div class="card projectCard ledgerProjectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="ledgerProjectMain"><div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span><div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div></div>`);continue}blocks.push(`<div class="card projectCard" style="--pcolor:${p.color||'#7b61a8'}" onclick="openProject('${p.id}')"><div class="projectHead ${cover?'hasCover':''}">${cover?`<img class="projectCover" src="${cover}" alt="">`:''}<div class="projectTitleWrap"><h3>${esc(p.name)}</h3><div class="meta">${fmt(p.updated||p.created)}</div></div><span class="typeBadge">${projectTypeLabel(p.projectType)}</span></div><div class="projectDesc">${esc(p.desc||'설명 없음')}</div>${expandedProjectStatsHtml(p)}<div class="projectActions"><button onclick="event.stopPropagation();newProject(${encodeObj(p)})">수정</button><button class="danger" onclick="event.stopPropagation();trashProject('${p.id}')">삭제</button></div></div>`)}document.getElementById('projectList').innerHTML=blocks.length?blocks.join(''):'<div class="empty">새 프로젝트를 만들어 보세요.</div>';toggleMore('projectMore',arr.length,limits.projects);setTimeout(()=>animateStagger(document.getElementById('projectList')),20)};

// ZIP 복원 선택창이 두 번 뜨던 중복 호출도 제거합니다.
importZipBackup=function(){if(!window.Android?.chooseZipBackup){alert('ZIP 백업 복원은 Android 앱에서 사용할 수 있습니다.');return}if(!confirm('ZIP 백업을 복원하시겠습니까?\n\n복원 파일이 완전히 준비되기 전에는 현재 데이터를 변경하지 않습니다. 중요한 자료가 있다면 먼저 백업해 주세요.'))return;zipStatus('ZIP 백업 파일을 선택해 주세요.');Android.chooseZipBackup()};


setupSections();enhanceListSelects();syncAppSelect(document.getElementById('projectSort'));setMode(localStorage.getItem('creativeStudioStoryHandMode')||'light');renderAll();updateAppTitle();setTimeout(()=>{restartMotion(document.querySelector('.wrap'),'motion-enter');animateStagger(document)},80);


// FIX21: force each preview sample to use the actual bundled font family.
APP_FONTS.mono={name:'둥글고 귀여운 · 꾸불림',css:'"Fix21Kkubulim",sans-serif',previewClass:'fontPreviewKkubulim'};
APP_FONTS.light={name:'손글씨 / 캐주얼 · One Pretty Night',css:'"Fix21PrettyNight",cursive',previewClass:'fontPreviewPretty'};
APP_FONTS.condensed={name:'개성 있는 한글 · 한글누리',css:'"Fix21Nuri",sans-serif',previewClass:'fontPreviewNuri'};
openFontPicker=function(){
  const cur=localStorage.getItem(APP_FONT_KEY)||'system';
  openModal(`<div class="stack"><h2>글꼴</h2><div class="note">각 항목의 예시 문장이 실제 해당 글꼴로 표시됩니다.</div><div class="fontChoices">${Object.entries(APP_FONTS).map(([k,f])=>`<button class="fontChoice" onclick="applyAppFont('${k}');closeModal()"><span class="fontSample ${f.previewClass||''}" style="font-family:${f.css}!important">${esc(f.name)} · 가나다라마바사 ABC 123</span><span class="fontCheck">${cur===k?'✓':''}</span></button>`).join('')}</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>`);
};

// FIX21: folder groups are static containers rather than <details>, so story
// rows are always visible in Android WebView. Folder order follows the app's folder list.
renderSelectedExport=function(){
  const host=document.getElementById('selectExportGroups');if(!host)return;
  const pid=v('exportProject');if(!pid){host.innerHTML='<div class="empty">프로젝트를 선택해 주세요.</div>';return}
  refreshSelectedExportCategory();
  const category=v('selectExportCategory');
  if(!category){host.innerHTML='<div class="empty">내보낼 항목이 없습니다.</div>';return}
  const label=selectedExportDefs().find(([k])=>k===category)?.[1]||category;
  const arr=(db[category]||[]).filter(x=>x.project===pid);
  if(!arr.length){host.innerHTML='<div class="empty">이 카테고리에 항목이 없습니다.</div>';return}
  const row=x=>`<label class="selectExportRow"><input type="checkbox" name="pdfPick" value="${category}:${x.id}"><span><b>${esc(titleOf(category,x)||'제목 없음')}</b><div class="meta">${esc(x.status||x.episode||x.type||x.fileName||'')}</div></span></label>`;
  let groups=[];
  if(category==='characters'||category==='settings'){
    const map=new Map();
    for(const x of arr){const g=String(x.group||'').trim()||'미분류';if(!map.has(g))map.set(g,[]);map.get(g).push(x)}
    groups=[...map.entries()];
  }else if(category==='stories'){
    const folders=(db.storyFolders||[]).filter(f=>f.project===pid);
    const used=new Set();
    for(const f of folders){const items=arr.filter(x=>x.folderId===f.id);if(items.length){groups.push([f.name||'이름 없는 폴더',items]);items.forEach(x=>used.add(x.id))}}
    const rest=arr.filter(x=>!used.has(x.id));
    if(rest.length)groups.push(['미분류',rest]);
  }else groups=[[label,arr]];
  host.innerHTML=groups.map(([g,items])=>`<div class="selectExportSubgroupStatic"><div class="selectExportSubhead"><span>${esc(g)}</span><span class="meta">${items.length}개</span></div><div class="selectExportRows">${items.map(row).join('')}</div></div>`).join('');
};


// FIX22: 썰/장문 편집에서는 Android WebView의 중첩 스크롤을 피하고
// 모달 카드 하나만 세로 스크롤 컨테이너로 사용합니다.
const __newStoryFix22 = newStory;
newStory = async function(x){
  await __newStoryFix22(x);
  const ed=document.getElementById('tbody');
  if(ed){
    ed.classList.add('storyLongEditor');
    if(window.matchMedia('(max-width:680px)').matches){
      ed.style.height='auto';
      ed.style.minHeight='275px';
      ed.style.maxHeight='none';
      ed.style.overflowY='visible';
      ed.style.touchAction='pan-y';
    }
  }
  const card=document.getElementById('modalCard');
  if(card){card.style.overscrollBehavior='contain';card.scrollTop=0}
};

function linkedSubgroupName(kind,x){
  if(kind==='settings'||kind==='characters') return groupName(x);
  if(kind==='stories'){
    const f=(db.storyFolders||[]).find(z=>z.id===x.folderId&&z.project===currentProjectId);
    return f?.name||'미분류';
  }
  if(kind==='relations') return String(x.kind||'미분류').trim()||'미분류';
  if(kind==='timeline'){
    const d=String(x.dateLabel||'').trim();
    return d ? (d.length>18?d.slice(0,18)+'…':d) : '시기 미정';
  }
  return '미분류';
}
function linkedFilterDocs(input){
  const root=input?.closest('.linkedBox'); if(!root)return;
  const q=String(input.value||'').trim().toLowerCase();
  root.querySelectorAll('.linkedDocRow').forEach(row=>{
    row.style.display=!q||String(row.dataset.search||'').includes(q)?'flex':'none';
  });
  root.querySelectorAll('.linkedSubgroup').forEach(g=>{
    const visible=[...g.querySelectorAll('.linkedDocRow')].some(r=>r.style.display!=='none');
    g.style.display=visible?'':'none'; if(q&&visible)g.open=true;
  });
  root.querySelectorAll('.linkedCategory').forEach(g=>{
    const visible=[...g.querySelectorAll('.linkedSubgroup')].some(r=>r.style.display!=='none');
    g.style.display=visible?'':'none'; if(q&&visible)g.open=true;
  });
}
linkedPicker=function(cur=[],selfKind='',selfId=''){
  const defs=[['settings','설정'],['characters','캐릭터'],['relations','관계도 / 소속'],['stories','썰 / 장문'],['timeline','타임라인']];
  const cats=[];
  for(const [k,label] of defs){
    const arr=(db[k]||[]).filter(x=>x.project===currentProjectId&&!(k===selfKind&&x.id===selfId));
    if(!arr.length)continue;
    const map=new Map();
    for(const x of arr){const sub=linkedSubgroupName(k,x);if(!map.has(sub))map.set(sub,[]);map.get(sub).push(x)}
    const groups=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ko'));
    const checkedInCat=arr.some(x=>cur.includes(k+':'+x.id));
    cats.push(`<details class="linkedCategory" ${checkedInCat?'open':''}><summary><span>${esc(label)}</span><span class="meta">${arr.length}개</span></summary><div class="linkedCategoryBody">${groups.map(([sub,items])=>{const checked=items.some(x=>cur.includes(k+':'+x.id));return `<details class="linkedSubgroup" ${checked?'open':''}><summary><span>${esc(sub)}</span><span class="meta">${items.length}개</span></summary><div class="linkedSubgroupRows">${items.map(x=>{const title=titleOf(k,x);const val=k+':'+x.id;const search=(label+' '+sub+' '+title+' '+String(x.tags||'')).toLowerCase();return `<label class="checkRow linkedDocRow" data-search="${esc(search)}"><input type="checkbox" name="linkedDoc" value="${esc(val)}" ${cur.includes(val)?'checked':''}><span>${esc(title)}</span></label>`}).join('')}</div></details>`}).join('')}</div></details>`)
  }
  return `<div class="linkedBox"><b>문서 링크</b><div class="meta">카테고리와 소분류를 열어 관련 문서를 선택할 수 있습니다.</div><input class="linkedPickerSearch" placeholder="관련 문서 검색..." oninput="linkedFilterDocs(this)"><div class="linkedTree">${cats.length?cats.join(''):'<div class="meta">연결할 수 있는 문서가 아직 없습니다.</div>'}</div></div>`;
};


// ===== fix22 memo save hotfix: 프로젝트 카드 / 메모장 내부 저장 보강 =====
function ensureQuickMemoStore(){
  if(!Array.isArray(db.quickMemos)) db.quickMemos=[];
  return db.quickMemos;
}
function createMemoEntryForProject(pid,{title='',text='',tags='',favorite=false}={}){
  pid=String(pid||'');
  const project=(db.projects||[]).find(p=>String(p.id)===pid);
  text=String(text||'').trim();
  if(!project||project.projectType!=='memo') return null;
  if(!text) return null;
  const now=Date.now();
  const item={id:uid(),title:String(title||'').trim(),text,tags:String(tags||'').trim(),favorite:!!favorite,project:project.id,created:now,updated:now};
  ensureQuickMemoStore().unshift(item);
  project.updated=now;
  persist();
  return item;
}

saveProjectCardMemo=function(pid){
  const box=document.querySelector(`.projectMemoQuick[data-project-id="${pid}"]`);
  const ta=box?.querySelector('textarea');
  const text=(ta?.value||'').trim();
  if(!text)return alert('메모 내용을 입력해 주세요.');
  const saved=createMemoEntryForProject(pid,{text});
  if(!saved)return alert('메모를 저장하지 못했습니다. 프로젝트를 다시 열어 확인해 주세요.');
  if(ta)ta.value='';
  const count=(db.quickMemos||[]).filter(x=>x.project===pid).length;
  const c=box?.querySelector('[data-memo-count]');if(c)c.textContent=`메모 ${count}개`;
  // 프로젝트 카드의 개수 표시도 즉시 동기화하되 입력 포커스는 강제로 열지 않습니다.
  requestAnimationFrame(()=>{const fresh=document.querySelector(`.projectMemoQuick[data-project-id="${pid}"] [data-memo-count]`);if(fresh)fresh.textContent=`메모 ${count}개`});
};

saveMemoProjectEntry=function(){
  const ti=document.getElementById('memoTitleInput');
  const bi=document.getElementById('memoBodyInput');
  const tg=document.getElementById('memoTagsInput');
  const text=(bi?.value||'').trim();
  if(!text)return alert('메모 내용을 입력해 주세요.');
  const saved=createMemoEntryForProject(currentProjectId,{title:ti?.value||'',text,tags:tg?.value||''});
  if(!saved)return alert('메모를 저장하지 못했습니다. 프로젝트를 다시 열어 확인해 주세요.');
  if(ti)ti.value=''; if(bi)bi.value=''; if(tg)tg.value='';
  renderMemoProjectList();
  const count=document.getElementById('memoProjectCount');if(count)count.textContent=`메모 ${(db.quickMemos||[]).filter(x=>x.project===currentProjectId).length}개`;
  setTimeout(()=>{if(bi&&document.body.contains(bi)){try{bi.focus({preventScroll:true})}catch(_){bi.focus()}}},40);
};


// ===== FIX22 pre-test hotfix: 프로젝트 유형 전환 시 화면/탭 상태 완전 초기화 =====
// 가계부가 projectSettings/projectRecent 등 공용 컨테이너를 전용 UI로 교체하므로,
// 다른 프로젝트로 이동할 때 표준 섹션 구조를 다시 만들어 이전 프로젝트 UI가 섞이지 않게 합니다.
function ensureProjectShellForType(p){
  if(!p)return;
  if(p.projectType!=='ledger'){
    // 가계부 계산기 등이 표준 설정 컨테이너를 덮어쓴 흔적이 있으면 원래 목록 구조를 복원합니다.
    if(!document.getElementById('settingsList') || !document.getElementById('storiesList') || !document.getElementById('charactersList')){
      setupSections();
      enhanceListSelects();
    }
  }
}
function defaultSubtabForProjectType(type){
  if(type==='ledger')return 'recent';       // 하루내역
  if(type==='memo')return 'quickMemos';    // 메모
  if(type==='diary')return 'diaries';      // 일기장
  return 'recent';                         // 고급/일반/단편
}
function resetProjectSubtabState(p){
  if(!p||currentProjectId!==p.id)return;
  ensureProjectShellForType(p);
  applyExpandedProjectType(p);

  // 이전 프로젝트에서 남은 active/hidden 상태를 지우고 현재 유형의 기본 탭으로 시작합니다.
  const buttons=[...document.querySelectorAll('.subtabs button[data-subtab]')];
  buttons.forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.subsec').forEach(s=>s.classList.add('hidden'));

  let key=defaultSubtabForProjectType(p.projectType);
  let btn=document.querySelector(`.subtabs button[data-subtab="${key}"]`);
  if(!btn || btn.classList.contains('hidden')) btn=buttons.find(b=>!b.classList.contains('hidden'));
  if(!btn)return;
  btn.classList.add('active');
  const target=document.getElementById('project'+cap(btn.dataset.subtab));
  if(target)target.classList.remove('hidden');

  // 화면 껍데기를 복원한 직후 현재 프로젝트 데이터로 다시 채웁니다.
  if(p.projectType==='ledger'){
    renderLedgerAll();
  }else{
    renderProjectAll();
    if(btn.dataset.subtab==='recent')renderRecent();
    if(p.projectType==='diary')renderDiaryCalendar();
  }
  window.scrollTo(0,0);
}
const __openProjectFix22Isolation=openProject;
openProject=function(id){
  const p=projectById(id);
  // 모션 래퍼가 실제 프로젝트 전환을 약간 늦게 실행하므로 앞/뒤 두 번 안전하게 정리합니다.
  if(p)ensureProjectShellForType(p);
  __openProjectFix22Isolation(id);
  const finish=()=>{const now=projectById(id);if(now&&currentProjectId===id)resetProjectSubtabState(now)};
  setTimeout(finish,210);
  setTimeout(finish,380);
};



// ===== FIX22 pre-test hotfix: 설정 '분류' + 캐릭터 분류 선택 =====
// 설정 문서의 기존 유형 체계를 유지하면서 '분류'를 추가하고,
// 캐릭터에서는 종족/지역과 독립적인 classificationId로 저장합니다.
const __newSettingFix22Classification=newSetting;
newSetting=async function(x){
  const obj=typeof x==='string'?decodeObj(x):(x||{});
  await __newSettingFix22Classification(x);
  const sel=document.getElementById('stype');
  if(sel){
    if(![...sel.options].some(o=>o.value==='분류')){
      const opt=document.createElement('option');opt.value='분류';opt.textContent='분류';sel.appendChild(opt);
    }
    if(obj.type==='분류')sel.value='분류';
    syncAppSelect(sel);
  }
};

function characterClassificationOptions(selected=''){
  const arr=(db.settings||[]).filter(s=>s.project===currentProjectId&&s.type==='분류');
  return `<option value="">분류 미지정</option>`+arr.map(s=>`<option value="${s.id}" ${selected===s.id?'selected':''}>${esc(s.title)}</option>`).join('');
}

const __newCharacterFix22Classification=newCharacter;
newCharacter=async function(x){
  const obj=typeof x==='string'?decodeObj(x):(x||{});
  await __newCharacterFix22Classification(x);
  if(document.getElementById('cclassification'))return;
  const region=document.getElementById('cregion');
  if(region){
    const row=region.closest('.row')||region.parentElement;
    const wrap=document.createElement('div');
    wrap.className='stack';
    wrap.innerHTML=`<div class="meta">분류</div><select id="cclassification">${characterClassificationOptions(obj.classificationId||'')}</select>`;
    row.insertAdjacentElement('afterend',wrap);
    syncAppSelect(document.getElementById('cclassification'));
  }
};

const __saveCharacterFix22Classification=saveCharacter;
saveCharacter=function(id){
  const classificationId=v('cclassification')||'';
  const r=__saveCharacterFix22Classification(id);
  const d=(db.characters||[]).find(x=>x.id===id);
  if(d){d.classificationId=classificationId;persist();renderCharacters()}
  return r;
};

const __viewDocFix22Classification=viewDoc;
viewDoc=async function(kind,id){
  await __viewDocFix22Classification(kind,id);
  if(kind!=='characters')return;
  const x=getDoc('characters',id);if(!x)return;
  const name=getDoc('settings',x.classificationId)?.title||'미지정';
  const basic=[...document.querySelectorAll('#modalCard .detailSection')].find(el=>el.querySelector('.detailLabel')?.textContent.trim()==='기본 정보');
  const chips=basic?.querySelector('.chips');
  if(chips&&!chips.querySelector('[data-character-classification]'))chips.insertAdjacentHTML('beforeend',`<span class="pill" data-character-classification>분류 · ${esc(name)}</span>`);
};

const __pdfMetaTableFix22Classification=pdfMetaTableHtml;
pdfMetaTableHtml=function(kind,x){
  let html=__pdfMetaTableFix22Classification(kind,x);
  if(kind!=='characters'||!html)return html;
  const name=getDoc('settings',x.classificationId)?.title||'미지정';
  return html.replace('</tbody>',`<tr><th>분류</th><td colspan="3">${esc(name)}</td></tr></tbody>`);
};



// ===== FIX23 test feedback fixes =====
APP_FONTS.mono={name:'둥글고 귀여운 · 꾸불림',css:'"Fix23Kkubulim",sans-serif',previewClass:'fontPreview23'};
APP_FONTS.light={name:'손글씨 / 캐주얼 · One Pretty Night',css:'"Fix23PrettyNight",cursive',previewClass:'fontPreview23'};
APP_FONTS.condensed={name:'개성 있는 한글 · 한글누리',css:'"Fix23Nuri",sans-serif',previewClass:'fontPreview23'};
openFontPicker=function(){
  const cur=localStorage.getItem(APP_FONT_KEY)||'system';
  const choices=Object.entries(APP_FONTS).map(([k,f])=>'<button class="fontChoice" onclick="applyAppFont(\''+k+'\');closeModal()"><span class="fontSample '+(f.previewClass||'')+'" style="font-family:'+f.css+'!important">'+esc(f.name)+' · 가나다라마바사 ABC 123</span><span class="fontCheck">'+(cur===k?'✓':'')+'</span></button>').join('');
  openModal('<div class="stack"><h2>글꼴</h2><div class="note">각 항목의 예시 문장이 실제 해당 글꼴로 표시됩니다.</div><div class="fontChoices">'+choices+'</div><div class="right"><button onclick="closeModal()">닫기</button></div></div>');
};
try{document.fonts?.load('16px Fix23Kkubulim');document.fonts?.load('16px Fix23PrettyNight');document.fonts?.load('16px Fix23Nuri')}catch(_){ }

renderSelectedExport=function(){
  const host=document.getElementById('selectExportGroups');if(!host)return;
  const pid=v('exportProject');if(!pid){host.innerHTML='<div class="empty">프로젝트를 선택해 주세요.</div>';return}
  refreshSelectedExportCategory();const category=v('selectExportCategory');
  if(!category){host.innerHTML='<div class="empty">내보낼 항목이 없습니다.</div>';return}
  const label=selectedExportDefs().find(([k])=>k===category)?.[1]||category,arr=(db[category]||[]).filter(x=>x.project===pid);
  if(!arr.length){host.innerHTML='<div class="empty">이 카테고리에 항목이 없습니다.</div>';return}
  const row=x=>`<label class="selectExportRow"><input type="checkbox" name="pdfPick" value="${category}:${x.id}"><span><b>${esc(titleOf(category,x)||'제목 없음')}</b><div class="meta">${esc(x.status||x.episode||x.type||x.fileName||'')}</div></span></label>`;
  let groups=[];
  if(category==='characters'||category==='settings'){
    const map=new Map();for(const x of arr){const g=String(x.group||'').trim()||'미분류';if(!map.has(g))map.set(g,[]);map.get(g).push(x)}groups=[...map.entries()];
  }else if(category==='stories'){
    const folders=(db.storyFolders||[]).filter(f=>f.project===pid),used=new Set();
    for(const f of folders){const items=arr.filter(x=>x.folderId===f.id);if(items.length){groups.push([f.name||'이름 없는 폴더',items]);items.forEach(x=>used.add(x.id))}}
    const rest=arr.filter(x=>!used.has(x.id));if(rest.length)groups.push(['미분류',rest]);
  }else groups=[[label,arr]];
  host.innerHTML=groups.map(([g,items])=>`<details class="selectExportSubgroup23"><summary><span>${esc(g)}</span><span class="meta">${items.length}개</span></summary><div class="selectExportRows">${items.map(row).join('')}</div></details>`).join('');
};

function relationPickerSubgroupName(r){if(r.kind==='소속')return '소속 / 조직';if(r.kind==='인물')return '인물 관계';return String(r.kind||'기타').trim()||'기타'}
function organizeCharacterRelationPicker(){
  const boxes=[...document.querySelectorAll('#modalCard .linkedBox')],box=boxes.find(b=>b.querySelector(':scope > b')?.textContent.trim()==='관계도 / 소속');if(!box)return;
  const rows=[...box.querySelectorAll(':scope > .relationLinkRow')];if(!rows.length)return;
  const map=new Map();for(const row of rows){const id=row.querySelector('input[name="crel"]')?.value,rel=(db.relations||[]).find(r=>r.id===id),sub=relationPickerSubgroupName(rel||{});if(!map.has(sub))map.set(sub,[]);map.get(sub).push(row)}
  const tree=document.createElement('div');tree.className='relationPickerTree';
  for(const [sub,items] of map){const d=document.createElement('details');d.className='relationPickerGroup';if(items.some(r=>r.querySelector('input[name="crel"]')?.checked))d.open=true;const s=document.createElement('summary');s.innerHTML=`<span>${esc(sub)}</span><span class="meta">${items.length}개</span>`;const body=document.createElement('div');body.className='relationPickerRows';items.forEach(r=>body.appendChild(r));d.append(s,body);tree.appendChild(d)}
  box.appendChild(tree);
}
const __newCharacterFix23=newCharacter;
newCharacter=async function(x){await __newCharacterFix23(x);organizeCharacterRelationPicker()};

renderCharacters=async function(){
  let a=listData('characters',['name','alias','role','tags','body','status','group']),groups=groupMap(a),out=[];
  for(const [name,items] of groups){let rows=[];for(const c of items){
    let portrait=c.portraitId?await getFile(c.portraitId):'',race=getDoc('settings',c.raceId)?.title,region=getDoc('settings',c.regionId)?.title,classification=getDoc('settings',c.classificationId)?.title,rels=(c.relationIds||[]).map(id=>{let r=getDoc('relations',id);return r?`${r.title}${c.relationRanks?.[id]?' · '+c.relationRanks[id]:''}`:''}).filter(Boolean);
    rows.push(`<div class="item ${c.favorite?'favorite':''}" onclick="viewDoc('characters','${c.id}')"><div class="characterCardTop ${portrait?'':'characterCardNoImage'}">${portrait?`<img class="characterPortraitBig" src="${portrait}">`:''}<div class="characterSummary"><div class="itemTitleLine"><span class="itemTitle">${esc(c.name)}</span><span class="status">${esc(c.status||'아이디어')}</span></div><div class="meta itemMeta">${esc(c.age||'나이 미정')} · ${esc(c.role||'역할 미정')} · ${fmt(c.updated)}</div>${c.alias?`<div class="meta" style="margin-top:5px">별칭 · ${esc(c.alias)}</div>`:''}</div><div class="characterFav">${favButton('characters',c)}</div></div><div class="itemBody"><div class="chips"><span class="pill">그룹 · ${esc(groupName(c))}</span>${race?`<span class="pill">종족 · ${esc(race)}</span>`:''}${region?`<span class="pill">지역 · ${esc(region)}</span>`:''}${classification?`<span class="pill">분류 · ${esc(classification)}</span>`:''}${isAdvancedProject()&&(c.musicTracks||[]).length?`<span class="pill">🎵 캐릭터송 ${(c.musicTracks||[]).length}곡</span>`:''}</div>${tags(c.tags)}${rels.length?`<div class="meta">관계/소속 · ${rels.map(esc).join(' · ')}</div>`:''}<div class="chips">${linkedChips(c.linkedIds)}</div><div class="snippet">${esc(c.body||'설정 없음')}</div></div></div>`)
  }out.push(`<details class="groupBlock" open><summary><span>${esc(name)}</span><span class="groupCount">${items.length}명</span></summary><div class="groupItems">${rows.join('')}</div></details>`)}
  charactersList.innerHTML=out.length?out.join(''):'<div class="empty">등록된 캐릭터가 없습니다.</div>';
};
const __itemTextFix23=itemText;
itemText=function(kind,x){let text=__itemTextFix23(kind,x);if(kind==='characters'){const name=getDoc('settings',x.classificationId)?.title||'';if(name&&!/\n분류:/.test(text))text=text.replace(/\n지역:([^\n]*)/,m=>m+`\n분류: ${name}`)}return text};


// ===== FIX23 additional UI split: home=backup only / project=export only =====
function updateTopExportBackupMode(){
  const tab=document.querySelector('.tabs button[data-tab="export"]');
  const sec=document.getElementById('export');
  if(!tab||!sec)return;
  const cards=[...sec.children].filter(el=>el.classList?.contains('card'));
  const exportCard=cards.find(el=>el.querySelector('h2')?.textContent.trim()==='내보내기');
  const selectedCard=document.getElementById('selectedExportCard');
  const backupCard=cards.find(el=>el.querySelector('h2')?.textContent.trim()==='백업 / 복원');
  const inProject=!!currentProjectId;
  tab.textContent=inProject?'내보내기':'백업';
  if(exportCard)exportCard.style.display=inProject?'':'none';
  if(selectedCard)selectedCard.style.display=inProject?'':'none';
  if(backupCard)backupCard.style.display=inProject?'none':'';
  const projectSel=document.getElementById('exportProject');
  if(projectSel){
    if(inProject){
      projectSel.value=currentProjectId;
      projectSel.style.display='none';
      projectSel.disabled=false;
      try{refreshSelectedExportCategory();renderSelectedExport()}catch(_){ }
    }else{
      projectSel.style.display='';
    }
  }
}
const __renderExportProjectsFix23Split=renderExportProjects;
renderExportProjects=function(){
  __renderExportProjectsFix23Split();
  if(currentProjectId){
    const sel=document.getElementById('exportProject');
    if(sel)sel.value=currentProjectId;
  }
  updateTopExportBackupMode();
};
const __openProjectFix23Split=openProject;
openProject=function(id){
  __openProjectFix23Split(id);
  updateTopExportBackupMode();
  setTimeout(updateTopExportBackupMode,220);
  setTimeout(updateTopExportBackupMode,400);
};
const __closeProjectFix23Split=closeProject;
closeProject=function(){
  __closeProjectFix23Split();
  updateTopExportBackupMode();
  setTimeout(updateTopExportBackupMode,220);
};
updateTopExportBackupMode();
