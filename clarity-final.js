'use strict';

// Final plain-language pass. This changes words and status presentation only.
// Data, navigation, workflows and skin structure stay unchanged.

function clarityFirstName(p){return String(p?.name||'').trim().split(/\s+/)[0]||'them';}
function clarityAnswer(v){
  const s=String(v||'').trim();
  if(!s)return '—';
  const map={yes:'Yes',no:'No',thinking:'Thinking',active:'Current',ended:'Ended',open:'Open',converted:'Started'};
  return map[s.toLowerCase()]||s.charAt(0).toUpperCase()+s.slice(1);
}
function clarityShidduchStatus(s){
  if(!s)return '';
  if(s.status==='ended')return 'Ended';
  const r=getCurrentRound(s);
  const theirs=openForShidduch(s.id,'them');
  if(theirs.length){
    const p=person(theirs[0].personId);
    return p?`Waiting for ${clarityFirstName(p)}`:'Their turn';
  }
  const mine=openForShidduch(s.id,'me');
  if(mine.length)return 'My turn';
  const stage=String(r?.stage||'').trim();
  if(stage&&stage.toLowerCase()!=='active'&&stage.toLowerCase()!=='waiting for her side')return stage;
  if(String(r?.girlStatus||'').toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.girlId))}`;
  if(String(r?.guyStatus||'').toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.guyId))}`;
  return 'Current';
}

// Person rows use the same turn language taught on Recent.
statusSentenceForPerson=function(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  if(mine.length)return `${mine[0].label} · My turn`;
  if(them.length)return `${them[0].label} · Waiting for ${clarityFirstName(p)}`;
  const current=shidduchimForPerson(p.id).find(s=>s.status==='active');
  if(current){const r=getCurrentRound(current);return r?.stage||'Current shidduch';}
  if(needsContactPerson(p))return 'Time to contact';
  const lc=lastContact(p.id);return lc?`Last contact ${fmtDay(lc).toLowerCase()}`:'No contact yet';
};

const segmentBeforeClarity=segment;
segment=function(items,active,scope){
  const mapped=items.map(x=>({...x,label:x.label==='Needs contact'?'Time to contact':x.label}));
  return segmentBeforeClarity(mapped,active,scope);
};

// Shidduchim: one clear status per current/ended card instead of two overlapping statuses.
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
      return `<button class="warm-match-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} ↔ ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>Suggested by ${esc(sug?.name||'you')}</p><span class="warm-pill blue">My turn</span></div><div class="warm-chevron">›</div></button>`;
    }).join('');
  }else{
    rows=(v==='active'?current:ended).map(s=>{
      const r=getCurrentRound(s),status=clarityShidduchStatus(s);
      return `<button class="warm-match-row" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong><time>Round ${r?.number||1}</time></div><p>${esc(status)}</p></div><div class="warm-chevron">›</div></button>`;
    }).join('');
  }
  const emptyTitle=v==='ideas'?'No open ideas':v==='active'?'No current shidduchim':'No ended shidduchim';
  const emptyText=v==='ideas'?'An idea is a suggested pair that has not started yet.':v==='active'?'When an idea becomes a shidduch, it will appear here.':'Ended shidduchim keep their full history.';
  return `${header('Shidduchim','Matches and ideas',{add:true})}${searchBox('Search a pair…')}${segment(tabs,v,'shidduchim')}<div class="warm-stack">${rows||empty(emptyTitle,emptyText,'add-idea')}</div>`;
};

// Person pages use the same wording as Recent and avoid ambiguous labels.
const personDetailBeforeClarity=personDetail;
personDetail=function(pid){
  return personDetailBeforeClarity(pid)
    .replaceAll('Waiting on them','Their turn')
    .replaceAll('Waiting on me','My turn')
    .replaceAll('Active shidduchim','Current shidduchim')
    .replaceAll('Relationship and shidduch contact','Shadchan details and history')
    .replaceAll('How I know her','How I know them')
    .replaceAll('<small>Waiting</small>','<small>Set turn</small>');
};

