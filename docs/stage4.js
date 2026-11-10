(()=>{
"use strict";
const S=window.CreativeStore,root=document.getElementById("stage4Workspace");
const K={posts:"SNS 게시글",threads:"썰",longform:"장문",episodes:"연재본",timelines:"타임라인"};
let project="",kind="posts",query="",sort="latest",folder="",category="",current="";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const rows=k=>(S.getState()[k]||[]).filter(x=>x.project===project);
const item=(k,id)=>rows(k).find(x=>x.id===id);
const label=x=>x.title||x.name||"제목 없음";
const types=["characters","settings","relations","sources","images","videos","creativeWorks"];
const names={characters:"캐릭터",settings:"설정",relations:"관계도",sources:"자료",images:"이미지",videos:"영상",creativeWorks:"창작물",...K};
const notice=t=>{const m=document.getElementById("message");m.textContent=t;m.hidden=false;setTimeout(()=>m.hidden=true,3000);};
const button=(text,fn,cls="button")=>{let b=document.createElement("button");b.type="button";b.className=cls;b.textContent=text;b.onclick=fn;return b;};
function save(k,data){S.upsertCreative(k,data);}
function remove(k,x){if(!confirm("삭제할까요?"))return;S.removeCreative(k,x.id,project);if(current===x.id)current="";render();}
function options(k,selected=""){return rows(k).map(x=>'<option value="'+esc(x.id)+'" '+(selected===x.id?"selected":"")+'>'+esc(label(x))+'</option>').join("");}
function openProject(id){project=id;kind="longform";query="";folder="";category="";current="";render();}
function available(){return !!project&&!!S.project(project);}
function render(){
 if(!available()||!["sns","advanced","general","short","fanwork"].includes(S.project(project).projectType)){root.hidden=true;return;}root.hidden=false;
 const p=S.project(project),isSNS=p.projectType==="sns";
 if(isSNS){window.CreativeSNS.render(root,project);return;}
 const kinds=[...(["advanced","general","short"].includes(p.projectType)?["threads"]:[]),"longform","episodes",...(p.projectType!=="short"?["timelines"]:[])];
 if(!kinds.includes(kind))kind=kinds[0];
 root.innerHTML='<div class="stage4-head"><h2>글쓰기</h2><nav class="stage4-tabs">'+kinds.map(k=>'<button class="button '+(k===kind?"primary":"")+'" data-kind="'+k+'">'+K[k]+'</button>').join("")+'</nav></div><div class="stage4-toolbar"><input id="s4Search" class="field" placeholder="검색" value="'+esc(query)+'"><select id="s4Sort" class="field"><option value="latest">최근 수정순</option><option value="created">최근 생성순</option><option value="name">제목순</option><option value="order">연재 순서</option></select><select id="s4Folder" class="field"><option value="">전체 폴더</option>'+rows("stage4Folders").filter(x=>x.kind===kind).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join("")+'</select>'+(kind==="timelines"?'<select id="s4Category" class="field"><option value="">전체 분류</option>'+rows("timelineCategories").map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join("")+'</select>':"")+'</div><div class="stage4-actions"></div><div class="stage4-list"></div><div class="stage4-detail"></div>';
 root.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{kind=b.dataset.kind;current="";query="";folder="";category="";render();});
 if(kind==="threads"){const host=document.createElement("div");root.querySelectorAll(".stage4-toolbar,.stage4-actions,.stage4-list,.stage4-detail").forEach(e=>e.remove());root.append(host);window.CreativeSNS.render(host,project);return;}
 const q=root.querySelector("#s4Search");q.oninput=()=>{query=q.value;renderList();};
 const st=root.querySelector("#s4Sort");st.value=sort;st.onchange=()=>{sort=st.value;renderList();};
 const f=root.querySelector("#s4Folder");f.value=folder;f.onchange=()=>{folder=f.value;renderList();};
 const cat=root.querySelector("#s4Category");if(cat){cat.value=category;cat.onchange=()=>{category=cat.value;renderList();};}
 const actions=root.querySelector(".stage4-actions");actions.append(button("+ "+K[kind]+" 작성",()=>edit(kind)));
 actions.append(button("폴더 관리",()=>manage("stage4Folders",kind)));
 if(kind==="timelines")actions.append(button("분류 관리",()=>manage("timelineCategories","timelines")));
 renderList();
}
function renderList(){
 const host=root.querySelector(".stage4-list");if(!host)return;host.replaceChildren();
 let data=rows(kind).filter(x=>(!folder||x.folderId===folder)&&(!category||x.categoryId===category)&&(!query||(label(x)+" "+(x.body||"")).toLowerCase().includes(query.toLowerCase())));
 data.sort((a,b)=>sort==="name"?label(a).localeCompare(label(b),"ko"):sort==="created"?(b.created||0)-(a.created||0):sort==="order"?(Number(a.order)||0)-(Number(b.order)||0):(b.updated||0)-(a.updated||0));
 if(!data.length)host.innerHTML='<p class="muted">등록된 항목이 없습니다.</p>';
 data.forEach(x=>{let el=document.createElement("article");el.className="stage4-item";let heading=button(label(x),()=>{current=x.id;showDetail();},"stage4-item-title");let meta=document.createElement("small");meta.textContent=[x.order?"순서 "+x.order:"",new Date(x.updated||x.created||Date.now()).toLocaleDateString("ko-KR")].filter(Boolean).join(" · ");let snippet=document.createElement("p");snippet.textContent=(x.body||"").slice(0,150);el.append(heading,meta,snippet,button("수정",()=>edit(kind,x)),button("삭제",()=>remove(kind,x)));host.append(el);});
 showDetail();
}
function manage(k,scope){
 const data=rows(k).filter(x=>k==="timelineCategories"||x.kind===scope);
 const value=prompt((k==="stage4Folders"?"폴더":"분류")+" 이름 입력\n기존 항목: "+data.map(x=>x.title).join(", "));
 if(value===null)return;if(!value.trim())return notice("이름을 입력하세요.");
 const match=data.find(x=>x.title===value.trim());if(match)return notice("이미 존재합니다.");
 save(k,{id:uid(),project,title:value.trim(),kind:scope,created:Date.now(),updated:Date.now()});render();
}
function edit(k,old){
 const dialog=document.createElement("dialog");dialog.className="stage4-dialog";document.body.append(dialog);
 const x=old||{},isThread=k==="threads",isTimeline=k==="timelines";
 const linked=(x.linkedIds||[]),folderRows=rows("stage4Folders").filter(f=>f.kind===k);
 const linkTargets=[...types,...Object.keys(K)].filter(t=>t!==k).flatMap(t=>rows(t).map(d=>({ref:t+":"+d.id,title:(names[t]||t)+" · "+label(d)})));
 dialog.innerHTML='<form method="dialog" class="stage4-form"><h2>'+esc(old?"수정":"작성")+" · "+K[k]+'</h2><label>제목<input class="field" name="title" required maxlength="200" value="'+esc(x.title||"")+'"></label><label>내용<textarea class="field" name="body" rows="12">'+esc(x.body||"")+'</textarea></label><label>태그<input class="field" name="tags" value="'+esc(x.tags||"")+'"></label><label>폴더<select class="field" name="folderId"><option value="">없음</option>'+folderRows.map(d=>'<option value="'+esc(d.id)+'" '+(x.folderId===d.id?"selected":"")+'>'+esc(d.title)+'</option>').join("")+'</select></label>'+(k==="episodes"?'<label>소속 장문<select class="field" name="parentId"><option value="">선택 안 함</option>'+options("longform",x.parentId)+'</select></label><label>연재 순서<input class="field" name="order" type="number" min="0" value="'+esc(x.order||0)+'"></label>':"")+(isTimeline?'<label>분류<select class="field" name="categoryId"><option value="">미분류</option>'+options("timelineCategories",x.categoryId)+'</select></label><label>시점<input class="field" name="time" value="'+esc(x.time||"")+'"></label>':"")+(isThread?'<label>연결 타래 (복수 선택)<select class="field" name="threadIds" multiple size="5">'+rows("threads").filter(d=>d.id!==x.id).map(d=>'<option value="'+esc(d.id)+'" '+((x.threadIds||[]).includes(d.id)?"selected":"")+'>'+esc(d.title)+'</option>').join("")+'</select></label>':"")+'<label>내부 연결 (복수 선택)<select class="field" name="linkedIds" multiple size="7">'+linkTargets.map(d=>'<option value="'+esc(d.ref)+'" '+(linked.includes(d.ref)?"selected":"")+'>'+esc(d.title)+'</option>').join("")+'</select></label><label>첨부 파일<input type="file" name="attachment" multiple accept="image/*,video/*,application/pdf"></label><p class="muted">첨부는 브라우저 저장공간에 저장됩니다. 큰 파일은 저장 용량 제한이 있을 수 있습니다.</p><div class="stage4-dialog-actions"><button type="button" class="button" id="s4Cancel">취소</button><button type="submit" class="button primary">저장</button></div></form>';
 dialog.querySelector("#s4Cancel").onclick=()=>dialog.close();
 dialog.addEventListener("close",()=>dialog.remove());
 dialog.querySelector("form").onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget,fd=new FormData(form);
 const selected=n=>Array.from(form.elements.namedItem(n)?.selectedOptions||[]).map(o=>o.value);
 let attachments=(x.attachments||[]).slice();const files=Array.from(form.elements.namedItem("attachment").files||[]);
 try{
 for(const file of files){if(file.size>2*1024*1024)throw Error("첨부 파일은 개별 2MB 이하만 가능합니다.");const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});attachments.push({id:uid(),name:file.name,type:file.type,data:content});}
 const now=Date.now();const data={...x,id:x.id||uid(),project,title:String(fd.get("title")||"").trim(),body:String(fd.get("body")||""),tags:String(fd.get("tags")||""),folderId:String(fd.get("folderId")||""),linkedIds:selected("linkedIds"),attachments,created:x.created||now,updated:now};
 if(!data.title)throw Error("제목을 입력하세요.");
 if(isThread)data.threadIds=selected("threadIds");
 if(isTimeline){data.categoryId=String(fd.get("categoryId")||"");data.time=String(fd.get("time")||"");}
 if(k==="episodes"){data.parentId=String(fd.get("parentId")||"");data.order=Number(fd.get("order")||0);}
 save(k,data);dialog.close();current=data.id;renderList();notice("저장했습니다.");
 }catch(err){notice(err.message||"저장 실패");}
 };
 dialog.showModal();
}
function showDetail(){
 const host=root.querySelector(".stage4-detail");host.replaceChildren();const x=item(kind,current);if(!x)return;
 let title=document.createElement("h3");title.textContent=label(x);let body=document.createElement("p");body.className="stage4-body";body.textContent=x.body||"";host.append(title,body);
 if(x.time){let t=document.createElement("p");t.textContent="시점: "+x.time;host.append(t);}
 const addLinks=(refs,heading)=>{if(!refs?.length)return;let h=document.createElement("h4");h.textContent=heading;host.append(h);refs.forEach(ref=>{const i=ref.indexOf(":");const k=ref.slice(0,i),id=ref.slice(i+1),target=item(k,id);if(!target)return;host.append(button((names[k]||k)+" · "+label(target),()=>{if(K[k]){kind=k;current=id;render();}else{window.CreativeStage3?.openProject(project);const tab=document.querySelector('[data-kind="'+k+'"]');if(tab)tab.click();notice("연결 문서: "+label(target));}}));});};
 addLinks((x.threadIds||[]).map(id=>"threads:"+id),"연결된 타래");
 addLinks(x.linkedIds,"연결된 문서");
 if(kind==="longform"){const episodes=rows("episodes").filter(e=>e.parentId===x.id).sort((a,b)=>(a.order||0)-(b.order||0));let h=document.createElement("h4");h.textContent="연재본";host.append(h);episodes.forEach(ep=>host.append(button((ep.order||0)+" · "+label(ep),()=>{kind="episodes";current=ep.id;render();})));}
 if(x.attachments?.length){let h=document.createElement("h4");h.textContent="첨부 파일";host.append(h);x.attachments.forEach(f=>{let a=document.createElement("a");a.href=f.data;a.download=f.name;a.textContent=f.name;a.className="button";host.append(a);});}
}
window.CreativeStage4={openProject,render};
})();