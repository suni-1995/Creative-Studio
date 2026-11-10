// Android: fix29SnsProject uses socialThreads and socialPosts, quote={projectId,kind,id}.
(()=>{
"use strict";
const S=window.CreativeStore,M=window.CreativeMedia;
const labels={settings:"설정",characters:"캐릭터",relations:"관계도",sources:"자료",images:"이미지",videos:"영상",creativeWorks:"창작물",longform:"장문",episodes:"연재본"};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const title=x=>x?.name||x?.title||"이름 없는 항목";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const threads=pid=>S.getState().socialThreads.filter(x=>x.project===pid);
const posts=(pid,id)=>S.getState().socialPosts.filter(x=>x.project===pid&&x.threadId===id).sort((a,b)=>(a.created||0)-(b.created||0));
const selected=new Map();
const button=(text,fn)=>{const b=document.createElement("button");b.type="button";b.className="button";b.textContent=text;b.onclick=()=>guard(fn);return b;};
function guard(fn){try{Promise.resolve(fn()).catch(error);}catch(e){error(e);}}
function error(e){const m=document.getElementById("message");m.textContent=e.message||"처리하지 못했습니다.";m.hidden=false;}
function dialog(heading){const d=document.createElement("dialog");d.className="stage4-dialog";const h=document.createElement("h2");h.textContent=heading;d.append(h);document.body.append(d);d.addEventListener("close",()=>d.remove());return d;}
function migrate(pid){
 // Preserve legacy records and IDs. Marker makes migration idempotent even after deletion.
 if(S.getState().pcSocialMigrated?.includes(pid))return;
 S.updateSocial(s=>{
  const oldThreads=s.threads.filter(t=>t.project===pid);
  for(const t of oldThreads)if(!s.socialThreads.some(x=>x.id===t.id))s.socialThreads.push({...t,name:t.title||t.name||"타래"});
  const oldPosts=s.posts.filter(p=>p.project===pid);
  let fallback=s.socialThreads.find(t=>t.project===pid);
  if(!fallback&&(oldPosts.length||oldThreads.length)){fallback={id:uid(),project:pid,name:"기본 타래",created:Date.now(),updated:Date.now()};s.socialThreads.push(fallback);}
  const convert=(x,threadId)=>({...x,text:x.body||"",threadId,threadLinkId:x.threadIds?.[0]||"",quote:null,images:[],pcLegacyTitle:x.title||"",pcLegacyLinks:x.linkedIds||[]});
  for(const t of oldThreads)if((t.body||t.attachments?.length||t.threadIds?.length||t.linkedIds?.length)&&!s.socialPosts.some(x=>x.id===t.id))s.socialPosts.push(convert(t,t.id));
  for(const p of oldPosts)if(!s.socialPosts.some(x=>x.id===p.id))s.socialPosts.push(convert(p,p.threadId&&s.socialThreads.some(t=>t.id===p.threadId&&t.project===pid)?p.threadId:fallback.id));
  s.pcSocialMigrated=[...(s.pcSocialMigrated||[]),pid];
 });
}
function quoteTarget(q){return q&&(S.getState()[q.kind]||[]).find(x=>x.id===q.id&&x.project===q.projectId);}
async function preview(q){
 const x=quoteTarget(q),d=dialog(x?title(x):"인용 원본을 찾을 수 없습니다.");
 if(x){const meta=document.createElement("p");meta.textContent=(S.project(q.projectId)?.name||"프로젝트 없음")+" · "+(labels[q.kind]||q.kind);d.append(meta);
 for(const [key,value] of Object.entries(x)){if(!["body","note","name","title","alias","age","role","tags","status","type","members","episode","desc","summary","fileName","originalTitle","originalNote"].includes(key)||value==null||value==="")continue;const p=document.createElement("p");p.className="stage4-body";p.textContent=({body:"내용",note:"메모",name:"이름",title:"제목",alias:"별칭",age:"나이",role:"역할",tags:"태그",status:"상태",type:"유형",members:"관계 대상",episode:"회차",desc:"설명",summary:"요약",fileName:"파일명",originalTitle:"원작명",originalNote:"원작 메모"}[key]||key)+": "+(typeof value==="object"?JSON.stringify(value):String(value));d.append(p);}
 if(["images","videos","sources"].includes(q.kind)){const data=x.fileData||await M.get(x.id);if(data){const el=document.createElement(q.kind==="images"?"img":q.kind==="videos"?"video":"iframe");el.src=data;el.style.maxWidth="100%";if(q.kind==="videos")el.controls=true;d.append(el);}}
 }d.append(button("닫기",()=>d.close()));d.showModal();
}
function render(host,pid){guard(()=>{
 migrate(pid);
 let tid=selected.get(pid);if(!threads(pid).some(t=>t.id===tid))tid=threads(pid)[0]?.id||"";selected.set(pid,tid);
 host.replaceChildren();const head=document.createElement("h2");head.textContent=S.project(pid).projectType==="sns"?"SNS · 타래":"썰 · 타래";host.append(head);
 const tools=document.createElement("div");tools.className="stage4-toolbar";
 const picker=document.createElement("select");picker.className="field";picker.setAttribute("aria-label","타래 선택");
 for(const t of threads(pid)){const o=new Option(title(t)+" ("+posts(pid,t.id).length+")",t.id);picker.add(o);}picker.value=tid;picker.onchange=()=>{selected.set(pid,picker.value);render(host,pid);};tools.append(picker);
 const rename=t=>{const value=prompt(t?"타래 이름 수정":"새 타래 이름",t?title(t):"");if(!value?.trim())return;const now=Date.now();const data={...(t||{}),id:t?.id||uid(),project:pid,name:value.trim(),created:t?.created||now,updated:now};S.upsertCreative("socialThreads",data);selected.set(pid,data.id);render(host,pid);};
 tools.append(button("+ 새 타래",()=>rename()));const thread=threads(pid).find(t=>t.id===tid);
 if(thread){tools.append(button("타래 이름 수정",()=>rename(thread)),button("타래 삭제",()=>{if(!confirm("이 타래와 안의 기록을 삭제할까요?"))return;S.updateSocial(s=>{s.socialThreads=s.socialThreads.filter(t=>!(t.project===pid&&t.id===tid));s.socialPosts=s.socialPosts.filter(p=>!(p.project===pid&&p.threadId===tid)).map(p=>p.project===pid&&p.threadLinkId===tid?{...p,threadLinkId:""}:p);});render(host,pid);}));}
 host.append(tools);if(!thread)return;
 const search=document.createElement("input");search.className="field";search.placeholder="현재 타래 검색";search.setAttribute("aria-label","현재 타래 검색");host.append(search);
 const feed=document.createElement("div");feed.className="sns-feed";host.append(feed);
 const draw=()=>{feed.replaceChildren();for(const p of posts(pid,tid).filter(p=>(p.text||p.pcLegacyTitle||"").toLowerCase().includes(search.value.toLowerCase()))){
 const card=document.createElement("article");card.className="stage4-item";card.dataset.postId=p.id;
 const body=document.createElement("p");body.className="stage4-body";body.textContent=[p.pcLegacyTitle,p.text].filter(Boolean).join("\n");card.append(body);
 if(p.threadLinkId){const t=threads(pid).find(t=>t.id===p.threadLinkId);card.append(button(t?"↗ 타래 · "+title(t):"연결된 타래 없음",()=>{if(t){selected.set(pid,t.id);render(host,pid);}}));}
 if(p.quote){const target=quoteTarget(p.quote);card.append(button(target?"인용 · "+(S.project(p.quote.projectId)?.name||"")+" · "+title(target):"인용 원본 없음",()=>preview(p.quote)));}
 for(const ref of p.pcLegacyLinks||[]){const i=ref.indexOf(":"),kind=ref.slice(0,i),id=ref.slice(i+1);if(kind==="threads"){const t=threads(pid).find(t=>t.id===id);if(t)card.append(button("↗ "+title(t),()=>{selected.set(pid,id);render(host,pid);}));}else card.append(button("기존 연결 · "+ref,()=>preview({projectId:pid,kind,id})));}
 for(const id of p.images||[]){const img=document.createElement("img");img.alt="기록 첨부 이미지";img.className="sns-image";card.append(img);M.get(id).then(data=>{if(data)img.src=data;}).catch(error);}
 for(const a of p.attachments||[]){const link=document.createElement("a");link.textContent=a.name;link.href=a.data;link.download=a.name;card.append(link);}
 const meta=document.createElement("small");meta.textContent=new Date(p.created).toLocaleString("ko-KR");card.append(meta,button("수정",()=>editPost(host,pid,tid,p)),button("삭제",()=>{if(confirm("기록을 삭제할까요?")){S.removeCreative("socialPosts",p.id,pid);draw();}}));feed.append(card);
 }if(!feed.childElementCount)feed.textContent="기록이 없습니다.";};search.oninput=draw;draw();
 host.append(button("+ 기록 작성",()=>editPost(host,pid,tid)));
 });}
function editPost(host,pid,tid,old={}){
 const d=dialog(old.id?"기록 수정":"기록 작성"),form=document.createElement("form");form.className="stage4-form";
 const refs=[];for(const [kind,name] of Object.entries(labels))for(const x of S.getState()[kind]||[]){if(!S.project(x.project))continue;refs.push({q:{projectId:x.project,kind,id:x.id},name:S.project(x.project).name+" · "+name+" · "+title(x)});}
 const quoteIndex=refs.findIndex(r=>JSON.stringify(r.q)===JSON.stringify(old.quote));
 form.innerHTML='<label>내용<textarea name="text" class="field" rows="8">'+esc(old.text||"")+'</textarea></label><label>다른 타래 인용<select name="thread" class="field"><option value="">없음</option>'+threads(pid).filter(t=>t.id!==tid).map(t=>'<option value="'+esc(t.id)+'">'+esc(title(t))+'</option>').join('')+'</select></label><label>프로젝트 항목 인용<select name="quote" class="field"><option value="">없음</option>'+refs.map((r,i)=>'<option value="'+i+'">'+esc(r.name)+'</option>').join('')+'</select></label><label>이미지 첨부<input name="images" type="file" accept="image/*" multiple></label><p>기존 이미지 '+(old.images||[]).length+'개 · 새 이미지는 개별 2MB 이하</p><button class="button primary" type="submit">저장</button>';
 form.elements.thread.value=old.threadLinkId||"";form.elements.quote.value=quoteIndex<0?"":String(quoteIndex);
 if(old.quote&&quoteIndex<0){form.elements.quote.add(new Option("원본 없음 (기존 인용 유지)","missing"));form.elements.quote.value="missing";}
 form.append(button("취소",()=>d.close()));d.append(form);d.showModal();
 form.onsubmit=e=>{e.preventDefault();guard(async()=>{
 const text=form.elements.text.value.trim(),threadLinkId=form.elements.thread.value,qv=form.elements.quote.value,quote=qv==="missing"?old.quote:qv===""?null:refs[Number(qv)].q;
 const files=[...form.elements.images.files],images=[...(old.images||[])],added=[];if(files.some(f=>!f.type.startsWith("image/")||f.size>2*1024*1024))throw Error("이미지는 개별 2MB 이하만 가능합니다.");
 if(!text&&!threadLinkId&&!quote&&!files.length&&!images.length&&!old.attachments?.length)throw Error("내용이나 인용, 이미지를 입력하세요.");
 if(!threads(pid).some(t=>t.id===tid))throw Error("타래를 찾을 수 없습니다.");
 try{for(const f of files){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const id=uid();await M.put(id,data);images.push(id);added.push(id);}
 const now=Date.now(),post={...old,id:old.id||uid(),project:pid,threadId:tid,text,quote,threadLinkId,images,liked:old.liked||false,created:old.created||now,updated:now};
 S.updateSocial(s=>{const i=s.socialPosts.findIndex(p=>p.id===post.id);if(i<0)s.socialPosts.push(post);else s.socialPosts[i]=post;const t=s.socialThreads.find(t=>t.id===tid&&t.project===pid);t.updated=now;});
 }catch(e){await Promise.allSettled(added.map(id=>M.remove(id)));throw e;}
 d.close();render(host,pid);
 });};
}
window.CreativeSNS={render};
})();
