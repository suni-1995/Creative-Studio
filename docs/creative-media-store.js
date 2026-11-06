/* Keep large attachments out of localStorage. Records retain their Android-style IDs. */
(()=>{
"use strict";
const DB="creative-studio-pc-media-v1",TABLE="media";
let pending;
function open(){if(!pending)pending=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(TABLE))r.result.createObjectStore(TABLE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error("미디어 저장소를 열지 못했습니다."));});return pending;}
async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(TABLE,mode),s=tx.objectStore(TABLE),r=action(s);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error("파일 저장에 실패했습니다."));});}
const put=(id,data)=>transaction("readwrite",s=>s.put(data,id));
const get=id=>transaction("readonly",s=>s.get(id));
const remove=id=>transaction("readwrite",s=>s.delete(id));
window.CreativeMedia={put,get,remove};
})();