// Shidduch detail: use names, normal capitalization and one understandable current status.
shidduchDetail=function(sid){
  const s=shidduch(sid);if(!s)return shidduchimScreen();
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId),them=openForShidduch(s.id,'them'),mine=openForShidduch(s.id,'me');
  if(!['overview','dates','history','people'].includes(ui.detailTab))ui.detailTab='overview';
  let content='';
  if(ui.detailTab==='dates'){
    const ds=data.dates.filter(d=>d.roundId===r?.id).sort((a,b)=>a.number-b.number);
    content=ds.length?`<div class="list-card">${ds.map(d=>`<button class="list-row" data-date="${d.id}"><div class="activity-icon lav">${icon('calendar')}</div><div class="row-main"><div class="row-name">Date ${d.number}</div><div class="row-line">${fmtDate(d.when)} · ${esc(clarityAnswer(d.state))}</div><div class="row-status">${esc(clarityFirstName(g))}: ${esc(clarityAnswer(d.guyFeedback))} · ${esc(clarityFirstName(gl))}: ${esc(clarityAnswer(d.girlFeedback))}</div></div><div class="row-end">›</div></button>`).join('')}</div>`:empty('No dates yet','Dates and feedback will stay together here.');
  }else if(ui.detailTab==='history'){
    content=timelineHtml(entriesForAbout('shidduch',s.id));
  }else if(ui.detailTab==='people'){
    content=`<div class="list-card">${[g,gl,...(s.shadchanIds||[]).map(person)].filter(Boolean).map(p=>personRow(p)).join('')}</div>`;
  }else{
    const next=mine[0]?.label||them[0]?.label||(r?.stage==='Dating'?'Dating':'Nothing to do right now');
    content=`<div class="info-card"><div class="info-row"><div class="info-label">${esc(clarityFirstName(g))}'s answer</div><div class="info-value">${esc(clarityAnswer(r?.guyStatus))}</div><span></span></div><div class="info-row"><div class="info-label">${esc(clarityFirstName(gl))}'s answer</div><div class="info-value">${esc(clarityAnswer(r?.girlStatus))}</div><span></span></div><div class="info-row"><div class="info-label">My turn</div><div class="info-value">${esc(mine.map(x=>x.label).join(', ')||'Nothing')}</div><span></span></div><div class="info-row"><div class="info-label">Their turn</div><div class="info-value">${esc(them.map(x=>x.label).join(', ')||'Nothing')}</div><span></span></div><div class="info-row"><div class="info-label">Next step</div><div class="info-value">${esc(next)}</div><span></span></div></div>`;
  }
  const status=clarityShidduchStatus(s);
  return `${detailHeader(shidduchTitle(s),`Round ${r?.number||1}`)}<div class="pair-hero"><div class="pair-people"><div class="person-avatar">${esc(initials(g?.name))}</div><div class="person-avatar">${esc(initials(gl?.name))}</div></div><div class="pair-title">${esc(shidduchTitle(s))}</div><div class="pair-stage">${esc(status)}</div></div><div class="detail-summary"><div class="detail-tile sage"><span>${esc(clarityFirstName(g))}</span><strong>${esc(clarityAnswer(r?.guyStatus))}</strong></div><div class="detail-tile amber"><span>${esc(clarityFirstName(gl))}</span><strong>${esc(clarityAnswer(r?.girlStatus))}</strong></div><div class="detail-tile blue"><span>Round</span><strong>${r?.number||1}</strong></div></div><div class="tabbar">${[['overview','Overview'],['dates','Dates'],['history','History'],['people','People']].map(([x,l])=>`<button class="tab-btn ${ui.detailTab===x?'active':''}" data-detail-tab="${x}">${l}</button>`).join('')}</div>${content}`;
};

// Waiting is really a turn. Ask that directly.
waitingSheet=function(pid){
  openSheet(`<h2>Whose turn?</h2><p class="lead">Choose who needs to do something next.</p><input type="hidden" id="wPerson" value="${esc(pid)}"><div class="form-grid"><div class="field"><label>Turn</label><select id="wDirection"><option value="me">My turn</option><option value="them">Their turn</option></select></div><div class="field"><label>What needs to happen?</label><input id="wLabel" placeholder="For example: Leah's feedback" /></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-waiting">Save</button></div>`);
};

// Clearer add flows without changing fields or actions.
addPersonSheet=function(typePreset){
  const types=['Guy','Girl','Shadchan','Reference'];
  openSheet(`<h2>Add person</h2><p class="lead">Add their details. Choose every role that fits.</p><div class="form-grid"><div class="field"><label>Name</label><input id="fName" placeholder="Full name" /></div><div class="field"><label>Roles</label><div class="sheet-section" style="padding:6px 12px">${types.map(t=>`<label class="checkbox-row"><input type="checkbox" name="fType" value="${t}" ${typePreset===t?'checked':''}> ${t}</label>`).join('')}</div></div><div class="field"><label>City</label><input id="fCity" /></div><div class="field"><label>Age</label><input id="fAge" inputmode="numeric" /></div><div class="field"><label>Occupation</label><input id="fOccupation" /></div><div class="field"><label>Phone</label><input id="fPhone" type="tel" /></div><div class="field"><label>Email</label><input id="fEmail" type="email" /></div><div class="field"><label>Profile text or notes</label><textarea id="fProfile" placeholder="Paste profile text or a short note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-person">Save person</button></div>`);
};

