/* PC project records use the Android field names (projectType, coverImageId, projectFolderId).
   Cover pixels remain PC-local for now; 6th stage will handle Android ZIP media mapping. */
(()=>{
"use strict";
const KEY="creative-studio-pc-v1";
const TYPES=[["advanced","고급 프로젝트"],["general","일반 프로젝트"],["short","단편 프로젝트"],["fanwork","2차창작 프로젝트"],["memo","메모 프로젝트"],["sns","SNS 프로젝트"],["ledger","가계부 프로젝트"],["diary","일기장 프로젝트"]];
const CREATIVE_KINDS=["characters","settings","relations","images","videos","sources","creativeWorks"];const empty=()=>({schemaVersion:3,projects:[],projectFolders:[],...Object.fromEntries(CREATIVE_KINDS.map(k=>[k,[]]))});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let db=empty(),loadError=null;
try{
 const raw=localStorage.getItem(KEY);
 if(raw){
  const prev=JSON.parse(raw);
  if(!prev||!Array.isArray(prev.projects))throw Error("기존 데이터 구조를 읽을 수 없습니다.");
  db={...empty(),...prev,schemaVersion:3,projects:prev.projects,projectFolders:Array.isArray(prev.projectFolders)?prev.projectFolders:Array.isArray(prev.folders)?prev.folders:[]};for(const kind of CREATIVE_KINDS)if(!Array.isArray(db[kind]))db[kind]=[];
 }else localStorage.setItem(KEY,JSON.stringify(db));
}catch(err){loadError=err;console.error(err);}
function mutate(fn){
 const next={...db,projects:db.projects.map(p=>({...p})),projectFolders:db.projectFolders.map(f=>({...f})),...Object.fromEntries(CREATIVE_KINDS.map(k=>[k,db[k].slice()]))};
 fn(next);
 try{localStorage.setItem(KEY,JSON.stringify(next));}
 catch(err){throw Error("브라우저 저장 공간에 저장하지 못했습니다. 이미지 용량과 브라우저 설정을 확인해 주세요.");}
 db=next;
}
function project(id){return db.projects.find(p=>p.id===id);}
function folder(id){return db.projectFolders.find(f=>f.id===id);}
function createProject(x){
 if(!TYPES.some(t=>t[0]===x.projectType))throw Error("프로젝트 유형을 선택해 주세요.");
 if(!(x.name||"").trim())throw Error("프로젝트 이름을 입력해 주세요.");
 const now=Date.now(),p={id:uid(),name:x.name.trim(),desc:x.desc||"",color:"#7b61a8",projectType:x.projectType,projectTypeVersion:x.projectType==="sns"?7:x.projectType==="fanwork"?6:2,projectFolderId:x.projectFolderId||"",coverImageId:"",created:now,updated:now};
 if(x.coverData)p.pcCoverData=x.coverData;
 mutate(s=>s.projects.push(p));return p;
}
function updateProject(id,x){
 mutate(s=>{
  const p=s.projects.find(p=>p.id===id);if(!p)throw Error("프로젝트가 없습니다.");
  if(x.name!==undefined){if(!x.name.trim())throw Error("프로젝트 이름을 입력해 주세요.");p.name=x.name.trim();}
  if(x.desc!==undefined)p.desc=x.desc;
  if(x.projectFolderId!==undefined)p.projectFolderId=x.projectFolderId;
  if(x.coverData!==undefined){if(x.coverData)p.pcCoverData=x.coverData;else delete p.pcCoverData;}for(const k of ["originalTitle","originalKind","originalNote"])if(x[k]!==undefined)p[k]=x[k];
  p.updated=Date.now();
 });
}
function deleteProject(id){mutate(s=>{s.projects=s.projects.filter(p=>p.id!==id);for(const kind of CREATIVE_KINDS)s[kind]=s[kind].filter(x=>x.project!==id);});}
function createFolder(name,color){
 if(!name.trim())throw Error("폴더 이름을 입력해 주세요.");
 mutate(s=>s.projectFolders.push({id:uid(),name:name.trim(),color:color||"#6f6a7d"}));
}
function updateFolder(id,name,color){
 if(!name.trim())throw Error("폴더 이름을 입력해 주세요.");
 mutate(s=>{const f=s.projectFolders.find(f=>f.id===id);if(!f)throw Error("폴더가 없습니다.");f.name=name.trim();f.color=color||"#6f6a7d";});
}
function deleteFolder(id){
 mutate(s=>{s.projectFolders=s.projectFolders.filter(f=>f.id!==id);s.projects.forEach(p=>{if(p.projectFolderId===id){p.projectFolderId="";p.updated=Date.now();}});});
}
function upsertCreative(kind,data){if(!CREATIVE_KINDS.includes(kind))throw Error("지원하지 않는 자료입니다.");mutate(s=>{const at=s[kind].findIndex(x=>x.id===data.id);if(at<0)s[kind].push(data);else s[kind][at]=data;});}
function removeCreative(kind,id,projectId){if(!CREATIVE_KINDS.includes(kind))throw Error("지원하지 않는 자료입니다.");mutate(s=>{s[kind]=s[kind].filter(x=>!(x.id===id&&x.project===projectId));if(kind==="relations"){for(const c of s.characters){c.relationIds=(c.relationIds||[]).filter(k=>k!==id);if(c.relationRanks)delete c.relationRanks[id];if(c.relationNotes)delete c.relationNotes[id];}}if(kind==="settings")for(const c of s.characters){if(c.raceId===id)c.raceId="";if(c.regionId===id)c.regionId="";}if(kind==="images"){for(const c of s.characters)if(c.portraitId===id)c.portraitId="";for(const w of s.creativeWorks)w.imageIds=(w.imageIds||[]).filter(x=>x!==id);}for(const other of ["characters","settings","relations"])for(const x of s[other])x.linkedIds=(x.linkedIds||[]).filter(ref=>ref!==kind+":"+id);});}
window.CreativeStore={KEY,TYPES,getState:()=>db,project,folder,createProject,updateProject,deleteProject,createFolder,updateFolder,deleteFolder,upsertCreative,removeCreative,getLoadError:()=>loadError};
})();