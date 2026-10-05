'use strict';

// Final shidduch workflow layer.
// Visible wording uses Offers -> In Progress -> Ended.
// The stage bar shows where the shidduch reached; turn/waiting remains separate.

const ZM_FLOW_STAGE_LABELS=['Profile sent','References','Date 1','Date 2','Date 3','Date 4','Date 5','Date 6','Date 7','Date 8','Marriage'];
const ZM_FLOW_STAGE_COLORS=['#4e8df7','#2fb8b0','#6f79eb','#7f6deb','#9563e6','#ac59dc','#c251ce','#d64db8','#e4579d','#ee6b7f','#39b86c'];

function zmFlowStageColor(index){return ZM_FLOW_STAGE_COLORS[Math.max(0,Math.min(10,index))]||ZM_FLOW_STAGE_COLORS[0];}

function zmFlowStageIndexFromLabel(label){
  const s=String(label||'').trim().toLowerCase();
  if(/married|marriage/.test(s))return 10;
  if(/reference|checking/.test(s))return 1;
  const m=s.match(/date\s*([1-8])/);
  if(m)return Math.min(9,Number(m[1])+1);
  if(/profile|sent/.test(s))return 0;
  return null;
}

// Preserve exactly where an ended shidduch stopped.
zmStageForShidduch=function(s){
  if(!s)return {index:0,label:ZM_FLOW_STAGE_LABELS[0]};
  if(s.status==='ended'){
    const savedIndex=Number.isInteger(s.endedStageIndex)?s.endedStageIndex:zmFlowStageIndexFromLabel(s.endedStage);
    if(savedIndex!=null)return {index:savedIndex,label:ZM_FLOW_STAGE_LABELS[savedIndex]||s.endedStage||'Profile sent'};
    const r=getCurrentRound(s);
    const roundIndex=Number.isInteger(r?.endedStageIndex)?r.endedStageIndex:zmFlowStageIndexFromLabel(r?.endedStage);
    if(roundIndex!=null)return {index:roundIndex,label:ZM_FLOW_STAGE_LABELS[roundIndex]||r?.endedStage||'Profile sent'};
  }

  const r=getCurrentRound(s);
  const raw=String(r?.stage||'').toLowerCase();
  if(/married|marriage/.test(raw))return {index:10,label:'Marriage'};

  const ds=data.dates
    .filter(d=>d.roundId===r?.id&&!/cancel/i.test(String(d.state||'')))
    .sort((a,b)=>(a.number||0)-(b.number||0));
  if(ds.length){
    const n=Math.min(8,Math.max(1,Math.max(...ds.map(d=>Number(d.number)||0))||ds.length));
    return {index:n+1,label:`Date ${n}`};
  }

  const explicit=zmFlowStageIndexFromLabel(raw);
  if(explicit!=null)return {index:explicit,label:ZM_FLOW_STAGE_LABELS[explicit]};
  if(/dating/.test(raw))return {index:2,label:'Date 1'};
  return {index:0,label:'Profile sent'};
};

// List cards show only the stage. On the detail page, whose turn it is is shown separately.
// All completed segments use the CURRENT stage color, so one glance gives one clear color meaning.
zmStageBar=function(s,detail=false){
  const st=zmStageForShidduch(s),turn=zmTurnForShidduch(s),ended=s?.status==='ended';
  const segs=ZM_FLOW_STAGE_LABELS.map((label,i)=>`<i class="zm-stage-seg s${i} ${i<st.index?'done':''} ${i===st.index?'now':''}" title="${esc(label)}"></i>`).join('');
  const left=ended?`Ended at ${st.label}`:st.label;
  const stageColor=ended?'#8f97a2':zmFlowStageColor(st.index);
  const detailNote=detail?(ended?(s.endReason?`Why: ${s.endReason}`:(s.endedAt?fmtDate(s.endedAt):'Ended')):turn):'';
  return `<div class="zm-stage ${detail?'detail':''} ${ended?'ended':''}" style="--zm-stage-color:${stageColor}" aria-label="${esc(left)}${detailNote?`. ${esc(detailNote)}`:''}"><div class="zm-stage-meta"><strong>${esc(left)}</strong></div><div class="zm-stage-track">${segs}</div>${detailNote?`<div class="zm-stage-note">${esc(detailNote)}</div>`:''}</div>`;
};

