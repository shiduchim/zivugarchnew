'use strict';

// Whose turn it is on a shidduch. Kept separate from the stage bar: the bar shows WHERE the shidduch is,
// the turn shows WHO acts next.
function zmTurnForShidduch(s){
  if(!s||shStatus(s)==='ended')return s&&shStatus(s)==='ended'?'Ended':'';
  if(shPaused(s))return 'Paused';
  const mine=openForShidduch(s.id,'me');
  if(mine.length)return 'My turn';
  const theirs=openForShidduch(s.id,'them');
  if(theirs.length){
    const p=person(theirs[0].personId);
    return p?`Waiting for ${clarityFirstName(p)}`:'Their turn';
  }
  const r=currentRound(s);
  if(String(roundAnswer(r,'girl')).toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.girlId))}`;
  if(String(roundAnswer(r,'guy')).toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.guyId))}`;
  return '';
}

// Stage-bar correction: a side that is still thinking keeps the shidduch in References.
// A recorded date must not visually advance the relationship until both sides have agreed.
function zmStageForShidduch(s){
  if(!s)return {index:0,label:ZM_FLOW_STAGE_LABELS[0]};
  const r=currentRound(s);

  if(shStatus(s)==='ended'){
    const savedIndex=Number.isInteger(r?.endedStageIndex)?r.endedStageIndex:zmFlowStageIndexFromLabel(r?.endedStage);
    if(savedIndex!=null)return {index:savedIndex,label:ZM_FLOW_STAGE_LABELS[savedIndex]||r?.endedStage||'Profile sent'};
  }

  const raw=String(roundStageLabel(r)).trim().toLowerCase();
  const guyStatus=String(roundAnswer(r,'guy')).trim().toLowerCase();
  const girlStatus=String(roundAnswer(r,'girl')).trim().toLowerCase();

  if(/married|marriage/.test(raw))return {index:10,label:'Marriage'};

  // If either side is still deciding, do not advance into Dating/Date 1 yet.
  // If the round is explicitly still at Profile sent, keep it there; otherwise References is the checking stage.
  if(guyStatus==='thinking'||girlStatus==='thinking'){
    const explicitWhileThinking=zmFlowStageIndexFromLabel(raw);
    if(explicitWhileThinking===0)return {index:0,label:'Profile sent'};
    return {index:1,label:'References'};
  }

  // Once both sides are past the decision point, actual dates can advance the bar.
  const ds=roundDates(r);
  if(ds.length){
    const n=Math.min(8,Math.max(1,Math.max(...ds.map(d=>Number(d.number)||0))||ds.length));
    return {index:n+1,label:`Date ${n}`};
  }

  const explicit=zmFlowStageIndexFromLabel(raw);
  if(explicit!=null)return {index:explicit,label:ZM_FLOW_STAGE_LABELS[explicit]};
  if(/dating/.test(raw))return {index:2,label:'Date 1'};
  if(/waiting|thinking|checking/.test(raw))return {index:1,label:'References'};
  return {index:0,label:'Profile sent'};
}

// Put the stage name directly above the selected point in the bar.
// Compact list cards show only WHERE the shidduch is. Whose turn is shown only on the detail page.
function zmStageBar(s,detail=false){
  const st=zmStageForShidduch(s);
  const ended=!!s&&shStatus(s)==='ended',r=currentRound(s);
  const turn=detail?zmTurnForShidduch(s):'';
  const stageColor=ended?'#8f97a2':zmFlowStageColor(st.index);
  const segs=ZM_FLOW_STAGE_LABELS.map((label,i)=>`<i class="zm-stage-seg s${i} ${i<st.index?'done':''} ${i===st.index?'now':''}" title="${esc(label)}"></i>`).join('');
  const pos=((st.index+.5)/ZM_FLOW_STAGE_LABELS.length*100).toFixed(2);
  const edge=st.index===0?' edge-start':st.index===ZM_FLOW_STAGE_LABELS.length-1?' edge-end':'';
  const label=ended?st.label:st.label;
  const detailNote=detail?(ended?(r?.endReason?`Why: ${r.endReason}`:(r?.endedAt?fmtDate(r.endedAt):'Ended')):turn):'';
  return `<div class="zm-stage ${detail?'detail':''} ${ended?'ended':''}" style="--zm-stage-color:${stageColor}" aria-label="${ended?'Ended at ':''}${esc(st.label)}${detailNote?`. ${esc(detailNote)}`:''}"><div class="zm-stage-track-wrap"><span class="zm-stage-floating${edge}" style="left:${pos}%">${esc(label)}</span><div class="zm-stage-track">${segs}</div></div>${detailNote?`<div class="zm-stage-note">${esc(detailNote)}</div>`:''}</div>`;
}
