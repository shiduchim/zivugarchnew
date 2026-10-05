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

recentScreen=function(){
  const mine=data.openItems.filter(x=>x.status==='open'&&x.direction==='me').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const them=data.openItems.filter(x=>x.status==='open'&&x.direction==='them').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  let entries=[...data.entries].sort((a,b)=>new Date(b.at)-new Date(a.at));
  if(ui.search){
    const q=ui.search.toLowerCase();
    entries=entries.filter(e=>(e.text+' '+linkedAbout(e)+' '+(e.personIds||[]).map(pid=>person(pid)?.name).join(' ')).toLowerCase().includes(q));
  }

  const todoTop=mine.slice(0,3),todoMore=Math.max(0,mine.length-todoTop.length);
  const todo=todoTop.length
    ?`<div class="next-list">${todoTop.map(zmTodoCard).join('')}</div>${todoMore?`<button class="see-all-next" data-act="show-wait-me">See all ${mine.length}</button>`:''}`
    :`<div class="all-clear zm-home-clear">${icon('check')}<div><strong>${them.length?'Nothing to do right now':'All caught up'}</strong></div></div>`;

  return `${header('Recent','',{add:true})}
    ${searchBox('Find anyone or anything…')}
    <div class="warm-section-title zm-home-section-title"><h2>My to-do list</h2></div>
    ${todo}
    ${zmHearBackSummary(them)}
    <div class="warm-section-title earlier-title"><h2>History</h2><button data-act="add-activity">Add note</button></div>
    ${activityFeed(entries)}`;
};

// Use the same mental model in people lists.
statusSentenceForPerson=function(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  if(mine.length)return `${mine[0].label} · My to-do`;
  if(them.length)return `${them[0].label} · To hear back`;
  const current=shidduchimForPerson(p.id).find(s=>s.status==='active');
  if(current){const r=getCurrentRound(current);return r?.stage||'Current shidduch';}
  if(needsContactPerson(p))return 'Time to contact';
  const lc=lastContact(p.id);return lc?`Last contact ${fmtDay(lc).toLowerCase()}`:'No contact yet';
};

function zmPersonOpenStatus(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  const active=shidduchimForPerson(p.id).filter(s=>s.status==='active');
  const lc=lastContact(p.id);
  let boxes='';
  if(mine.length)boxes+=`<button class="zm-person-open-box mine" data-contact="wait" data-person-id="${esc(p.id)}"><span><b>My to-do</b><small>${esc(zmShortOpenLabel(mine))}</small></span><em>Change</em></button>`;
  if(them.length)boxes+=`<button class="zm-person-open-box theirs" data-contact="wait" data-person-id="${esc(p.id)}"><span><b>To hear back from ${esc(clarityFirstName(p))}</b><small>${esc(zmShortOpenLabel(them))}</small></span><em>Change</em></button>`;
  const shidText=active.length?`${active.length} current shidduch${active.length===1?'':'im'}`:'No current shidduchim';
  return `<div class="zm-person-status-area">${boxes}<div class="zm-person-meta"><span>Last contact: ${esc(lc?fmtDay(lc):'Not yet')}</span><i>·</i><span>${esc(shidText)}</span></div></div>`;
}

const personDetailBeforeWorkflowHome=personDetail;
personDetail=function(pid){
  const p=person(pid);
  let html=personDetailBeforeWorkflowHome(pid);
  if(!p)return html;

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

// Set the next step in ordinary language while preserving the same stored direction values.
waitingSheet=function(pid){
  const p=person(pid);
  openSheet(`<h2>What's next?</h2><p class="lead">Keep one open thing in the right place.</p><input type="hidden" id="wPerson" value="${esc(pid)}"><div class="form-grid"><div class="field"><label>Who needs to act?</label><select id="wDirection"><option value="me">I need to…</option><option value="them">I'll hear back about…</option></select></div><div class="field"><label>What is it about?</label><input id="wLabel" placeholder="For example: answer about the Cohen idea" /></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-waiting">Save</button></div>`);
};

if(data)render();
