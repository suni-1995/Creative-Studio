/* Creative-Studio ledger extension: manual entries, no financial integrations. */
(function(){
'use strict';
const KEYS=['ledgerCards','ledgerSavings','ledgerBudgets'];
const oldNormalize=normalize;
normalize=function(d){d=oldNormalize(d);for(const k of KEYS)if(!Array.isArray(d[k]))d[k]=[];return d};
for(const k of KEYS)if(!Array.isArray(db[k]))db[k]=[];
const types={expense:'지출',income:'수입',card:'신용카드',saving:'적금',budget:'기타 사용 비용'};
const subtypes={card:{installment:'할부',charge:'지출',payment:'입금'},saving:{deposit:'입금',close:'해지'}};
const items=(key)=>db[key].filter(x=>x.project===currentProjectId);
const money=n=>ledgerMoney(n);
const num=n=>Number(String(n||'').replace(/,/g,''));
const valid=n=>Number.isSafeInteger(n)&&n>0;
const month=s=>String(s||'').slice(0,7);
const nextMonth=(m,n)=>{const [y,mm]=m.split('-').map(Number);const d=new Date(y,mm-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const dateNow=()=>ledgerToday();
const sel=(id,opts,value)=>'<select id="'+id+'">'+opts.map(o=>'<option value="'+esc(o.id)+'" '+(o.id===value?'selected':'')+'>'+esc(o.name)+'</option>').join('')+'</select>';
const field=(id,type,label,value='')=>'<label class="ledgerExtField"><span>'+label+'</span><input id="'+id+'" type="'+type+'" value="'+esc(value)+'"></label>';
const entries=()=>ledgerEntries();
const recordLabel=x=>x.type==='card'?(subtypes.card[x.action]||'카드'):x.type==='saving'?(subtypes.saving[x.action]||'적금'):types[x.type]||'지출';
const reference=x=>x.type==='card'?items('ledgerCards').find(c=>c.id===x.targetId):x.type==='saving'?items('ledgerSavings').find(c=>c.id===x.targetId):items('ledgerBudgets').find(c=>c.id===x.targetId);
function parts(x){
 if(x.type!=='card'||x.action!=='installment')return [];
 const total=x.amount,months=x.months||1,base=Math.floor(total/months),extra=total%months;
 return Array.from({length:months},(_,i)=>({month:nextMonth(x.firstMonth,i),amount:base+(i<extra?1:0)}));
}
function cardMonthly(cardId,until){
 const rows=entries().filter(x=>x.type==='card'&&x.targetId===cardId);
 const due=new Map(),paid=new Map();
 for(const x of rows){
  if(x.action==='installment')for(const p of parts(x))due.set(p.month,(due.get(p.month)||0)+p.amount);
  else if(x.action==='charge'){const m=x.targetMonth||month(x.date);due.set(m,(due.get(m)||0)+x.amount)}
  else if(x.action==='payment'){const m=month(x.date);paid.set(m,(paid.get(m)||0)+x.amount)}
 }
 const keys=[...new Set([...due.keys(),...paid.keys(),until])].sort();
 let carry=0;const result=[];
 for(const m of keys){const base=due.get(m)||0,payment=paid.get(m)||0,opening=carry;carry+=base-payment;result.push({month:m,base,payment,opening,due:opening+base,balance:carry})}
 return result;
}
function cardStatus(cardId,m){return cardMonthly(cardId,m).find(x=>x.month===m)||{month:m,base:0,payment:0,opening:0,due:0,balance:0}}
function budgetStatus(id){const b=items('ledgerBudgets').find(x=>x.id===id);if(!b)return null;const used=entries().filter(x=>x.type==='budget'&&x.targetId===id).reduce((s,x)=>s+x.amount,0);return {...b,used,left:b.amount-used}}
function savingStatus(id){const s=items('ledgerSavings').find(x=>x.id===id);if(!s)return null;const deposits=entries().filter(x=>x.type==='saving'&&x.action==='deposit'&&x.targetId===id);return {...s,total:deposits.reduce((n,x)=>n+x.amount,0),deposits}}
function detailSummary(m){
 const cards=items('ledgerCards'),savings=items('ledgerSavings'),budgets=items('ledgerBudgets');
 let html='<div class="ledgerExtTotals"><h4>신용카드 · '+esc(m)+'</h4>';
 let overall={base:0,payment:0,balance:0};
 for(const c of cards){const x=cardStatus(c.id,m);overall.base+=x.base;overall.payment+=x.payment;overall.balance+=x.balance;html+='<div class="ledgerExtLine"><b>'+esc(c.name)+'</b><span>이번 달 '+money(x.base)+' / 입금 '+money(x.payment)+' / 미납 '+money(x.balance)+'</span></div>'}
 html+='<div class="ledgerExtLine"><b>전체 카드 합계</b><span>납부 발생 '+money(overall.base)+' · 입금 '+money(overall.payment)+' · 잔액 '+money(overall.balance)+'</span></div>';
 html+='<h4>적금</h4>';
 for(const s of savings){const x=savingStatus(s.id);const monthly=x.deposits.filter(z=>month(z.date)===m).reduce((a,z)=>a+z.amount,0);html+='<div class="ledgerExtLine"><b>'+esc(s.name)+(s.closed?' (해지)':'')+'</b><span>이번 달 '+money(monthly)+' · 누적 '+money(x.total)+'</span></div>'}
 html+='<h4>기타 사용 비용</h4>';
 for(const b of budgets){const x=budgetStatus(b.id);html+='<div class="ledgerExtLine"><b>'+esc(b.name)+'</b><span>설정 '+money(b.amount)+' · 사용 '+money(x.used)+' · '+(x.left<0?'초과 ':'잔액 ')+money(Math.abs(x.left))+'</span></div>'}
 return html+'</div>';
}
function listRow(x){
 const name=x.type==='expense'||x.type==='income'?x.category:reference(x)?.name||'삭제된 항목';
 const detail=x.type==='card'&&x.action==='installment'?x.months+'개월 · '+x.firstMonth+'부터':x.type==='card'&&x.action==='charge'?'납부 '+x.targetMonth:x.type==='saving'&&x.action==='close'?'해지':x.note||'';
 const sign=x.type==='income'?'+':x.type==='expense'?'-':'';
 return '<div class="ledgerEntry" onclick="editLedgerEntry(\''+x.id+'\')"><div><b>'+esc(recordLabel(x))+' · '+esc(name)+'</b><div class="meta">'+esc(detail)+(x.note&&detail!==x.note?' · '+esc(x.note):'')+'</div></div><div class="ledgerAmount">'+(x.action==='close'?'해지':sign+' '+money(x.amount))+'</div></div>';
}
const oldSums=ledgerSums;
ledgerSums=function(rows){return oldSums(rows.filter(x=>x.type==='expense'||x.type==='income'))};
function inputView(x){
 const type=x?.type||'expense',action=x?.action||(type==='card'?'installment':type==='saving'?'deposit':'');
 const date=x?.date||ledgerSelectedDate||dateNow();
 let html='<div class="ledgerForm ledgerExtForm">'+field('ledgerDate','date','날짜',date)+'<label class="ledgerExtField"><span>종류</span>'+sel('ledgerType',Object.entries(types).map(([id,name])=>({id,name})),type)+'</label>';
 if(subtypes[type])html+='<label class="ledgerExtField"><span>세부 종류</span>'+sel('ledgerAction',Object.entries(subtypes[type]).map(([id,name])=>({id,name})),action)+'</label>';
 if(type==='expense'||type==='income'){
 html+='<label class="ledgerExtField"><span>분류</span>'+sel('ledgerCategory',(type==='income'?LEDGER_INCOME:LEDGER_EXPENSE).concat(items('ledgerCategories').filter(z=>z.type===type).map(z=>z.name)).filter((v,i,a)=>a.indexOf(v)===i).map(name=>({id:name,name})),x?.category||'기타')+'</label>';
 }else{
 const key=type==='card'?'ledgerCards':type==='saving'?'ledgerSavings':'ledgerBudgets';
 html+='<label class="ledgerExtField"><span>'+(type==='card'?'카드':type==='saving'?'적금':'비용 항목')+'</span>'+sel('ledgerTarget',items(key),x?.targetId)+'</label><button type="button" onclick="ledgerAddTarget(\''+type+'\')">+ 항목 등록</button>';
 }
 if(type==='card'&&action==='installment')html+=field('ledgerMonths','number','할부 개월 수',x?.months||'')+field('ledgerFirstMonth','month','첫 할부 반영 월',x?.firstMonth||month(date));
 if(type==='card'&&action==='charge')html+=field('ledgerTargetMonth','month','납부 대상 월',x?.targetMonth||month(date));
 if(!(type==='saving'&&action==='close'))html+=field('ledgerAmount','number',type==='card'&&action==='installment'?'총 결제 금액':type==='card'&&action==='payment'?'실제 입금 금액':'금액',x?.amount||'');
 html+=field('ledgerNote','text','내용',x?.note||'')+'<button class="primary full" onclick="ledgerSaveExtended(\''+(x?.id||'')+'\')">'+(x?'수정 저장':'내역 저장')+'</button>';
 if(x)html+='<button class="danger full" onclick="deleteLedgerEntry(\''+x.id+'\')">삭제</button>';
 return html+'</div>';
}
function bindInputs(host,x){
 host.querySelector('#ledgerType')?.addEventListener('change',()=>{const t=v('ledgerType');const a=t==='card'?'installment':t==='saving'?'deposit':'';const node=host.querySelector('.ledgerExtForm');node.outerHTML=inputView({type:t,action:a,date:v('ledgerDate')});bindInputs(host)});
 host.querySelector('#ledgerAction')?.addEventListener('change',()=>{const node=host.querySelector('.ledgerExtForm');node.outerHTML=inputView({type:v('ledgerType'),action:v('ledgerAction'),date:v('ledgerDate'),targetId:v('ledgerTarget')});bindInputs(host)});
 enhanceAllSelects(host);
}
window.ledgerAddTarget=function(type){
 const name=prompt(type==='card'?'카드 이름':type==='saving'?'적금 이름':'비용 항목 이름');
 if(!name?.trim())return;
 const key=type==='card'?'ledgerCards':type==='saving'?'ledgerSavings':'ledgerBudgets';
 if(items(key).some(x=>x.name===name.trim()))return alert('같은 이름이 이미 등록되어 있습니다.');
 let amount=0;
 if(type==='budget'){const value=prompt('설정 금액 (원)');amount=num(value);if(!valid(amount))return alert('올바른 설정 금액을 입력해 주세요.')}
 const item={id:uid(),project:currentProjectId,name:name.trim(),amount,closed:false,created:Date.now()};
 db[key].push(item);persist();
 const target=document.getElementById('ledgerTarget');
 if(target){target.innerHTML=items(key).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');target.value=item.id;syncAppSelect(target)}
 renderLedgerCalendar();
};
window.ledgerSaveExtended=function(id=''){
 const old=entries().find(x=>x.id===id);
 const type=v('ledgerType'),action=v('ledgerAction'),date=v('ledgerDate');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return alert('날짜를 선택해 주세요.');
 const amount=type==='saving'&&action==='close'?0:num(v('ledgerAmount'));
 if(!(type==='saving'&&action==='close')&&!valid(amount))return alert('올바른 금액을 입력해 주세요.');
 const targetId=v('ledgerTarget');
 if(!['expense','income'].includes(type)&&!targetId)return alert('항목을 먼저 등록해 주세요.');
 const months=num(v('ledgerMonths')),firstMonth=v('ledgerFirstMonth'),targetMonth=v('ledgerTargetMonth');
 if(type==='card'&&action==='installment'&&(!Number.isSafeInteger(months)||months<1||months>600||!firstMonth))return alert('할부 개월 수와 첫 반영 월을 확인해 주세요.');
 if(type==='card'&&action==='charge'&&!targetMonth)return alert('납부 대상 월을 선택해 주세요.');
 if(type==='saving'&&action==='deposit'&&items('ledgerSavings').find(z=>z.id===targetId)?.closed)return alert('해지된 적금에는 입금할 수 없습니다.');
 if(type==='saving'&&action==='close'&&items('ledgerSavings').find(z=>z.id===targetId)?.closed&&!old)return alert('이미 해지된 적금입니다.');
 const obj={id:id||uid(),project:currentProjectId,type,action,date,amount,targetId,months:type==='card'&&action==='installment'?months:undefined,firstMonth:type==='card'&&action==='installment'?firstMonth:undefined,targetMonth:type==='card'&&action==='charge'?targetMonth:undefined,category:v('ledgerCategory')||'기타',note:v('ledgerNote').trim(),created:old?.created||Date.now(),updated:Date.now()};
 if(old)Object.assign(old,obj);else db.ledgerEntries.unshift(obj);
 refreshSavingStates();
 persist();ledgerSelectedDate=date;closeModal();renderLedgerAll();renderProjects();
};
function refreshSavingStates(){
 for(const s of items('ledgerSavings')){const closes=entries().filter(x=>x.type==='saving'&&x.action==='close'&&x.targetId===s.id).sort((a,b)=>a.date.localeCompare(b.date));s.closed=closes.length>0;s.closedDate=closes[0]?.date||''}
}
window.deleteLedgerEntry=function(id){
 if(!confirm('이 내역을 삭제하시겠습니까?'))return;
 db.ledgerEntries=db.ledgerEntries.filter(x=>x.id!==id);refreshSavingStates();persist();closeModal();renderLedgerAll();renderProjects();
};
window.editLedgerEntry=function(id){
 const x=entries().find(z=>z.id===id);if(!x)return;
 openModal('<div class="stack"><h2>가계부 내역 수정</h2>'+inputView(x)+'</div>');
 bindInputs(document.getElementById('modalCard'),x);
};
window.renderLedgerDay=function(){
 const host=document.getElementById('projectRecent');if(!host||currentProjectType()!=='ledger')return;
 const date=ledgerSelectedDate||dateNow(),m=month(date),rows=entries().filter(x=>x.date===date).sort((a,b)=>(b.updated||0)-(a.updated||0)),sum=ledgerSums(rows);
 host.innerHTML=ledgerSummaryHtml(currentProjectId,m)+'<div class="toolbar"><div><h3>하루내역</h3><div class="meta">'+esc(date)+' · 수입 '+money(sum.income)+' · 지출 '+money(sum.expense)+'</div></div></div><div class="card stack">'+inputView()+'</div><div class="ledgerDayList">'+(rows.map(listRow).join('')||'<div class="empty">이 날짜의 내역이 없습니다.</div>')+'</div>'+detailSummary(m);
 bindInputs(host);
 host.querySelector('#ledgerDate')?.addEventListener('change',function(){ledgerSelectedDate=this.value;renderLedgerDay()});
};
window.renderLedgerCalendar=function(){
 const host=document.getElementById('projectCalendar');if(!host||currentProjectType()!=='ledger')return;
 const y=ledgerCalendarCursor.getFullYear(),m=ledgerCalendarCursor.getMonth(),mk=y+'-'+String(m+1).padStart(2,'0'),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),byDate=new Map();
 for(const x of entries()){if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x)}
 let cells='';
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),rows=byDate.get(ds)||[],sum=ledgerSums(rows);cells+='<button class="ledgerCalDay '+(d.getMonth()!==m?'out':'')+' '+(ds===ledgerSelectedDate?'active':'')+'" onclick="ledgerSelectedDate=\''+ds+'\';renderLedgerCalendar()"><div class="num">'+d.getDate()+'</div>'+(rows.length?'<div class="money ledgerExpense">'+money(sum.expense)+'</div>':'')+'</button>'}
 const selected=byDate.get(ledgerSelectedDate)||[],ss=ledgerSums(selected);
 host.innerHTML=ledgerSummaryHtml(currentProjectId,mk)+'<div class="ledgerCalendarWrap"><div class="toolbar"><button onclick="ledgerCalendarMove(-1)">‹</button><b>'+y+'년 '+(m+1)+'월</b><button onclick="ledgerCalendarMove(1)">›</button></div><div class="ledgerCalGrid">'+['일','월','화','수','목','금','토'].map(x=>'<div class="ledgerCalHead">'+x+'</div>').join('')+cells+'</div><div class="card" style="margin-top:12px"><b>'+esc(ledgerSelectedDate)+'</b><div class="meta">수입 '+money(ss.income)+' · 지출 '+money(ss.expense)+'</div><div class="ledgerDayList">'+(selected.map(listRow).join('')||'<div class="meta">기록이 없습니다.</div>')+'</div></div></div>'+detailSummary(mk);
};
const oldTrash=trashProject;
trashProject=function(pid){
 const extras={};for(const k of KEYS)extras[k]=(db[k]||[]).filter(x=>x.project===pid);
 oldTrash(pid);
 const bundle=(db.trash||[]).find(t=>t.kind==='project'&&t.data?.project?.id===pid);
 if(bundle){for(const k of KEYS){bundle.data.items[k]=extras[k];db[k]=db[k].filter(x=>x.project!==pid)}persist()}
};
})();
