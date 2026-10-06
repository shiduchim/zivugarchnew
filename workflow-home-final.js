'use strict';

// Final plain-language workflow for the home screen and person profiles.
// An open item lives in exactly one place: My to-do list or To hear back.

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
  const current=shidduchimForPerson(p.id).find(s=>shStatus(s)==='active');
  if(current){const r=currentRound(current);return r?.stage||'Current shidduch';}
  if(needsContactPerson(p))return 'Time to contact';
  const lc=lastContact(p.id);return lc?`Last contact ${fmtDay(lc).toLowerCase()}`:'No contact yet';
}

function zmPersonOpenStatus(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  const active=shidduchimForPerson(p.id).filter(s=>shStatus(s)==='active');
  const lc=lastContact(p.id);
  let boxes='';
  if(mine.length)boxes+=`<button class="zm-person-open-box mine" data-contact="wait" data-person-id="${esc(p.id)}"><span><b>My to-do</b><small>${esc(zmShortOpenLabel(mine))}</small></span><em>Change</em></button>`;
  if(them.length)boxes+=`<button class="zm-person-open-box theirs" data-contact="wait" data-person-id="${esc(p.id)}"><span><b>To hear back from ${esc(clarityFirstName(p))}</b><small>${esc(zmShortOpenLabel(them))}</small></span><em>Change</em></button>`;
  const meta=[`Last contact: ${lc?fmtDay(lc):'Not yet'}`];
  if(active.length)meta.push(`${active.length} current shidduch${active.length===1?'':'im'}`);
  return `<div class="zm-person-status-area">${boxes}<div class="zm-person-meta">${meta.map((x,i)=>`${i?'<i>·</i>':''}<span>${esc(x)}</span>`).join('')}</div></div>`;
}

// Set the next step in ordinary language while preserving the same stored direction values.
function waitingSheet(pid){
  const items=openForPerson(pid);
  const openList=items.length?`<div class="sheet-section zm-open-list">${items.map(x=>`<div class="setting-row"><div class="setting-copy"><b>${esc(x.label||'Next step')}</b><span>${x.direction==='me'?'My to-do':'To hear back'}</span></div><button class="option" data-act="close-open-item" data-item-id="${esc(x.id)}">${x.direction==='me'?'Done':'Heard back'}</button></div>`).join('')}</div>`:'';
  openSheet(`<h2>What's next?</h2><p class="lead">Keep one open thing in the right place.</p>${openList}<input type="hidden" id="wPerson" value="${esc(pid)}"><div class="form-grid"><div class="field"><label>Who needs to act?</label><select id="wDirection"><option value="me">I need to…</option><option value="them">I'll hear back about…</option></select></div><div class="field"><label>What is it about?</label><input id="wLabel" placeholder="For example: answer about the Cohen idea" /></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-waiting">Save</button></div>`);
}
