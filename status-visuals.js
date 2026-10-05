'use strict';

// Shidduch stage visualization. Stage and turn are intentionally separate:
// the bar shows WHERE the shidduch is, while the small note shows WHO acts next.
const ZM_STAGE_LABELS=['Profile sent','References','Date 1','Date 2','Date 3','Date 4','Date 5','Date 6','Date 7','Date 8','Marriage'];

function zmStageForShidduch(s){
  if(!s)return {index:0,label:ZM_STAGE_LABELS[0]};
  const r=getCurrentRound(s);
  const raw=String(r?.stage||'').toLowerCase();

  if(/married|marriage/.test(raw))return {index:10,label:ZM_STAGE_LABELS[10]};

  const ds=data.dates
    .filter(d=>d.roundId===r?.id && !/cancel/i.test(String(d.state||'')))
    .sort((a,b)=>(a.number||0)-(b.number||0));
  if(ds.length){
    const n=Math.min(8,Math.max(1,ds.length));
    return {index:n+1,label:`Date ${n}`};
  }

  const explicitDate=raw.match(/date\s*([1-8])/);
  if(explicitDate){
    const n=Number(explicitDate[1]);
    return {index:n+1,label:`Date ${n}`};
  }

  if(/reference|checking/.test(raw))return {index:1,label:ZM_STAGE_LABELS[1]};
  if(/dating/.test(raw))return {index:2,label:ZM_STAGE_LABELS[2]};

  return {index:0,label:ZM_STAGE_LABELS[0]};
}

function zmTurnForShidduch(s){
  if(!s||s.status==='ended')return s?.status==='ended'?'Ended':'';
  const mine=openForShidduch(s.id,'me');
  if(mine.length)return 'My turn';
  const theirs=openForShidduch(s.id,'them');
  if(theirs.length){
    const p=person(theirs[0].personId);
    return p?`Waiting for ${clarityFirstName(p)}`:'Their turn';
  }
  const r=getCurrentRound(s);
  if(String(r?.girlStatus||'').toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.girlId))}`;
  if(String(r?.guyStatus||'').toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.guyId))}`;
  return '';
}

function zmStageBar(s,detail=false){
  const st=zmStageForShidduch(s),turn=zmTurnForShidduch(s);
  const segs=ZM_STAGE_LABELS.map((label,i)=>`<i class="zm-stage-seg s${i} ${i<st.index?'done':''} ${i===st.index?'now':''}" title="${esc(label)}"></i>`).join('');
  return `<div class="zm-stage ${detail?'detail':''}" aria-label="Stage: ${esc(st.label)}${turn?`. ${esc(turn)}`:''}"><div class="zm-stage-meta"><strong>${esc(st.label)}</strong>${turn?`<span>${esc(turn)}</span>`:''}</div><div class="zm-stage-track">${segs}</div></div>`;
}

const shidduchDetailBeforeStageBar=shidduchDetail;
shidduchDetail=function(sid){
  const html=shidduchDetailBeforeStageBar(sid);
  const s=shidduch(sid);if(!s)return html;
  return html.replace(/<div class="pair-stage">[\s\S]*?<\/div>/,zmStageBar(s,true));
};

if(data)render();
