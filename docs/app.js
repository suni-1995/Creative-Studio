(()=>{
"use strict";
const S=window.CreativeStore, $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const typeName=t=>S.TYPES.find(x=>x[0]===t)?.[1]||t;
const folderName=id=>S.folder(id)?.name||"폴더 없음";
const date=x=>new Date(x||Date.now()).toLocaleDateString("ko-KR");
let activeFolder="",openedId="",screen="projects",editor={mode:"",id:""},imageDraft;
const LAST_OPEN_KEY="creative-studio-pc-last-open-project";
let toastTimer;
function notice(t){const m=$("message");m.textContent=t;m.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>m.hidden=true,3500);}
function attempt(fn){try{fn();}catch(e){notice(e.message||"저장에 실패했습니다.");}}
function view(name){
 if(!["projects","detail","more"].includes(name))return;
 screen=name;
 document.querySelectorAll("[data-panel]").forEach(x=>x.hidden=x.dataset.panel!==name);
 document.querySelectorAll("[data-view]").forEach(x=>{const on=x.dataset.view===(name==="detail"?"projects":name);x.classList.toggle("active",on);if(on)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});
}
function renderFolders(){
 const {projectFolders,projects}=S.getState(),host=$("folderList");
 host.replaceChildren();
 if(!projectFolders.length){host.innerHTML='<div class="empty-box"><strong>아직 폴더가 없습니다.</strong><p>폴더 추가 버튼으로 정리할 수 있습니다.</p></div>';return;}
 projectFolders.forEach(f=>{
  const card=document.createElement("article");card.className="folder-card"+(activeFolder===f.id?" selected":"");
  const main=document.createElement("button");main.type="button";main.className="folder-open";
  const color=/^#[0-9a-f]{6}$/i.test(f.color)?f.color:"#6f6a7d";
  main.innerHTML='<span class="folder-dot" style="background:'+color+'"></span><span class="folder-text"><strong>'+esc(f.name)+'</strong><small>프로젝트 '+projects.filter(p=>p.projectFolderId===f.id).length+'개</small></span>';
  main.onclick=()=>{activeFolder=activeFolder===f.id?"":f.id;render();};
  const edit=document.createElement("button");edit.type="button";edit.className="small-button";edit.textContent="관리";edit.onclick=()=>folderEditor(f.id);
  card.append(main,edit);host.append(card);
 });
}
function renderProjects(){
 const state=S.getState(),sort=$("projectSort").value,q=$("projectSearch").value.trim().toLocaleLowerCase();
 const list=state.projects.filter(p=>(!activeFolder||p.projectFolderId===activeFolder)&&((p.name+" "+(p.desc||"")).toLocaleLowerCase().includes(q)));
 list.sort((a,b)=>sort==="name"?a.name.localeCompare(b.name,"ko"):sort==="created"?(b.created||0)-(a.created||0):sort==="oldest"?(a.created||0)-(b.created||0):(b.updated||b.created||0)-(a.updated||a.created||0));
 $("listTitle").textContent=activeFolder?folderName(activeFolder):"프로젝트 목록";
 $("projectCount").textContent=list.length+"개";
 const host=$("projectList");host.replaceChildren();
 if(!list.length){host.innerHTML='<div class="empty-box"><strong>'+(q?"검색 결과가 없습니다.":"아직 프로젝트가 없습니다.")+'</strong><p>'+(q?"다른 검색어를 입력해 주세요.":"새 프로젝트 버튼으로 시작해 보세요.")+'</p></div>';return;}
 list.forEach(p=>{
  const card=document.createElement("article");card.className="project-card";
  const cover=document.createElement("button");cover.type="button";cover.className="project-cover";cover.setAttribute("aria-label",p.name+" 열기");
  if(p.pcCoverData){const img=document.createElement("img");img.src=p.pcCoverData;img.alt="";cover.append(img);}
  else{cover.classList.add("placeholder-cover");cover.style.setProperty("--cover-color",/^#[0-9a-f]{6}$/i.test(p.color)?p.color:"#7b61a8");cover.textContent="✦";}
  cover.onclick=()=>openProject(p.id);
  const body=document.createElement("div");body.className="project-card-body";
  body.innerHTML='<div class="project-card-top"><span class="tag">'+esc(typeName(p.projectType))+'</span><span class="card-date">'+date(p.updated||p.created)+'</span></div><h3>'+esc(p.name)+'</h3><div class="project-description">'+esc(p.desc||"설명 없음")+'</div><p class="project-folder-text">▤ '+esc(folderName(p.projectFolderId))+'</p>';
  const actions=document.createElement("div");actions.className="card-actions";
  [["열기",()=>openProject(p.id)],["수정",()=>projectEditor(p.id)],["이동",()=>moveEditor(p.id)],["삭제",()=>deleteProject(p.id)]].forEach(([label,action])=>{
   const b=document.createElement("button");b.type="button";b.className="small-button"+(label==="삭제"?" danger-text":"");b.textContent=label;b.onclick=action;actions.append(b);
  });
  body.append(actions);card.append(cover,body);host.append(card);
 });
}
function renderDetail(){
 const p=S.project(openedId);
 if(!p){openedId="";view("projects");return;}
 $("detailName").textContent=p.name;$("detailType").textContent=typeName(p.projectType);
 $("detailDesc").textContent=p.desc||"설명 없음";$("detailFolder").textContent="폴더: "+folderName(p.projectFolderId);
 const host=$("detailCover");host.replaceChildren();host.style.background="";
 if(p.pcCoverData){const img=document.createElement("img");img.src=p.pcCoverData;img.alt="프로젝트 대표 이미지";host.append(img);}
 else{host.textContent="✦";host.style.background=/^#[0-9a-f]{6}$/i.test(p.color)?p.color:"#7b61a8";}
}
function render(){renderFolders();renderProjects();if(screen==="detail"){renderDetail();window.CreativeStage3?.render();}}
function openProject(id){if(!S.project(id))return;openedId=id;try{sessionStorage.setItem(LAST_OPEN_KEY,id);}catch(e){console.warn(e);}view("detail");renderDetail();window.CreativeStage3?.openProject(id);}
function showDialog(){const d=$("editorDialog");if(d.showModal)d.showModal();else d.setAttribute("open","");}
function closeDialog(){const d=$("editorDialog");if(d.close)d.close();else d.removeAttribute("open");editor={mode:"",id:""};imageDraft=undefined;}
function folderSelect(id){
 return '<label class="form-label">프로젝트 폴더<select class="field" name="projectFolderId"><option value="">폴더 없음</option>'+S.getState().projectFolders.map(f=>'<option value="'+esc(f.id)+'"'+(f.id===id?' selected':'')+'>'+esc(f.name)+'</option>').join("")+'</select></label>';
}
function projectEditor(id=""){
 const p=id?S.project(id):null;if(id&&!p)return;
 editor={mode:p?"editProject":"createProject",id};imageDraft=undefined;
 $("editorTitle").textContent=p?"프로젝트 수정":"새 프로젝트";
 const typeField=p?'<label class="form-label">프로젝트 유형<input class="field" disabled value="'+esc(typeName(p.projectType))+'"><small class="help-text">기존 프로젝트의 유형은 유지됩니다.</small></label>':'<label class="form-label">프로젝트 유형<select class="field" name="projectType">'+S.TYPES.map(t=>'<option value="'+t[0]+'">'+t[1]+'</option>').join("")+'</select></label>';
 $("editorFields").innerHTML='<div class="form-stack"><label class="form-label">프로젝트 이름<input class="field" required maxlength="120" name="name" value="'+esc(p?.name||"")+'" placeholder="프로젝트 이름"></label>'+typeField+'<label class="form-label">설명<textarea class="field" name="desc" maxlength="5000" placeholder="설명">'+esc(p?.desc||"")+'</textarea></label>'+folderSelect(p?.projectFolderId||"")+'<div class="form-label">대표 이미지<div class="cover-editor"><div class="cover-preview" id="coverPreview"></div><div class="cover-buttons"><label class="button" for="coverFile">이미지 선택</label><input id="coverFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none"><button class="button" id="removeCover" type="button">이미지 제거</button><small class="help-text">3MB 이하 PNG/JPG/WebP/GIF</small></div></div></div></div>';
 const preview=x=>{const host=$("coverPreview");host.replaceChildren();if(x){const img=document.createElement("img");img.src=x;img.alt="미리보기";host.append(img);}else host.textContent="이미지 없음";};
 preview(p?.pcCoverData||"");
 $("removeCover").onclick=()=>{imageDraft="";preview("");};
 $("coverFile").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)){notice("이미지 파일을 선택해 주세요.");return;}
  if(file.size>3*1024*1024){notice("3MB 이하 이미지만 사용할 수 있습니다.");return;}
  try{
   const data=await compressCover(file);
   if(editor.mode!=="createProject"&&editor.mode!=="editProject")return;
   imageDraft=data;preview(data);
  }catch(err){notice("이미지를 처리하지 못했습니다.");console.error(err);}
 };
 showDialog();$("editorForm").elements.namedItem("name").focus();
}
function compressCover(file){
 return new Promise((resolve,reject)=>{
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{
   try{
    const scale=Math.min(1,960/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    resolve(canvas.toDataURL("image/jpeg",0.78));
   }catch(e){reject(e);}finally{URL.revokeObjectURL(url);}
  };img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("이미지 읽기 실패"));};img.src=url;
 });
}
function folderEditor(id=""){
 const f=id?S.folder(id):null;if(id&&!f)return;
 editor={mode:f?"editFolder":"createFolder",id};imageDraft=undefined;
 $("editorTitle").textContent=f?"폴더 관리":"폴더 추가";
 $("editorFields").innerHTML='<div class="form-stack"><label class="form-label">폴더 이름<input class="field" required maxlength="120" name="folderName" value="'+esc(f?.name||"")+'"></label><label class="form-label">폴더 색상<input type="color" name="folderColor" value="'+esc(f?.color||"#6f6a7d")+'"></label>'+(f?'<button type="button" class="button danger-action" id="deleteFolder">폴더 삭제 (프로젝트 유지)</button>':'')+'</div>';
 if(f)$("deleteFolder").onclick=()=>{if(!confirm("'"+f.name+"' 폴더를 삭제할까요? 프로젝트는 삭제되지 않습니다."))return;attempt(()=>{S.deleteFolder(id);if(activeFolder===id)activeFolder="";closeDialog();render();notice("폴더를 삭제했습니다.");});};
 showDialog();$("editorForm").elements.namedItem("folderName").focus();
}
function moveEditor(id){
 const p=S.project(id);if(!p)return;
 editor={mode:"moveProject",id};$("editorTitle").textContent="프로젝트 이동";
 $("editorFields").innerHTML='<div class="form-stack"><p><strong>'+esc(p.name)+'</strong></p>'+folderSelect(p.projectFolderId||"")+'</div>';showDialog();
}
function deleteProject(id){
 const p=S.project(id);if(!p||!confirm("'"+p.name+"' 프로젝트를 삭제할까요? 복구할 수 없습니다."))return;
 attempt(()=>{const state=S.getState();const ids=["images","videos","sources"].flatMap(k=>(state[k]||[]).filter(x=>x.project===id).map(x=>x.id));const musicIds=["characters","settings"].flatMap(k=>(state[k]||[]).filter(x=>x.project===id).flatMap(x=>(x.musicTracks||[]).map(m=>m.id).filter(Boolean)));S.deleteProject(id);for(const key of [...ids,...musicIds])window.CreativeMedia?.remove(key).catch(console.error);if(openedId===id){openedId="";try{sessionStorage.removeItem(LAST_OPEN_KEY);}catch(e){console.warn(e);}view("projects");}render();notice("프로젝트를 삭제했습니다.");});
}
$("editorForm").addEventListener("submit",e=>{
 e.preventDefault();
 const d=new FormData(e.currentTarget),get=k=>String(d.get(k)||"");
 attempt(()=>{
  if(editor.mode==="createProject")S.createProject({name:get("name"),desc:get("desc"),projectType:get("projectType"),projectFolderId:get("projectFolderId"),coverData:imageDraft||""});
  else if(editor.mode==="editProject"){const x={name:get("name"),desc:get("desc"),projectFolderId:get("projectFolderId")};if(imageDraft!==undefined)x.coverData=imageDraft;S.updateProject(editor.id,x);}
  else if(editor.mode==="moveProject")S.updateProject(editor.id,{projectFolderId:get("projectFolderId")});
  else if(editor.mode==="createFolder")S.createFolder(get("folderName"),get("folderColor"));
  else if(editor.mode==="editFolder")S.updateFolder(editor.id,get("folderName"),get("folderColor"));
  else return;
  closeDialog();render();notice("저장했습니다.");
 });
});
$("closeEditor").onclick=closeDialog;$("cancelEditor").onclick=closeDialog;
$("editorDialog").addEventListener("close",()=>{editor={mode:"",id:""};imageDraft=undefined;});
$("editorDialog").addEventListener("click",e=>{if(e.target===$("editorDialog"))closeDialog();});
$("newProject").onclick=()=>projectEditor();$("newFolder").onclick=()=>folderEditor();$("allFolders").onclick=()=>{activeFolder="";render();};
$("projectSearch").oninput=renderProjects;$("projectSort").onchange=renderProjects;
$("backToProjects").onclick=()=>{try{sessionStorage.removeItem(LAST_OPEN_KEY);}catch(e){console.warn(e);}view("projects");render();};
$("editOpenProject").onclick=()=>projectEditor(openedId);$("moveOpenProject").onclick=()=>moveEditor(openedId);
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{if(b.dataset.view==="projects"){try{sessionStorage.removeItem(LAST_OPEN_KEY);}catch(e){console.warn(e);}}view(b.dataset.view);if(b.dataset.view==="projects")render();});
$("importBackup").onclick=()=>notice("백업 가져오기 기능은 6차에서 구현됩니다.");
$("exportBackup").onclick=()=>notice("백업 내보내기 기능은 6차에서 구현됩니다.");
view("projects");render();
try{const saved=sessionStorage.getItem(LAST_OPEN_KEY);if(saved&&S.project(saved)){window.addEventListener("DOMContentLoaded",()=>openProject(saved),{once:true});}else if(saved)sessionStorage.removeItem(LAST_OPEN_KEY);}catch(e){console.warn("프로젝트 화면 복원 실패",e);}
if(S.getLoadError())notice("기존 저장 데이터를 읽지 못했습니다. 기존 데이터는 덮어쓰지 않았습니다.");
})();