function zmOfferRow(i){
  const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
  return `<button class="warm-match-row zm-offer-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} ↔ ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>${sug?`Offered by ${esc(sug.name)}`:'New offer'}</p></div><div class="warm-chevron">›</div></button>`;
}

// Tabs are deliberately lifecycle order: Offers -> In Progress -> Ended.
shidduchimScreen=function(){
  const v=ui.screenView.shidduchim;
  const inProgress=data.shidduchim.filter(s=>s.status==='active');
  const ended=data.shidduchim.filter(s=>s.status==='ended');
  const offers=data.ideas.filter(i=>i.status==='open');
  const tabs=[
    {value:'ideas',label:'Offers',count:offers.length},
    {value:'active',label:'In Progress',count:inProgress.length},
    {value:'ended',label:'Ended',count:ended.length}
  ];
  let rows='';
  if(v==='ideas')rows=offers.map(zmOfferRow).join('');
  else rows=(v==='active'?inProgress:ended).map(s=>{
    const r=getCurrentRound(s);
    return `<button class="warm-match-row zm-stage-card ${s.status==='ended'?'zm-ended-card':''}" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong><time>Round ${r?.number||1}</time></div>${zmStageBar(s)}</div><div class="warm-chevron">›</div></button>`;
  }).join('');

  const emptyTitle=v==='ideas'?'No offers':v==='active'?'No shidduchim in progress':'No ended shidduchim';
  const emptyText=v==='ideas'?'New suggested matches will appear here before they become shidduchim.':v==='active'?'When you accept an offer, the shidduch will appear here.':'Ended shidduchim keep the stage where they stopped and their history.';
  return `${header('Shidduchim','Offers and shidduchim',{add:true})}${searchBox('Search a pair…')}${segment(tabs,v,'shidduchim')}<div class="warm-stack">${rows||empty(emptyTitle,emptyText,'add-idea')}</div>`;
};

// Replace visible Idea wording with Offer while preserving the existing data model.
ideaSheet=function(iid){
  const i=idea(iid);if(!i)return;
  const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
  openSheet(`<h2>${esc(g?.name)} ↔ ${esc(gl?.name)}</h2><p class="lead">Offer · suggested by ${esc(sug?.name||'you')} · ${esc(fmtDate(i.createdAt))}. An offer is not yet a shidduch.</p><div class="profile-card"><h3>${esc(gl?.name||'Profile')}</h3><div class="profile-text">${esc(gl?.profileText||'No profile text saved.')}</div></div><div class="split-actions"><button class="ghost-btn" data-act="idea-no" data-idea-id="${i.id}">Not applicable</button><button class="primary-btn" data-act="idea-yes" data-idea-id="${i.id}">Interested</button></div>`);
};

addIdeaSheet=function(){
  const guys=byType('Guy'),girls=byType('Girl'),shads=byType('Shadchan');
  openSheet(`<h2>New offer</h2><p class="lead">An offer is a suggested pair. It becomes a shidduch only when you choose Interested.</p><div class="form-grid"><div class="field"><label>Guy</label><select id="iGuy">${guys.map(p=>`<option value="${p.id}">${esc(p.isMe?'Me':p.name)}</option>`).join('')}</select></div><div class="field"><label>Girl</label><select id="iGirl">${girls.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Offered by</label><select id="iBy"><option value="">Me / unknown</option>${shads.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-idea">Save offer</button></div>`);
};

universalAddSheet=function(){
  openSheet(`<h2>Add</h2><p class="lead">What do you want to add?</p><div class="quick-add-grid"><button id="qaIdea"><span>♡</span><b>Offer</b><small>Someone suggested a match</small></button><button id="qaGuy"><span>G</span><b>Guy</b><small>Add a person</small></button><button id="qaShad"><span>S</span><b>Shadchan</b><small>Add to your network</small></button><button id="qaGirl"><span>G</span><b>Girl</b><small>Add a person</small></button><button id="qaNote"><span>✎</span><b>Note or call</b><small>Add something that happened</small></button></div><button class="ghost-btn full" data-act="close-sheet">Cancel</button>`);
  const go=(sel,fn)=>document.querySelector(sel)?.addEventListener('click',()=>{closeSheet();fn();});
  go('#qaIdea',()=>addIdeaSheet());go('#qaGuy',()=>addPersonSheet('Guy'));go('#qaShad',()=>addPersonSheet('Shadchan'));go('#qaGirl',()=>addPersonSheet('Girl'));go('#qaNote',()=>addActivitySheet());
};

