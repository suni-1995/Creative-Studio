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
 let html='<div class="ledgerExtTotals">';
 const section=(title,body)=>'<section class="ledgerExtSection"><h4>'+title+'</h4><div class="ledgerExtSectionBody">'+(body||'<p class="ledgerExtEmpty">등록된 항목이 없습니다.</p>')+'</div></section>';
 const line=(name,metrics)=>'<div class="ledgerExtLine"><b>'+esc(name)+'</b><div class="ledgerExtMetrics">'+metrics.map(([label,value])=>'<span><small>'+label+'</small><strong>'+value+'</strong></span>').join('')+'</div></div>';
 let cardRows='',overall={base:0,payment:0,balance:0};
 for(const c of cards){const x=cardStatus(c.id,m);overall.base+=x.base;overall.payment+=x.payment;overall.balance+=x.balance;cardRows+=line(c.name,[['이번 달',money(x.base)],['입금',money(x.payment)],['잔액',money(x.balance)]])}
 if(cards.length)cardRows+=line('전체 카드 합계',[['납부 발생',money(overall.base)],['입금',money(overall.payment)],['잔액',money(overall.balance)]]);
 html+=section('신용카드 · '+esc(m),cardRows);
 let savingRows='';
 for(const s of savings){const x=savingStatus(s.id);const monthly=x.deposits.filter(z=>month(z.date)===m).reduce((a,z)=>a+z.amount,0);savingRows+=line(s.name+(s.closed?' (해지)':''),[['이번 달',money(monthly)],['누적',money(x.total)]])}
 html+=section('적금',savingRows);
 let budgetRows='';
 for(const b of budgets){const x=budgetStatus(b.id);budgetRows+=line(b.name,[['설정',money(b.amount)],['사용',money(x.used)],[x.left<0?'초과':'잔액',money(Math.abs(x.left))]])}
 html+=section('기타 사용 비용',budgetRows);
 return html+'</div>';
}
function listRow(x){
 const name=x.type==='expense'||x.type==='income'?x.category:reference(x)?.name||'삭제된 항목';
 const detail=x.type==='card'&&x.action==='installment'?x.months+'개월 · '+x.firstMonth+'부터':x.type==='card'&&x.action==='charge'?'납부 '+x.targetMonth:x.type==='saving'&&x.action==='close'?'해지':x.note||'';
 const sign=x.type==='income'?'+':x.type==='expense'?'-':'';
 return '<div class="ledgerEntry" onclick="editLedgerEntry(\''+x.id+'\')"><div><b>'+esc(recordLabel(x))+' · '+esc(name)+'</b><div class="meta">'+esc(detail)+(x.note&&detail!==x.note?' · '+esc(x.note):'')+'</div></div><div class="ledgerAmount">'+(x.action==='close'?'해지':sign+' '+money(x.amount))+'</div></div>';
}
const oldSums=ledgerSums;
ledgerSums=function(rows){return oldSums(rows.filter(x=>x.type==='expense'||x.type==='income').concat(rows.filter(x=>x.type==='budget').map(x=>({...x,type:'expense'}))))};
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
 const read=(key)=>host.querySelector('.ledgerExtForm #'+key)?.value||'';
 host.querySelector('#ledgerType')?.addEventListener('change',()=>{const t=read('ledgerType');const a=t==='card'?'installment':t==='saving'?'deposit':'';const node=host.querySelector('.ledgerExtForm');node.outerHTML=inputView({type:t,action:a,date:read('ledgerDate')});bindInputs(host)});
 host.querySelector('#ledgerAction')?.addEventListener('change',()=>{const node=host.querySelector('.ledgerExtForm');node.outerHTML=inputView({type:read('ledgerType'),action:read('ledgerAction'),date:read('ledgerDate'),targetId:read('ledgerTarget')});bindInputs(host)});
 enhanceAllSelects(host);
 ledgerEmptyTargetMessage(host.querySelector('#ledgerTarget'));
}
function ledgerRegistrationClose(){
 document.getElementById('ledgerRegistrationOverlay')?.remove();
}
window.ledgerRegistrationClose=ledgerRegistrationClose;
window.ledgerAddTarget=function(type){
 const key=type==='card'?'ledgerCards':type==='saving'?'ledgerSavings':'ledgerBudgets';
 const title=type==='card'?'신용카드':type==='saving'?'적금':'기타 사용 비용';
 ledgerRegistrationClose();
 const overlay=document.createElement('div');
 overlay.id='ledgerRegistrationOverlay';
 overlay.className='ledgerRegistrationOverlay';
 overlay.innerHTML='<div class="ledgerRegistrationDialog" role="dialog" aria-modal="true" aria-label="'+title+' 항목 등록"><h3>'+title+' 항목 등록</h3><label>이름<input id="ledgerRegisterName" type="text" autocomplete="off" placeholder="항목 이름"></label>'+(type==='budget'?'<label>설정 금액 (원)<input id="ledgerRegisterAmount" type="number" min="1" step="1" inputmode="numeric" placeholder="금액 입력"></label>':'')+'<p id="ledgerRegisterError" class="ledgerRegisterError" aria-live="polite"></p><div class="ledgerRegistrationActions"><button type="button" onclick="ledgerRegistrationClose()">취소</button><button type="button" class="primary" id="ledgerRegisterConfirm">등록</button></div></div>';
 overlay.addEventListener('click',e=>{if(e.target===overlay)ledgerRegistrationClose()});
 document.body.appendChild(overlay);
 overlay.querySelector('#ledgerRegisterConfirm').onclick=()=>{
  const name=overlay.querySelector('#ledgerRegisterName').value.trim();
  const amount=type==='budget'?num(overlay.querySelector('#ledgerRegisterAmount').value):0;
  const error=overlay.querySelector('#ledgerRegisterError');
  if(!name){error.textContent='항목 이름을 입력해 주세요.';return}
  if(items(key).some(x=>x.name===name)){error.textContent='같은 이름이 이미 등록되어 있습니다.';return}
  if(type==='budget'&&!valid(amount)){error.textContent='올바른 설정 금액을 입력해 주세요.';return}
  const item={id:uid(),project:currentProjectId,name,amount,closed:false,created:Date.now()};
  db[key].push(item);persist();
  const target=document.getElementById('ledgerTarget');
  if(target){target.innerHTML=items(key).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');target.value=item.id;syncAppSelect(target);ledgerEmptyTargetMessage(target)}
  ledgerRegistrationClose();
  renderLedgerCalendar();
 };
 overlay.querySelector('#ledgerRegisterName').focus();
};
function ledgerEmptyTargetMessage(target){
 if(!target)return;
 const empty=target.options.length===0;
 const button=target.nextElementSibling;
 if(button?.classList.contains('appSelectButton')){
  button.textContent=empty?'항목이 없습니다. 추가해 주세요':target.options[target.selectedIndex]?.textContent||'선택';
  if(empty)button.onclick=()=>{const old=document.getElementById('ledgerEmptyTargetHint');old?.remove();const hint=document.createElement('div');hint.id='ledgerEmptyTargetHint';hint.className='ledgerEmptyTargetHint';hint.textContent='항목이 없습니다. 추가해 주세요';button.closest('.ledgerExtField')?.appendChild(hint)};
  else button.onclick=()=>openAppSelect(target);
 }
}

window.ledgerSaveExtended=function(id=''){
 const old=entries().find(x=>x.id===id);
 const root=id?document.querySelector('#modalCard .ledgerExtForm'):document.querySelector('#projectRecent .ledgerExtForm');
 if(!root)return alert('입력창을 찾을 수 없습니다.');
 const read=(key)=>root.querySelector('#'+key)?.value||'';
 const type=read('ledgerType'),action=read('ledgerAction'),date=read('ledgerDate');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return alert('날짜를 선택해 주세요.');
 const amount=type==='saving'&&action==='close'?0:num(read('ledgerAmount'));
 if(!(type==='saving'&&action==='close')&&!valid(amount))return alert('올바른 금액을 입력해 주세요.');
 const targetId=read('ledgerTarget');
 if(!['expense','income'].includes(type)&&!targetId)return alert('항목을 먼저 등록해 주세요.');
 const months=num(read('ledgerMonths')),firstMonth=read('ledgerFirstMonth'),targetMonth=read('ledgerTargetMonth');
 if(type==='card'&&action==='installment'&&(!Number.isSafeInteger(months)||months<1||months>600||!firstMonth))return alert('할부 개월 수와 첫 반영 월을 확인해 주세요.');
 if(type==='card'&&action==='charge'&&!targetMonth)return alert('납부 대상 월을 선택해 주세요.');
 if(type==='saving'&&action==='deposit'&&items('ledgerSavings').find(z=>z.id===targetId)?.closed)return alert('해지된 적금에는 입금할 수 없습니다.');
 if(type==='saving'&&action==='close'&&items('ledgerSavings').find(z=>z.id===targetId)?.closed&&!old)return alert('이미 해지된 적금입니다.');
 const obj={id:id||uid(),project:currentProjectId,type,action,date,amount,targetId,months:type==='card'&&action==='installment'?months:undefined,firstMonth:type==='card'&&action==='installment'?firstMonth:undefined,targetMonth:type==='card'&&action==='charge'?targetMonth:undefined,category:read('ledgerCategory')||'기타',note:read('ledgerNote').trim(),created:old?.created||Date.now(),updated:Date.now()};
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
 const target=x.type==='expense'||x.type==='income'?x.category:reference(x)?.name||'삭제된 항목';
 const amount=x.type==='saving'&&x.action==='close'?'해지':money(x.amount);
 const fields=[
  ['날짜',x.date],
  ['종류',types[x.type]||'지출'],
  ...(x.action?[['세부 종류',recordLabel(x)]]:[]),
  [x.type==='card'?'카드':x.type==='saving'?'적금':x.type==='budget'?'비용 항목':'분류',target],
  ...(x.type==='card'&&x.action==='installment'?[['할부 개월',String(x.months||1)+'개월'],['첫 반영 월',x.firstMonth||'']]:[]),
  ...(x.type==='card'&&x.action==='charge'?[['납부 대상 월',x.targetMonth||'']]:[]),
  ['금액',amount],
  ...(x.note?[['내용',x.note]]:[])
 ];
 const body=fields.map(([label,value])=>'<div class="ledgerPreviewRow"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('');
 openModal('<div class="ledgerPreview"><h2>가계부 내역</h2><div class="ledgerPreviewRows">'+body+'</div><div class="ledgerPreviewActions"><button type="button" class="primary" onclick="ledgerOpenEntryEditor(\''+x.id+'\')">편집</button><button type="button" onclick="closeModal()">닫기</button></div></div>');
};
window.ledgerOpenEntryEditor=function(id){
 const x=entries().find(z=>z.id===id);if(!x)return;
 openModal('<div class="stack"><h2>가계부 내역 수정</h2>'+inputView(x)+'</div>');
 bindInputs(document.getElementById('modalCard'),x);
};
window.renderLedgerDay=function(){
 const host=document.getElementById('projectRecent');if(!host||currentProjectType()!=='ledger')return;
 const date=ledgerSelectedDate||dateNow(),m=month(date),rows=entries().filter(x=>x.date===date).sort((a,b)=>(b.updated||0)-(a.updated||0)),sum=ledgerSums(rows);
 host.innerHTML=ledgerSummaryHtml(currentProjectId,m)+'<div class="toolbar"><div><h3>하루내역</h3><div class="meta">'+esc(date)+' · 수입 '+money(sum.income)+' · 지출 '+money(sum.expense)+'</div></div></div><div class="card stack ledgerExtEntryCard">'+inputView()+'</div><div class="ledgerDayList ledgerExtDayList">'+(rows.map(listRow).join('')||'<div class="empty">이 날짜의 내역이 없습니다.</div>')+'</div>'+detailSummary(m);
 bindInputs(host);
 host.querySelector('#ledgerDate')?.addEventListener('change',function(){ledgerSelectedDate=this.value;renderLedgerDay()});
};
window.renderLedgerCalendar=function(){
 const host=document.getElementById('projectCalendar');if(!host||currentProjectType()!=='ledger')return;
 const y=ledgerCalendarCursor.getFullYear(),m=ledgerCalendarCursor.getMonth(),mk=y+'-'+String(m+1).padStart(2,'0'),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),byDate=new Map();
 for(const x of entries()){if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x)}
 let cells='';
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),rows=byDate.get(ds)||[],sum=ledgerSums(rows);cells+='<button class="ledgerCalDay '+(d.getMonth()!==m?'out':'')+' '+(ds===ledgerSelectedDate?'active':'')+'" onclick="ledgerSelectedDate=\''+ds+'\';renderLedgerCalendar()"><div class="num">'+d.getDate()+'</div>'+(sum.income?'<div class="money ledgerIncome">+'+money(sum.income)+'</div>':'')+(sum.expense?'<div class="money ledgerExpense">-'+money(sum.expense)+'</div>':'')+'</button>'}
 const selected=byDate.get(ledgerSelectedDate)||[],ss=ledgerSums(selected);
 host.innerHTML=ledgerSummaryHtml(currentProjectId,mk)+'<div class="ledgerCalendarWrap"><div class="toolbar"><button onclick="ledgerCalendarMove(-1)">‹</button><b>'+y+'년 '+(m+1)+'월</b><button onclick="ledgerCalendarMove(1)">›</button></div><div class="ledgerCalGrid">'+['일','월','화','수','목','금','토'].map(x=>'<div class="ledgerCalHead">'+x+'</div>').join('')+cells+'</div><div class="card" style="margin-top:12px"><b>'+esc(ledgerSelectedDate)+'</b><div class="meta">수입 <span class="ledgerIncome">'+money(ss.income)+'</span> · 지출 <span class="ledgerExpense">'+money(ss.expense)+'</span> · 잔액 <strong>'+money(ss.balance)+'</strong></div><div class="ledgerDayList">'+(selected.map(listRow).join('')||'<div class="meta">기록이 없습니다.</div>')+'</div></div></div>'+detailSummary(mk);
};
const oldTrash=trashProject;
trashProject=function(pid){
 const extras={};for(const k of KEYS)extras[k]=(db[k]||[]).filter(x=>x.project===pid);
 oldTrash(pid);
 const bundle=(db.trash||[]).find(t=>t.kind==='project'&&t.data?.project?.id===pid);
 if(bundle){for(const k of KEYS){bundle.data.items[k]=extras[k];db[k]=db[k].filter(x=>x.project!==pid)}persist()}
};
const ledgerLayoutStyle=document.createElement('style');ledgerLayoutStyle.textContent="\n/* Ledger extension: responsive form and summary layout, scoped to ledger only. */\n.ledgerExtForm{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;align-items:end}\n.ledgerExtForm .ledgerExtField{display:flex;flex-direction:column;gap:6px;min-width:0;margin:0}\n.ledgerExtForm .ledgerExtField>span{font-size:12px;color:var(--muted);font-weight:650}\n.ledgerExtForm .ledgerExtField input,.ledgerExtForm .ledgerExtField select{width:100%!important;min-width:0;max-width:100%;box-sizing:border-box;height:48px;margin:0}\n.ledgerExtForm .ledgerExtField .appSelectButton{width:100%!important;min-width:0;max-width:100%;height:48px;box-sizing:border-box;text-align:left;margin:0}\n.ledgerExtForm>button{min-height:48px;width:100%;margin:0}\n.ledgerExtForm>button.full{grid-column:1/-1}\n.ledgerExtTotals{display:grid;gap:12px;margin:16px 0 4px;min-width:0}\n.ledgerExtSection{min-width:0;padding:14px;border:1px solid var(--line);border-radius:15px;background:var(--card)}\n.ledgerExtSection h4{margin:0 0 12px;font-size:14px;line-height:1.5}\n.ledgerExtSectionBody{display:grid;gap:9px}\n.ledgerExtLine{min-width:0;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--bg,var(--card));display:grid;gap:10px}\n.ledgerExtLine>b{font-size:13px;overflow-wrap:anywhere}\n.ledgerExtMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}\n.ledgerExtMetrics>span{display:flex;flex-direction:column;gap:5px;min-width:0}\n.ledgerExtMetrics small{font-size:11px;color:var(--muted)}\n.ledgerExtMetrics strong{font-size:12px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}\n.ledgerExtEmpty{font-size:12px;color:var(--muted);margin:0}\n.ledgerCalendarWrap .toolbar{display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:8px}\n.ledgerCalendarWrap .toolbar>b{text-align:center}\n.ledgerCalendarWrap .toolbar>button{width:42px;height:42px;min-width:0;padding:0}\n@media(max-width:640px){.ledgerExtForm{grid-template-columns:minmax(0,1fr)!important}.ledgerExtForm>button.full{grid-column:1}.ledgerExtSection{padding:12px}.ledgerExtMetrics{gap:6px}.ledgerExtMetrics strong{font-size:11px}}\n";document.head.appendChild(ledgerLayoutStyle);
const ledgerRegistrationStyle=document.createElement('style');ledgerRegistrationStyle.textContent="\n.ledgerRegistrationOverlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.65);box-sizing:border-box}\n.ledgerRegistrationDialog{width:min(100%,420px);max-height:calc(100dvh - 40px);overflow:auto;padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--card);color:var(--text);box-shadow:0 18px 48px rgba(0,0,0,.3);box-sizing:border-box}\n.ledgerRegistrationDialog h3{font-size:17px;margin:0 0 20px}\n.ledgerRegistrationDialog label{display:flex;flex-direction:column;gap:8px;margin:0 0 14px;font-size:13px;color:var(--muted)}\n.ledgerRegistrationDialog input{display:block;width:100%;min-width:0;box-sizing:border-box;height:48px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--card);color:var(--text);font-size:15px}\n.ledgerRegistrationActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}\n.ledgerRegistrationActions button{min-height:46px;border-radius:12px}\n.ledgerRegisterError{font-size:12px;color:#db7070;min-height:16px;margin:4px 0}\n.ledgerEmptyTargetHint{margin-top:7px;font-size:12px;color:var(--muted);line-height:1.5}\n.ledgerExtDayList{margin-top:18px!important}\n.ledgerExtDayList .ledgerEntry{margin:0}\n.ledgerExtForm+.ledgerExtDayList{margin-top:18px}\n";document.head.appendChild(ledgerRegistrationStyle);
const ledgerPolishStyle=document.createElement('style');ledgerPolishStyle.textContent="\n#projectRecent .ledgerExtEntryCard{margin-bottom:20px!important}\n#projectRecent .ledgerExtDayList{margin-top:0!important;display:grid;gap:10px}\n#projectRecent .ledgerExtDayList+.ledgerExtTotals{margin-top:22px!important}\n#modalCard:has(.ledgerExtForm) .ledgerExtForm .fix26GlobalDraftStatus{display:none!important}\n";document.head.appendChild(ledgerPolishStyle);
const ledgerPreviewStyle=document.createElement('style');ledgerPreviewStyle.textContent="\n.ledgerPreview{display:grid;gap:18px;min-width:0}\n.ledgerPreview h2{margin:0}\n.ledgerPreviewRows{display:grid;gap:0;border:1px solid var(--line);border-radius:14px;padding:4px 14px;background:var(--card)}\n.ledgerPreviewRow{display:grid;grid-template-columns:95px minmax(0,1fr);gap:12px;align-items:start;padding:12px 0;border-bottom:1px solid var(--line)}\n.ledgerPreviewRow:last-child{border-bottom:0}\n.ledgerPreviewRow span{color:var(--muted);font-size:13px}\n.ledgerPreviewRow strong{font-size:14px;font-weight:650;overflow-wrap:anywhere}\n.ledgerPreviewActions{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n.ledgerPreviewActions button{min-height:48px}\n";document.head.appendChild(ledgerPreviewStyle);
const ledgerCalendarMoneyStyle=document.createElement('style');ledgerCalendarMoneyStyle.textContent="\n.ledgerCalDay .money.ledgerIncome{color:#4fd17c}.ledgerCalDay .money.ledgerExpense{color:#e17885}.ledgerCalDay .money{margin-top:3px}.ledgerCalDay .num{margin-bottom:3px}\n";document.head.appendChild(ledgerCalendarMoneyStyle);
})();
