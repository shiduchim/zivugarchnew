'use strict';

// Final clarity pass for a shidduch detail page.
// The page shows only information that matters for the CURRENT stage.
// Old answer/status facts stay preserved in data/history; they are simply not repeated everywhere.

function zmCleanStatusWord(value){
  const v=String(value||'').trim().toLowerCase();
  if(v==='yes'||v==='positive')return 'Yes';
  if(v==='no'||v==='negative')return 'No';
  if(v==='thinking')return 'Thinking';
  if(v==='unknown'||!v)return 'Not answered';
  return v.charAt(0).toUpperCase()+v.slice(1);
}

function zmRoundDates(r){
  return data.dates
    .filter(d=>d.roundId===r?.id&&!/cancel/i.test(String(d.state||'')))
    .sort((a,b)=>(a.number||0)-(b.number||0));
}

function zmCleanNextStep(s){
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId);
  const mine=openForShidduch(s.id,'me'),theirs=openForShidduch(s.id,'them');
  if(mine[0]?.label)return mine[0].label;
  if(theirs[0]?.label)return theirs[0].label;

  const st=zmStageForShidduch(s);
  const gs=String(r?.guyStatus||'').toLowerCase();
  const gls=String(r?.girlStatus||'').toLowerCase();
  if(st.index<=1){
    if(!['yes','no'].includes(gs))return `${g?.name||'Guy'}'s answer`;
    if(!['yes','no'].includes(gls))return `${gl?.name||'Girl'}'s answer`;
    if(gs==='yes'&&gls==='yes')return 'Plan the first date';
    return 'No next step';
  }

  if(st.index>=2&&st.index<=9){
    const ds=zmRoundDates(r),last=ds[ds.length-1];
    if(last){
      const gf=String(last.guyFeedback||'').toLowerCase();
      const glf=String(last.girlFeedback||'').toLowerCase();
      if(!gf||gf==='thinking'||gf==='unknown')return `${g?.name||'Guy'}'s feedback`;
      if(!glf||glf==='thinking'||glf==='unknown')return `${gl?.name||'Girl'}'s feedback`;
      if(last.number<8)return `Plan Date ${Number(last.number||1)+1}`;
      return 'Decide the next step';
    }
    return 'Plan Date 1';
  }
  if(st.index===10)return 'Married';
  return 'No next step';
}

// A name label in the overview opens that person's profile (Back returns to this shidduch).
function zmPersonLabel(p,label){return p?`<button type="button" class="zm-person-text-link" data-zm-person="${esc(p.id)}" aria-label="Open ${esc(p.name)} profile">${esc(label)}</button>`:`<span>${esc(label)}</span>`;}

// Header: each person on a centred row of their own, each name opening that profile.
function zmPairHeader(s,r,g,gl){return `<div class="detail-head zm-pair-head">
    <div class="zm-pair-appmark"><span class="wordmark">ZivugMatch</span><span class="bh">ב״ה</span></div>
    <div class="zm-pair-head-row">
      <button class="back-btn" data-act="back" aria-label="Back">${icon('back')}</button>
      <div class="zm-pair-title-wrap">
        <div class="zm-pair-title" aria-label="${esc(g.name)} and ${esc(gl.name)}">
          <button type="button" class="zm-pair-name guy" data-zm-person="${esc(g.id)}" aria-label="Open ${esc(g.name)} profile">${esc(g.name)}</button>
          <button type="button" class="zm-pair-name girl" data-zm-person="${esc(gl.id)}" aria-label="Open ${esc(gl.name)} profile">${esc(gl.name)}</button>
        </div>
        <div class="detail-meta">Round ${esc(r?.number||1)}</div>
      </div>
      ${shidduchMenuActions(s).length?'<button class="more-btn" data-act="detail-menu" aria-label="More">⋯</button>':'<button class="more-btn" aria-hidden="true" tabindex="-1" style="visibility:hidden">⋯</button>'}
    </div>
  </div>`;}