const showToastBeforeOffers=showToast;
showToast=function(msg){
  const mapped=msg==='Idea saved'?'Offer saved':msg==='Idea closed'?'Offer closed':msg;
  return showToastBeforeOffers(mapped);
};

const personDetailBeforeOffers=personDetail;
personDetail=function(pid){
  return personDetailBeforeOffers(pid)
    .replaceAll('Ideas and shidduchim','Offers and shidduchim')
    .replaceAll('Idea ·','Offer ·');
};

function openEndShidduchSheet(sid){
  const s=shidduch(sid);if(!s||s.status==='ended')return;
  const st=zmStageForShidduch(s);
  const options=ZM_FLOW_STAGE_LABELS.slice(0,10).map((label,i)=>`<option value="${i}" ${i===st.index?'selected':''}>${esc(label)}</option>`).join('');
  openSheet(`<h2>End shidduch</h2><p class="lead">Save where it ended so you can understand the history later.</p><input type="hidden" id="endShidduchId" value="${esc(s.id)}"><div class="form-grid"><div class="field"><label>Where did it end?</label><select id="endStage">${options}</select></div><div class="field"><label>Why did it end? <span style="font-weight:400">(optional)</span></label><textarea id="endReason" placeholder="Short private note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="confirm-end-shidduch">Save as ended</button></div>`);
}

async function confirmEndShidduch(){
  const sid=document.getElementById('endShidduchId')?.value;
  const s=shidduch(sid);if(!s)return;
  const idx=Math.max(0,Math.min(9,Number(document.getElementById('endStage')?.value)||0));
  const label=ZM_FLOW_STAGE_LABELS[idx];
  const reason=document.getElementById('endReason')?.value.trim()||'';
  const stamp=iso();
  s.status='ended';
  s.endedAt=stamp;
  s.endedStage=label;
  s.endedStageIndex=idx;
  s.endReason=reason;
  const r=getCurrentRound(s);
  if(r){r.status='ended';r.endedAt=stamp;r.endedStage=label;r.endedStageIndex=idx;r.endReason=reason;}
  data.openItems.filter(x=>x.aboutType==='shidduch'&&x.aboutId===s.id&&x.status==='open').forEach(x=>{x.status='closed';x.closedAt=stamp;});
  data.entries.push({id:id('e'),at:stamp,type:'status',channel:'App',direction:'none',personIds:[s.guyId,s.girlId,...(s.shadchanIds||[])],aboutType:'shidduch',aboutId:s.id,text:`Shidduch ended at ${label}.${reason?` ${reason}`:''}`,result:'Ended'});
  await save();
  closeSheet();
  ui.detail=null;
  ui.screen='shidduchim';
  ui.screenView.shidduchim='ended';
  render();
  showToast('Moved to Ended');
}

const shidduchDetailBeforeEndFlow=shidduchDetail;
shidduchDetail=function(sid){
  let html=shidduchDetailBeforeEndFlow(sid);
  const s=shidduch(sid);if(!s)return html;
  if(s.status==='ended'){
    const st=zmStageForShidduch(s);
    const why=s.endReason?`<div><span>Why it ended</span><strong>${esc(s.endReason)}</strong></div>`:'';
    const saved=`<div class="zm-ended-summary"><div><span>Ended at</span><strong>${esc(st.label)}</strong></div>${s.endedAt?`<div><span>Ended</span><strong>${esc(fmtDate(s.endedAt))}</strong></div>`:''}${why}</div>`;
    return html+saved;
  }
  return html+`<div class="zm-end-action"><button class="ghost-btn" data-act="end-shidduch" data-shidduch-id="${esc(s.id)}">End shidduch</button></div>`;
};

document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.act==='end-shidduch')openEndShidduchSheet(b.dataset.shidduchId||ui.detail?.id);
  if(b.dataset.act==='confirm-end-shidduch')confirmEndShidduch();
});

if(data)render();
