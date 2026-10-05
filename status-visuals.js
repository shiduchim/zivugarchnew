'use strict';

// Visual status layer for Shidduchim: one status, shown with color rail + icon + short text.
// This is deliberately not a progress bar because a shidduch is not a linear percentage-complete process.
function visualStatusForShidduch(s){
  if(!s)return {kind:'current',label:'Current',icon:'heart'};
  if(s.status==='ended')return {kind:'ended',label:'Ended',icon:'check'};
  const mine=openForShidduch(s.id,'me');
  if(mine.length)return {kind:'my',label:'My turn',icon:'bell'};
  const theirs=openForShidduch(s.id,'them');
  if(theirs.length){
    const p=person(theirs[0].personId);
    return {kind:'their',label:p?`Waiting for ${clarityFirstName(p)}`:'Their turn',icon:'hourglass'};
  }
  const r=getCurrentRound(s),stage=String(r?.stage||'').trim();
  if(stage.toLowerCase()==='dating')return {kind:'dating',label:'Dating',icon:'heart'};
  if(String(r?.girlStatus||'').toLowerCase()==='thinking')return {kind:'their',label:`Waiting for ${clarityFirstName(person(s.girlId))}`,icon:'hourglass'};
  if(String(r?.guyStatus||'').toLowerCase()==='thinking')return {kind:'their',label:`Waiting for ${clarityFirstName(person(s.guyId))}`,icon:'hourglass'};
  return {kind:'current',label:clarityShidduchStatus(s)||'Current',icon:'heart'};
}
function visualStatusPill(st){return `<div class="clarity-status-line"><span class="clarity-status-pill">${icon(st.icon)}<span>${esc(st.label)}</span></span></div>`;}

shidduchimScreen=function(){
  const v=ui.screenView.shidduchim;
  const current=data.shidduchim.filter(s=>s.status==='active');
  const ended=data.shidduchim.filter(s=>s.status==='ended');
  const ideas=data.ideas.filter(i=>i.status==='open');
  const tabs=[{value:'active',label:'Current',count:current.length},{value:'ideas',label:'Ideas',count:ideas.length},{value:'ended',label:'Ended',count:ended.length}];
  let rows='';
  if(v==='ideas'){
    rows=ideas.map(i=>{
      const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
      const st={kind:'idea',label:'My turn',icon:'bell'};
      return `<button class="warm-match-row clarity-status-card status-${st.kind}" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} ↔ ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>Suggested by ${esc(sug?.name||'you')}</p>${visualStatusPill(st)}</div><div class="warm-chevron">›</div></button>`;
    }).join('');
  }else{
    rows=(v==='active'?current:ended).map(s=>{
      const r=getCurrentRound(s),st=visualStatusForShidduch(s);
      return `<button class="warm-match-row clarity-status-card status-${st.kind}" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong><time>Round ${r?.number||1}</time></div>${visualStatusPill(st)}</div><div class="warm-chevron">›</div></button>`;
    }).join('');
  }
  const emptyTitle=v==='ideas'?'No open ideas':v==='active'?'No current shidduchim':'No ended shidduchim';
  const emptyText=v==='ideas'?'An idea is a suggested pair that has not started yet.':v==='active'?'When an idea becomes a shidduch, it will appear here.':'Ended shidduchim keep their full history.';
  return `${header('Shidduchim','Matches and ideas',{add:true})}${searchBox('Search a pair…')}${segment(tabs,v,'shidduchim')}<div class="warm-stack">${rows||empty(emptyTitle,emptyText,'add-idea')}</div>`;
};

const shidduchDetailBeforeVisualStatus=shidduchDetail;
shidduchDetail=function(sid){
  const html=shidduchDetailBeforeVisualStatus(sid);
  const s=shidduch(sid);if(!s)return html;
  const st=visualStatusForShidduch(s);
  const pill=`<div class="clarity-pair-status status-${st.kind}">${icon(st.icon)}<span>${esc(st.label)}</span></div>`;
  return html.replace(/<div class="pair-stage">[\s\S]*?<\/div>/,pill);
};

if(data)render();