function zmOverviewBeforeDating(s){
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId);
  return `<div class="zm-clean-card"><div class="zm-clean-heading">Answers</div><div class="zm-clean-row">${zmPersonLabel(g,g?.isMe?'My answer':`${g?.name||'Guy'}'s answer`)}<strong>${esc(zmCleanStatusWord(r?.guyStatus))}</strong></div><div class="zm-clean-row">${zmPersonLabel(gl,`${gl?.name||'Girl'}'s answer`)}<strong>${esc(zmCleanStatusWord(r?.girlStatus))}</strong></div><div class="zm-clean-row next"><span>Next step</span><strong>${esc(zmCleanNextStep(s))}</strong></div></div>`;
}

function zmOverviewDating(s){
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId),ds=zmRoundDates(r),last=ds[ds.length-1];
  if(!last){
    return `<div class="zm-clean-card"><div class="zm-clean-heading">Dating</div><div class="zm-clean-row next"><span>Next step</span><strong>${esc(zmCleanNextStep(s))}</strong></div></div>`;
  }
  return `<div class="zm-clean-card"><div class="zm-clean-heading">Latest date</div><div class="zm-clean-row"><span>Date ${esc(last.number||'')}</span><strong>${esc(fmtDate(last.when))}</strong></div><div class="zm-clean-row">${zmPersonLabel(g,g?.isMe?'My feedback':`${g?.name||'Guy'}'s feedback`)}<strong>${esc(zmCleanStatusWord(last.guyFeedback))}</strong></div><div class="zm-clean-row">${zmPersonLabel(gl,`${gl?.name||'Girl'}'s feedback`)}<strong>${esc(zmCleanStatusWord(last.girlFeedback))}</strong></div><div class="zm-clean-row next"><span>Next step</span><strong>${esc(zmCleanNextStep(s))}</strong></div></div>`;
}

function zmOverviewEnded(s){
  const st=zmStageForShidduch(s);
  return `<div class="zm-clean-card ended"><div class="zm-clean-heading">Ended</div><div class="zm-clean-row"><span>Ended at</span><strong>${esc(st.label)}</strong></div>${s.endedAt?`<div class="zm-clean-row"><span>Date ended</span><strong>${esc(fmtDate(s.endedAt))}</strong></div>`:''}${s.endReason?`<div class="zm-clean-row"><span>Why it ended</span><strong>${esc(s.endReason)}</strong></div>`:''}</div>`;
}

function zmCleanOverview(s){
  if(s.status==='ended')return zmOverviewEnded(s);
  const st=zmStageForShidduch(s);
  if(st.index<=1)return zmOverviewBeforeDating(s);
  if(st.index>=2&&st.index<=9)return zmOverviewDating(s);
  return `<div class="zm-clean-card"><div class="zm-clean-heading">Marriage</div><div class="zm-clean-row"><span>Status</span><strong>Married</strong></div></div>`;
}

function zmCleanDates(s){
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId),ds=zmRoundDates(r);
  return ds.length?`<div class="warm-stack zm-date-stack">${ds.slice().reverse().map(d=>`<button class="warm-person-row zm-date-row" data-date="${d.id}"><div class="warm-activity-icon lav">${icon('calendar')}</div><div class="warm-person-main"><div class="warm-person-top"><strong>Date ${esc(d.number)}</strong><time>${esc(fmtDate(d.when))}</time></div><div class="warm-person-line">${esc(d.state||'')}</div><div class="warm-person-status">${esc(g?.isMe?'My':g?.name||'Guy')}: ${esc(zmCleanStatusWord(d.guyFeedback))} · ${esc(gl?.name||'Girl')}: ${esc(zmCleanStatusWord(d.girlFeedback))}</div></div><div class="warm-chevron">›</div></button>`).join('')}</div>`:empty('No dates yet','When dating starts, each date and its feedback will appear here.');
}

