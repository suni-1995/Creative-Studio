(function(){'use strict';
const recent=[];const KEEP=7;let last='';
function all(){const d=window.StudioPastimeMessages||{};return Object.entries(d).flatMap(([category,items])=>(items||[]).map(text=>({category,text})))}
function pick(){const rows=all(),pool=rows.filter(x=>!recent.includes(x.text));const src=pool.length?pool:rows;if(!src.length)return{category:'',text:'문구를 준비하지 못했습니다.'};const v=src[Math.floor(Math.random()*src.length)];recent.push(v.text);while(recent.length>Math.min(KEEP,Math.max(1,rows.length-1)))recent.shift();last=v.text;return v}
window.StudioRandomMessage={pick,last:()=>last};
})();