addActivitySheet=function(pid=''){
  const peopleOptions=data.people.filter(p=>!p.isMe).sort((a,b)=>a.name.localeCompare(b.name));
  openSheet(`<h2>Add activity</h2><p class="lead">Add something that happened outside the app. It will also appear in this person's History.</p><div class="form-grid"><div class="field"><label>Person</label><select id="aPerson"><option value="">Choose…</option>${peopleOptions.map(p=>`<option value="${p.id}" ${pid===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Type</label><select id="aType"><option value="note">Note</option><option value="call">Call</option><option value="message">Message</option><option value="profile">Profile</option><option value="referral">Referral</option></select></div><div class="field"><label>What happened?</label><textarea id="aText" placeholder="Short note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-activity">Save</button></div>`);
};

addSourceSheet=function(){
  openSheet(`<h2>Add source</h2><p class="lead">A source is where these names came from.</p><div class="form-grid"><div class="field"><label>Name</label><input id="sName" placeholder="For example: Rivka's shadchanim list" /></div><div class="field"><label>Type</label><select id="sKind"><option value="list">List</option><option value="event">Event</option><option value="site">Website</option><option value="referral">Referral</option></select></div><div class="field"><label>Contact again after</label><select id="sDays"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-source">Save source</button></div>`);
};

universalAddSheet=function(){
  openSheet(`<h2>Add</h2><p class="lead">What do you want to add?</p><div class="quick-add-grid"><button id="qaIdea"><span>♡</span><b>Idea</b><small>Someone suggested a match</small></button><button id="qaGuy"><span>G</span><b>Guy</b><small>Add a person</small></button><button id="qaShad"><span>S</span><b>Shadchan</b><small>Add to your network</small></button><button id="qaGirl"><span>G</span><b>Girl</b><small>Add a person</small></button><button id="qaNote"><span>✎</span><b>Note or call</b><small>Add something that happened</small></button></div><button class="ghost-btn full" data-act="close-sheet">Cancel</button>`);
  const go=(sel,fn)=>document.querySelector(sel)?.addEventListener('click',()=>{closeSheet();fn();});
  go('#qaIdea',()=>addIdeaSheet());go('#qaGuy',()=>addPersonSheet('Guy'));go('#qaShad',()=>addPersonSheet('Shadchan'));go('#qaGirl',()=>addPersonSheet('Girl'));go('#qaNote',()=>addActivitySheet());
};

// Secondary filters use ordinary language and no visible plus signs.
filtersSheet=function(){
  if(ui.screen==='shadchanim'){
    openSheet(`<h2>Shadchanim view</h2><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>No contact for 60 days or more</b><span>Show people you have not contacted recently</span></div><button class="option" data-act="show-dormant">Show</button></div><div class="setting-row"><div class="setting-copy"><b>Sort</b><span>How to order the list</span></div><div class="option-group"><button class="option active">Last contact</button><button class="option">A–Z</button></div></div><div class="setting-row"><div class="setting-copy"><b>Group</b><span>How to group the list</span></div><div class="option-group"><button class="option active">None</button><button class="option">Source</button></div></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);
  }else settingsSheet();
};

// Improve settings copy after the existing settings UI is built.
const settingsSheetBeforeClarity=settingsSheet;
settingsSheet=function(){
  settingsSheetBeforeClarity();
  overlay.querySelectorAll('.settings-heading').forEach(x=>{if(x.textContent.trim()==='Skin')x.textContent='Style';});
  const web=overlay.querySelector('.layout-choice[data-value="web"]');
  if(web){for(const n of web.childNodes){if(n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim()){n.nodeValue='Desktop';break;}}const sm=web.querySelector('small');if(sm)sm.textContent='Desktop layout';}
  overlay.querySelectorAll('.setting-copy').forEach(row=>{
    const b=row.querySelector('b'),s=row.querySelector('span');if(!b||!s)return;
    if(b.textContent.trim()==='Icons and initials')s.textContent='Icon and initials size';
    if(b.textContent.trim()==='Mode')s.textContent='Single = for yourself. Shadchan = matching others.';
  });
};

// Source wording: direct action language is easier than CRM terminology.
const sourceDetailBeforeClarity=sourceDetail;
sourceDetail=function(sid){return sourceDetailBeforeClarity(sid).replaceAll('Follow-up','Contact again');};

// New waiting/history entries use the same language users see on screen.
saveWaiting=async function(){
  const pid=document.getElementById('wPerson')?.value,direction=document.getElementById('wDirection')?.value,label=document.getElementById('wLabel')?.value.trim();
  if(!pid||!label)return showToast('Say what needs to happen');
  data.openItems.push({id:id('oi'),direction,personId:pid,aboutType:'person',aboutId:pid,label,createdAt:iso(),status:'open'});
  const turn=direction==='them'?'Their turn':'My turn';
  data.entries.push({id:id('e'),at:iso(),type:'status',channel:'App',direction:'none',personIds:[pid],aboutType:'person',aboutId:pid,text:`${turn}: ${label}`,result:turn});
  await save();closeSheet();render();showToast('Turn saved');
};

logProfileSend=async function(pid){
  const p=person(pid);data.entries.push({id:id('e'),at:iso(),type:'profile',channel:'WhatsApp',direction:'out',fromPersonId:me().id,toPersonId:pid,personIds:[me().id,pid],aboutType:'person',aboutId:me().id,text:`Sent my profile v${me().profileVersion||1} to ${p.name}.`,profileVersion:me().profileVersion||1,result:''});
  await save();render();showToast('Profile marked as sent');
};

if(data)render();
