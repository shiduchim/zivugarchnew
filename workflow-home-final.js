'use strict';

// Final plain-language workflow for the home screen and person profiles.
// An open item lives in exactly one place: My to-do list or To hear back.

// Main-screen header rule: Settings is global, so keep the gear only on Recent.
const zmHeaderBeforeRecentOnlySettings=header;
header=function(title,sub,opts={}){
  let html=zmHeaderBeforeRecentOnlySettings(title,sub,opts);
  if(title!=='Recent'){
    html=html.replace(/<button class="warm-circle" data-act="settings" aria-label="Settings">[\s\S]*?<\/button>/,'');
  }
  return html;
};

// Keep the new workflow words everywhere, including Shadchanim filters.
const zmSegmentBeforeWorkflowWords=segment;
segment=function(items,active,scope){
  const mapped=items.map(x=>({...x,label:
    (x.label==='My turn'||x.label==='Waiting on me')?'My to-do':
    (x.label==='Their turn'||x.label==='Waiting on them')?'To hear back':x.label
  }));
  return zmSegmentBeforeWorkflowWords(mapped,active,scope);
};

function zmShortOpenLabel(items){
  if(!items?.length)return '';
  const first=String(items[0].label||'Next step').trim();
  return items.length>1?`${first} · and ${items.length-1} more`:first;
}

function zmTodoCard(x){
  const p=person(x.personId);
  const when=x.createdAt?fmtDay(x.createdAt):'';
  return `<button class="next-card zm-todo-card" ${nextTargetAttrs(x)}>
    <div class="next-avatar ${avatarTone(p||{name:'?'})}">${esc(initials(p?.name||'?'))}</div>
    <div class="next-copy"><strong>${esc(x.label||'Next step')}</strong><span>${esc(p?.name||'Someone')}</span>${when?`<small>${esc(when)}</small>`:''}</div>
    <div class="next-action">Open</div>
  </button>`;
}

function zmHearBackSummary(items){
  if(!items.length)return '';
  const unique=[];
  for(const x of items){
    const name=person(x.personId)?.name;
    if(name&&!unique.includes(name))unique.push(name);
  }
  let line='';
  if(items.length===1){
    const p=person(items[0].personId);
    line=`${p?.name||'Someone'}${items[0].label?` — ${items[0].label}`:''}`;
  }else if(unique.length){
    line=unique.slice(0,2).join(', ');
    const more=Math.max(0,unique.length-2);
    if(more)line+=` and ${more} more`;
  }else{
    line=`${items.length} things to hear back on`;
  }
  return `<div class="zm-hear-section"><div class="warm-section-title zm-home-section-title"><h2>To hear back</h2></div><button class="zm-hear-back-row" data-act="show-wait-them"><span>${esc(line)}</span><b>›</b></button></div>`;
}

// Use the same mental model in people lists.
function statusSentenceForPerson(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  if(mine.length)return `${mine[0].label} · My to-do`;
  if(them.length)return `${them[0].label} · To hear back`;
  const current=shidduchimForPerson(p.id).find(s=>s.status==='active');
  if(current){const r=getCurrentRound(current);return r?.stage||'Current shidduch';}
  if(needsContactPerson(p))return 'Time to contact';
  const lc=lastContact(p.id);return lc?`Last contact ${fmtDay(lc).toLowerCase()}`:'No contact yet';
}

function zmPersonOpenStatus(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  const active=shidduchimForPerson(p.id).filter(s=>s.status==='active');
  const lc=lastContact(p.id);
  let boxes='';
  if(mine.length)boxes+=`<button class="zm-person-open-box mine" data-contact="wait" data-person-id="${esc(p.id)}"><span><b>My to-do</b><small>${esc(zmShortOpenLabel(mine))}</small></span><em>Change</em></button>`;
  if(them.length)boxes+=`<button class="zm-person-open-box theirs" data-contact="wait" data-person-id="${esc(p.id)}"><span><b>To hear back from ${esc(clarityFirstName(p))}</b><small>${esc(zmShortOpenLabel(them))}</small></span><em>Change</em></button>`;
  const meta=[`Last contact: ${lc?fmtDay(lc):'Not yet'}`];
  if(active.length)meta.push(`${active.length} current shidduch${active.length===1?'':'im'}`);
  return `<div class="zm-person-status-area">${boxes}<div class="zm-person-meta">${meta.map((x,i)=>`${i?'<i>·</i>':''}<span>${esc(x)}</span>`).join('')}</div></div>`;
}