function zmRoleRow(p,role){
  return `<button class="warm-person-row zm-role-row" data-person="${p.id}"><div class="warm-avatar ${avatarTone(p)}">${esc(initials(p.name))}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(p.name)}</strong></div><div class="warm-person-line">${esc(ageText(p)||p.city||'')}</div><span class="zm-role-chip ${role.toLowerCase()}">${esc(role)}</span></div><div class="warm-chevron">›</div></button>`;
}

function zmCleanPeople(s){
  const g=person(s.guyId),gl=person(s.girlId),shads=(s.shadchanIds||[]).map(person).filter(Boolean);
  return `<div class="zm-role-section"><div class="zm-clean-heading">The couple</div><div class="warm-stack">${[g,gl].filter(Boolean).map(p=>zmRoleRow(p,p.id===s.guyId?'Guy':'Girl')).join('')}</div></div>${shads.length?`<div class="zm-role-section"><div class="zm-clean-heading">Shadchanim</div><div class="warm-stack">${shads.map(p=>zmRoleRow(p,'Shadchan')).join('')}</div></div>`:''}`;
}

// This is the final shidduch-detail renderer. It intentionally removes the old repeated
// answer cards and repeated pair title inside the hero.
function shidduchDetail(sid){
  const s=shidduch(sid);if(!s)return shidduchimScreen();
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId);
  if(!['overview','dates','history','people'].includes(ui.detailTab))ui.detailTab='overview';

  let content='';
  if(ui.detailTab==='dates')content=zmCleanDates(s);
  else if(ui.detailTab==='history')content=timelineHtml(entriesForAbout('shidduch',s.id));
  else if(ui.detailTab==='people')content=zmCleanPeople(s);
  else content=zmCleanOverview(s);

  const tabs=[['overview','Overview'],['dates','Dates'],['history','History'],['people','People']];
  const endAction=(ui.detailTab==='overview'&&s.status!=='ended'&&zmStageForShidduch(s).index!==10)?`<div class="zm-end-action"><button class="ghost-btn" data-act="end-shidduch" data-shidduch-id="${esc(s.id)}">End shidduch</button></div>`:'';

  const top=g&&gl?`<div class="detail-shell">${zmPairHeader(s,r,g,gl)}<div class="zm-clean-hero">${zmStageBar(s,true)}</div>`:`${detailHeader(shidduchTitle(s),`Round ${r?.number||1}`)}<div class="zm-clean-hero"><div class="pair-people"><div class="person-avatar">${esc(initials(g?.name))}</div><div class="person-avatar">${esc(initials(gl?.name))}</div></div>${zmStageBar(s,true)}</div>`;
  return `${top}<div class="tabbar">${tabs.map(([v,l])=>`<button class="tab-btn ${ui.detailTab===v?'active':''}" data-detail-tab="${v}">${l}</button>`).join('')}</div>${content}${endAction}</div>`;
}

// Names on a shidduch page open that person's profile; Back from that profile returns to the shidduch.
// Back returns to the shidduch only from the very person opened from it; any other navigation forgets it.
let zmReturnToShidduch=null;

function openPersonFromShidduch(pid){
  const p=person(pid);
  if(!p)return;
  zmReturnToShidduch=ui.detail?.type==='shidduch'?{detail:{...ui.detail},detailTab:ui.detailTab,personId:pid}:null;
  ui.detail={type:'person',id:pid};
  ui.detailTab=p.types?.includes('Shadchan')?'details':'profile';
  render();
  window.scrollTo(0,0);
}

// Runs first for every click. Returns true when the click was Back to the shidduch.
function followShidduchReturn(e){
  if(!zmReturnToShidduch)return false;
  const back=e.target.closest('button[data-act="back"]');
  if(back&&ui.detail?.type==='person'&&ui.detail.id===zmReturnToShidduch.personId){
    ui.detail=zmReturnToShidduch.detail;
    ui.detailTab=zmReturnToShidduch.detailTab;
    zmReturnToShidduch=null;
    render();
    window.scrollTo(0,0);
    return true;
  }
  if(e.target.closest('[data-screen],[data-person],[data-shidduch],[data-source],[data-entry],[data-act="back"]'))zmReturnToShidduch=null;
  return false;
}
