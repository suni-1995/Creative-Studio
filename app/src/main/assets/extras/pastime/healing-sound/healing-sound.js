(function(){'use strict';
const tracks=[
 {id:'medieval',icon:'🏰',title:'중세의 이야기',category:'판타지 · 잔잔',asset:'extras/pastime/audio/custom/medieval_tale.mp3'},
 {id:'zoo',icon:'🎹',title:'Zoo',category:'피아노 · 경쾌',asset:'extras/pastime/audio/custom/zoo_piano.mp3'},
 {id:'campfire',icon:'🔥',title:'모닥불 아래에서',category:'판타지 · 휴식',asset:'extras/pastime/audio/custom/campfire_fantasy.mp3'},
 {id:'sleep',icon:'🌙',title:'숙면 자장가',category:'수면 · 잔잔',asset:'extras/pastime/audio/custom/sleep_lullaby.mp3'},
 {id:'sparkle',icon:'✨',title:'Sparkle',category:'피아노 · 감성',asset:'extras/pastime/audio/custom/sparkle_piano.mp3'},
 {id:'timeless',icon:'🎻',title:'시대를 초월한 마음',category:'바이올린 · 감성',asset:'extras/pastime/audio/custom/timeless_heart.mp3'},
 {id:'fairytail',icon:'🧚',title:'Fairy Tail',category:'피아노 · 판타지',asset:'extras/pastime/audio/custom/fairy_tail.mp3'}
];
const CLOSED_KEY='studioHealingDockClosed';
const isClosed=()=>{try{return localStorage.getItem(CLOSED_KEY)==='1'}catch(_){return false}};
const setClosed=v=>{try{v?localStorage.setItem(CLOSED_KEY,'1'):localStorage.removeItem(CLOSED_KEY)}catch(_){}};
const state=()=>{try{const s=JSON.parse(Android.getMusicState()||'{}');if(isClosed()&&String(s.uri||'').startsWith('healing://'))return{running:false,playing:false,uri:'',title:''};return s}catch(_){return{}}};
const isHealing=s=>String(s?.uri||'').startsWith('healing://');
function play(t){setClosed(false);try{Android.playHealingSound(t.asset,t.id,t.title);window.syncNativeMusicState?.();return true}catch(_){return false}}
function pause(){try{Android.pauseMusic();window.syncNativeMusicState?.()}catch(_){}}
function resume(){try{Android.resumeMusic();window.syncNativeMusicState?.()}catch(_){}}
function stop(){setClosed(true);try{Android.stopMusic();window.syncNativeMusicState?.()}catch(_){}}
window.StudioHealingSound={tracks,state,isHealing,play,pause,resume,stop};
})();