function zmProfileIdentity(p){
  const type=p.types?.includes('Shadchan')?'Shadchan':p.types?.includes('Girl')?'Girl':p.types?.includes('Guy')?'Guy':'Person';
  const meta=[type];
  const age=ageText(p);
  if(age&&age!==p.city&&age!==type)meta.push(age);
  if(p.city)meta.push(p.city);
  return `<div class="zm-profile-sticky-sentinel" aria-hidden="true"></div>
    <div class="zm-profile-identity">
      <button class="warm-back zm-profile-back" data-act="back" aria-label="Back">${icon('back')}</button>
      <div class="warm-person-big ${avatarTone(p)} zm-profile-avatar">${esc(initials(p.name))}</div>
      <div class="zm-profile-copy">
        <h1>${esc(p.name)}</h1>
        <div class="zm-profile-meta">${esc(meta.join(' · '))}</div>
        ${p.occupation?`<div class="zm-profile-occupation">${esc(p.occupation)}</div>`:''}
      </div>
      <button class="warm-more zm-profile-more" data-act="detail-menu" aria-label="More">⋯</button>
    </div>`;
}

const personDetailBeforeWorkflowHome=personDetail;
personDetail=function(pid){
  const p=person(pid);
  let html=personDetailBeforeWorkflowHome(pid);
  if(!p)return html;

  // Compact identity area: one avatar, one name, one concise metadata block.
  html=html.replace(/<div class="warm-detail-title">[\s\S]*?(?=<div class="warm-metric-grid">)/,zmProfileIdentity(p));

  // Replace the three equal metric cards with status only when there is actually something open.
  html=html.replace(/<div class="warm-metric-grid">[\s\S]*?(?=<div class="warm-contact-row">)/,zmPersonOpenStatus(p));

  // This is an action, not a waiting status.
  html=html.replace(/<button class="warm-contact wait"[^>]*>[\s\S]*?<\/button>/,`<button class="warm-contact wait zm-whats-next" data-contact="wait" data-person-id="${esc(p.id)}"><span>${icon('check')}</span><small>What's next?</small></button>`);

  // Details contains stable facts only. Live workflow/status already lives above the tabs.
  if(p.types?.includes('Shadchan')&&ui.detailTab==='details'){
    html=html.replace(/<div><span>Their turn<\/span>[\s\S]*?<\/div>/,'');
    html=html.replace(/<div><span>My turn<\/span>[\s\S]*?<\/div>/,'');
    html=html.replace(/<div><span>Last contact<\/span>[\s\S]*?<\/div>/,'');
    html=html.replaceAll('No source recorded','Not added yet');
  }
  return html;
};

// Collapse the compact profile identity further once the user scrolls past its start.
let zmStickyRaf=0;
function zmSyncProfileSticky(){
  zmStickyRaf=0;
  const bar=document.querySelector('.zm-profile-identity');
  const marker=document.querySelector('.zm-profile-sticky-sentinel');
  if(!bar||!marker)return;
  bar.classList.toggle('is-stuck',marker.getBoundingClientRect().top<0);
}
function zmQueueProfileSticky(){
  if(zmStickyRaf)return;
  zmStickyRaf=requestAnimationFrame(zmSyncProfileSticky);
}
document.addEventListener('scroll',zmQueueProfileSticky,true);
window.addEventListener('resize',zmQueueProfileSticky);

// Set the next step in ordinary language while preserving the same stored direction values.
waitingSheet=function(pid){
  const items=openForPerson(pid);
  const openList=items.length?`<div class="sheet-section zm-open-list">${items.map(x=>`<div class="setting-row"><div class="setting-copy"><b>${esc(x.label||'Next step')}</b><span>${x.direction==='me'?'My to-do':'To hear back'}</span></div><button class="option" data-act="close-open-item" data-item-id="${esc(x.id)}">${x.direction==='me'?'Done':'Heard back'}</button></div>`).join('')}</div>`:'';
  openSheet(`<h2>What's next?</h2><p class="lead">Keep one open thing in the right place.</p>${openList}<input type="hidden" id="wPerson" value="${esc(pid)}"><div class="form-grid"><div class="field"><label>Who needs to act?</label><select id="wDirection"><option value="me">I need to…</option><option value="them">I'll hear back about…</option></select></div><div class="field"><label>What is it about?</label><input id="wLabel" placeholder="For example: answer about the Cohen idea" /></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-waiting">Save</button></div>`);
};

if(data)render();
