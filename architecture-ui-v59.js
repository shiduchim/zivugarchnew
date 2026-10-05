'use strict';

// ZivugMatch architecture UI v59.
// Connects the existing polished screens to the v59 one-ledger engine.

let zmArchPendingPerson=null;
let zmArchPendingMatches=[];
let zmArchIdeaNoId=null;

openForPerson=function(pid,dir){const p=zmArchResolvedPerson(pid),rid=p?.id||pid;return data.openItems.filter(x=>x.status==='open'&&x.personId===rid&&(!dir||x.direction===dir));};
openForShidduch=function(sid,dir){const s=zmArchResolvedShidduch(sid),rid=s?.id||sid;return data.openItems.filter(x=>x.status==='open'&&x.aboutType==='shidduch'&&x.aboutId===rid&&(!dir||x.direction===dir));};
shidduchimForPerson=function(pid){const p=zmArchResolvedPerson(pid),rid=p?.id||pid;return data.shidduchim.filter(s=>!s.mergedIntoId&&(s.guyId===rid||s.girlId===rid||s.shadchanIds?.includes(rid)));};
ideasForPerson=function(pid){const p=zmArchResolvedPerson(pid),rid=p?.id||pid;return data.ideas.filter(i=>i.guyId===rid||i.girlId===rid);};

if(typeof activityFeed==='function'){
  const zmArchActivityFeedBefore=activityFeed;
  activityFeed=function(entries){return zmArchActivityFeedBefore((entries||[]).filter(e=>!e.deletedAt));};
}
if(typeof timelineHtml==='function'){
  const zmArchTimelineBefore=timelineHtml;
  timelineHtml=function(entries){return zmArchTimelineBefore((entries||[]).filter(e=>!e.deletedAt));};
}

function zmArchCandidateFromAddForm(){
  const name=document.getElementById('fName')?.value.trim();
  const types=[...document.querySelectorAll('input[name="fType"]:checked')].map(x=>x.value);
  return {name,types,city:document.getElementById('fCity')?.value.trim()||'',age:Number(document.getElementById('fAge')?.value)||undefined,occupation:document.getElementById('fOccupation')?.value.trim()||'',phone:document.getElementById('fPhone')?.value.trim()||'',email:document.getElementById('fEmail')?.value.trim()||'',profileText:document.getElementById('fProfile')?.value.trim()||''};
}

function zmArchFinishNewPerson(candidate,possible=[]){
  const {person:p}=zmArchInsertPerson(candidate);
  if(possible.length)p.possibleDuplicateIds=zmArchUnique(possible.map(x=>x.id));
  save().then(()=>{
    closeSheet();ui.detail={type:'person',id:p.id};ui.detailTab=p.types.includes('Shadchan')?'details':'profile';render();
    showToast(possible.length?`Saved · possible duplicate: ${possible[0].name}`:'Person saved');
  });
}

function zmArchUseExisting(existing,candidate){
  existing.types=zmArchUnique([...(existing.types||[]),...(candidate.types||[])]);
  for(const k of ['city','occupation','phone','email','age'])if(!existing[k]&&candidate[k])existing[k]=candidate[k];
  if(candidate.profileText&&!zmArchCurrentProfileVersion(existing.id))zmArchSnapshotProfile(existing,candidate.profileText);
  zmArchEntry({type:'status',channel:'App',direction:'none',personIds:[existing.id],aboutType:'person',aboutId:existing.id,text:`Matched new information to existing record ${existing.name}.`,result:'Already here',changes:[{kind:'identity-match'}]});
  save().then(()=>{closeSheet();ui.detail={type:'person',id:existing.id};ui.detailTab=existing.types?.includes('Shadchan')?'details':'profile';render();showToast('Used the existing person');});
}

function zmArchDuplicateSheet(existing,candidate,kind){
  zmArchPendingPerson=candidate;zmArchPendingMatches=[existing];
  const strong=kind==='exact';
  openSheet(`<h2>${strong?`${esc(existing.name)} is already here`:`Is this the ${esc(existing.name)} you know?`}</h2>
    <p class="lead">${strong?'The phone number or email matches an existing person. Shared contact details can happen, so you still choose.':'The name and city look like the same person.'}</p>
    <div class="arch-match-card"><div class="warm-avatar ${avatarTone(existing)}">${esc(initials(existing.name))}</div><div><strong>${esc(existing.name)}</strong><span>${esc([existing.city,existing.phone,existing.email].filter(Boolean).join(' · ')||'Existing record')}</span><small>${entriesForPerson(existing.id).length} history item${entriesForPerson(existing.id).length===1?'':'s'}</small></div></div>
    <div class="arch-choice-row"><button id="archDifferent" class="ghost-btn">Not the same person</button><button id="archSame" class="primary-btn">Same person</button></div>`);
  document.getElementById('archSame').onclick=()=>zmArchUseExisting(existing,candidate);
  document.getElementById('archDifferent').onclick=()=>{zmArchRememberNotSame(candidate,existing.id);zmArchFinishNewPerson(candidate);};
}

savePerson=async function(){
  const candidate=zmArchCandidateFromAddForm();
  if(!candidate.name)return showToast('Enter a name');
  if(!candidate.types.length)return showToast('Choose at least one role');
  const m=zmArchFindPersonMatches(candidate);
  if(m.exact.length)return zmArchDuplicateSheet(m.exact[0],candidate,'exact');
  if(m.likely.length)return zmArchDuplicateSheet(m.likely[0],candidate,'likely');
  zmArchFinishNewPerson(candidate,m.similar);
};

saveActivity=async function(){
  const pid=document.getElementById('aPerson')?.value,type=document.getElementById('aType')?.value,text=document.getElementById('aText')?.value.trim();
  if(!pid||!text)return showToast('Choose a person and add a note');
  const contact=['call','message','profile'].includes(type),self=me();
  const e=zmArchEntry({type,channel:type==='call'?'Call':type==='message'?'Message':'App',direction:contact?'out':'none',fromPersonId:contact?self?.id:null,toPersonId:contact?pid:null,personIds:[pid,self?.id],aboutType:'person',aboutId:pid,text,result:'',changes:type==='referral'?[{kind:'referral'}]:[]});
  if(type==='call'){
    const due=data.openItems.filter(x=>x.status==='open'&&x.direction==='me'&&x.personId===pid&&/call/i.test(x.label||''));
    if(due.length===1)zmArchCloseOpenItem(due[0].id,e.id,'call completed');
  }
  await save();closeSheet();render();showToast('Activity saved');
};

saveWaiting=async function(){
  const pid=document.getElementById('wPerson')?.value,direction=document.getElementById('wDirection')?.value,label=document.getElementById('wLabel')?.value.trim();
  if(!pid||!label)return showToast('Describe what is outstanding');
  const e=zmArchEntry({type:'status',channel:'App',direction:'none',personIds:[pid],aboutType:'person',aboutId:pid,text:`${direction==='them'?'To hear back':'My to-do'}: ${label}`,result:direction==='them'?'To hear back':'My to-do',changes:[{kind:'open-item-created',direction}]});
  zmArchCreateOpenItem({direction,personId:pid,aboutType:'person',aboutId:pid,label,openedByEntryId:e.id,checkInAt:direction==='them'?new Date(Date.now()+7*86400000).toISOString():null});
  await save();closeSheet();render();showToast('Next step saved');
};

saveIdea=async function(){
  const guyId=document.getElementById('iGuy')?.value,girlId=document.getElementById('iGirl')?.value,by=document.getElementById('iBy')?.value||null;
  if(!guyId||!girlId||guyId===girlId)return showToast('Choose a guy and a girl');
  const existing=data.ideas.find(i=>i.guyId===guyId&&i.girlId===girlId&&i.status==='open');
  if(existing){closeSheet();ideaSheet(existing.id);return;}
  const i=zmArchCreateIdeaRecord(guyId,girlId,by);await save();closeSheet();ui.screen='shidduchim';ui.screenView.shidduchim='ideas';render();showToast('Offer saved');
};

function zmArchRejectIdeaSheet(iid){
  const i=idea(iid);if(!i)return;zmArchIdeaNoId=iid;
  openSheet(`<h2>Not applicable</h2><p class="lead">The offer closes, but no shidduch is created. The reason stays private.</p><div class="field"><label>Private reason <span style="font-weight:400">(optional)</span></label><textarea id="archIdeaReason" placeholder="You can leave this blank"></textarea></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="arch-confirm-idea-no">Save</button></div>`);
}

function zmArchEarlierLinkCandidates(i,s){
  const cutoff=new Date(i.closedAt||zmArchNow()).getTime();
  return zmArchLiveEntries().filter(e=>{
    if(e.id===i.decisionEntryId||e.aboutType==='shidduch'||e.aboutType==='date'||e.deletedAt)return false;
    if(new Date(e.at).getTime()>cutoff)return false;
    const people=e.personIds||[];return people.includes(i.guyId)||people.includes(i.girlId);
  }).slice(-10).reverse();
}
function zmArchOpenAfterLink(sid){closeSheet();ui.detail={type:'shidduch',id:sid};ui.detailTab='overview';render();window.scrollTo(0,0);}
function zmArchLinkEarlierSheet(i,s){
  const rows=zmArchEarlierLinkCandidates(i,s);
  if(!rows.length)return zmArchOpenAfterLink(s.id);
  openSheet(`<h2>Link earlier history?</h2><p class="lead">Only the “about” link changes. The original words and time stay exactly as they were.</p><div class="arch-link-list">${rows.map(e=>`<div class="arch-link-row"><div><strong>${esc(fmtDate(e.at))}</strong><span>${esc(e.text||'')}</span></div><select data-arch-link-entry="${esc(e.id)}"><option value="no">No</option><option value="yes">Yes</option></select></div>`).join('')}</div><input type="hidden" id="archLinkSid" value="${esc(s.id)}"><div class="split-actions"><button class="ghost-btn" data-act="arch-skip-links">Skip</button><button class="primary-btn" data-act="arch-save-links">Continue</button></div>`);
}

chooseIdea=async function(iid,yes){
  const i=idea(iid);if(!i)return;
  if(!yes)return zmArchRejectIdeaSheet(iid);
  const result=zmArchAcceptIdea(i);if(!result)return;
  i.decisionEntryId=result.entry.id;await save();zmArchLinkEarlierSheet(i,result.shidduch);
};

function zmArchApplyPersonEdit(p,fields){
  const ageChanged=Number(p.age||0)!==Number(fields.age||0);
  p.name=fields.name||p.name;p.city=fields.city;p.age=fields.age||undefined;p.occupation=fields.occupation;p.phone=fields.phone;p.email=fields.email;p.types=zmArchUnique(fields.types||p.types||[]);
  if(ageChanged&&p.age){p.ageAsOf=zmArchNow();p.ageDateUnknown=false;}
  p.needsNumber=!zmArchNormPhone(p.phone)&&!zmArchNormEmail(p.email);
  const current=zmArchCurrentProfileVersion(p.id),oldText=current?.text||p.profileText||'';
  if(fields.profile!==oldText){const v=zmArchSnapshotProfile(p,fields.profile);zmArchEntry({type:'profile',channel:'App',direction:'none',personIds:[p.id],aboutType:'person',aboutId:p.id,text:`Profile updated to v${v.versionNumber}.`,profileVersionId:v.id,changes:[{kind:'profile-version-created',profileVersionId:v.id}]});}
}

editPersonSheet=function(pid){
  const p=person(pid||ui.detail?.id);if(!p)return;
  const current=zmArchCurrentProfileVersion(p.id);const roles=['Guy','Girl','Shadchan','Reference'];
  openSheet(`<h2>Edit ${esc(p.name)}</h2><div class="form-grid"><div class="field"><label>Name</label><input id="epName" value="${esc(p.name)}"></div><div class="field"><label>Roles</label><div class="sheet-section arch-role-box">${roles.map(t=>`<label class="checkbox-row"><input type="checkbox" name="epType" value="${t}" ${p.types?.includes(t)?'checked':''}> ${t}</label>`).join('')}</div></div><div class="field"><label>City</label><input id="epCity" value="${esc(p.city||'')}"></div><div class="field"><label>Age</label><input id="epAge" inputmode="numeric" value="${esc(p.age||'')}"></div><div class="field"><label>Occupation</label><input id="epOccupation" value="${esc(p.occupation||'')}"></div><div class="field"><label>Phone</label><input id="epPhone" value="${esc(p.phone||'')}"></div><div class="field"><label>Email</label><input id="epEmail" value="${esc(p.email||'')}"></div><div class="field"><label>Profile${current?` · v${current.versionNumber}`:''}</label><textarea id="epProfile">${esc(current?.text||p.profileText||'')}</textarea><small class="arch-field-note">Changing the profile creates a new frozen version. Sent versions never change.</small></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" id="archSaveEditPerson">Save</button></div>`);
  document.getElementById('archSaveEditPerson').onclick=()=>{
    const fields={name:document.getElementById('epName').value.trim(),city:document.getElementById('epCity').value.trim(),age:Number(document.getElementById('epAge').value)||undefined,occupation:document.getElementById('epOccupation').value.trim(),phone:document.getElementById('epPhone').value.trim(),email:document.getElementById('epEmail').value.trim(),profile:document.getElementById('epProfile').value.trim(),types:[...document.querySelectorAll('input[name="epType"]:checked')].map(x=>x.value)};
    if(!fields.name||!fields.types.length)return showToast('Name and at least one role are required');
    const matches=zmArchFindPersonMatches(fields,p.id);
    if(matches.exact.length){
      const other=matches.exact[0];
      openSheet(`<h2>Same person?</h2><p class="lead">That phone number or email is already on ${esc(other.name)}.</p><div class="arch-choice-row"><button id="archKeepSeparate" class="ghost-btn">Keep separate</button><button id="archMergeNow" class="primary-btn">Merge records</button></div>`);
      document.getElementById('archKeepSeparate').onclick=()=>{zmArchRememberNotSame(fields,other.id);zmArchApplyPersonEdit(p,fields);save().then(()=>{closeSheet();render();showToast('Saved');});};
      document.getElementById('archMergeNow').onclick=()=>{zmArchApplyPersonEdit(p,fields);const r=zmArchMergePeople(other.id,p.id);if(r?.error)return showToast(r.error);save().then(()=>{closeSheet();render();showToast('Records merged');});};
      return;
    }
    zmArchApplyPersonEdit(p,fields);save().then(()=>{closeSheet();render();showToast('Saved');});
  };
};

logProfileSend=function(pid){
  const recipient=person(pid),self=me(),v=zmArchCurrentProfileVersion(self?.id);if(!recipient||!self)return;
  if(!v)return showToast('Add your profile first');
  const fs=(data.files||[]).filter(f=>(f.personId===self.id||f.ownerPersonId===self.id)&&!f.private);
  openSheet(`<h2>Send my profile</h2><p class="lead">Only the items selected here are included. History, private notes, reasons and answers are never part of a send.</p><div class="arch-send-preview"><strong>Profile v${v.versionNumber}</strong><span>${esc(v.text?`${v.text.slice(0,90)}${v.text.length>90?'…':''}`:'Profile text')}</span></div>${fs.length?`<div class="field"><label>Files</label><div class="sheet-section">${fs.map(f=>`<label class="checkbox-row"><input type="checkbox" name="archSendFile" value="${esc(f.id)}"> ${esc(f.name||'File')}</label>`).join('')}</div></div>`:''}<div class="field"><label>What next?</label><select id="archSendPurpose"><option value="send">Just send</option><option value="opinion">Ask for an opinion</option></select></div><div class="field"><label>Your words <span style="font-weight:400">(optional)</span></label><textarea id="archSendWords" placeholder="A short message you choose to include"></textarea></div><input type="hidden" id="archSendTo" value="${esc(recipient.id)}"><input type="hidden" id="archSendVersion" value="${esc(v.id)}"><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="arch-confirm-profile-send">Save send</button></div>`);
};

function zmArchOpenItemSheet(itemId){
  const x=data.openItems.find(v=>v.id===itemId&&v.status==='open');if(!x)return;
  const p=person(x.personId);const about=x.aboutType==='shidduch'?shidduch(x.aboutId):x.aboutType==='source'?source(x.aboutId):null;
  openSheet(`<h2>${x.direction==='me'?'My to-do':'To hear back'}</h2><p class="lead">${esc(x.label)}${p?` · ${esc(p.name)}`:''}${about?` · ${esc(about.name||shidduchTitle(about))}`:''}</p><div class="field"><label>${x.direction==='them'?'What did you hear?':'Note'} <span style="font-weight:400">(optional)</span></label><textarea id="archOpenNote"></textarea></div><input type="hidden" id="archOpenItemId" value="${esc(x.id)}"><div class="arch-open-actions">${x.direction==='them'?`<button class="ghost-btn" data-arch-open-act="checkin">Check in now</button><button class="primary-btn" data-arch-open-act="heard">Heard back</button>`:`<button class="primary-btn" data-arch-open-act="done">Done</button>`}<button class="ghost-btn arch-not-needed" data-arch-open-act="not-needed">Not needed anymore</button></div>`);
}

if(typeof zmTodoCard==='function'){
  zmTodoCard=function(x){
    const p=person(x.personId),when=x.createdAt?fmtDay(x.createdAt):'';
    return `<button class="next-card zm-todo-card" data-open-item-id="${esc(x.id)}"><div class="next-avatar ${avatarTone(p||{name:'?'})}">${esc(initials(p?.name||'?'))}</div><div class="next-copy"><strong>${esc(x.label||'Next step')}</strong><span>${esc(p?.name||'Someone')}</span>${when?`<small>${esc(when)}</small>`:''}</div><div class="next-action">Open</div></button>`;
  };
}

if(typeof zmPersonOpenStatus==='function'){
  zmPersonOpenStatus=function(p){
    const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them'),active=shidduchimForPerson(p.id).filter(s=>s.status==='active'),lc=lastContact(p.id);let boxes='';
    if(mine.length){const x=mine[0];boxes+=`<button class="zm-person-open-box mine" data-open-item-id="${esc(x.id)}"><span><b>My to-do</b><small>${esc(zmShortOpenLabel(mine))}</small></span><em>Open</em></button>`;}
    if(them.length){const x=them[0];boxes+=`<button class="zm-person-open-box theirs" data-open-item-id="${esc(x.id)}"><span><b>To hear back from ${esc(clarityFirstName(p))}</b><small>${esc(zmShortOpenLabel(them))}</small></span><em>Open</em></button>`;}
    const meta=[`Last contact: ${lc?fmtDay(lc):'Not yet'}`];if(active.length)meta.push(`${active.length} current shidduch${active.length===1?'':'im'}`);
    return `<div class="zm-person-status-area">${boxes}<div class="zm-person-meta">${meta.map((x,i)=>`${i?'<i>·</i>':''}<span>${esc(x)}</span>`).join('')}</div></div>`;
  };
}

function zmArchDateLocalValue(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
function zmArchDateSheet(sid,did=null){
  const s=shidduch(sid),d=did?zmArchDateRecord(did):null;if(!s)return;
  const r=zmArchCurrentRound(s),next=Math.max(0,...data.dates.filter(x=>x.roundId===r?.id).map(x=>Number(x.number)||0))+1;
  openSheet(`<h2>${d?`Date ${d.number}`:`Add Date ${next}`}</h2><p class="lead">This meeting keeps one permanent Date ID. Moving it or adding feedback updates the same date.</p><input type="hidden" id="archDateSid" value="${esc(s.id)}"><input type="hidden" id="archDateId" value="${esc(d?.id||'')}"><div class="form-grid"><div class="field"><label>Date and time</label><input id="archDateWhen" type="datetime-local" value="${esc(zmArchDateLocalValue(d?.when))}"></div><div class="field"><label>Status</label><select id="archDateState"><option value="scheduled" ${d?.state==='scheduled'?'selected':''}>Scheduled</option><option value="happened" ${d?.state==='happened'?'selected':''}>Happened</option><option value="cancelled" ${d?.state==='cancelled'?'selected':''}>Cancelled</option></select></div><div class="field"><label>${esc(person(s.guyId)?.name||'Guy')} feedback</label><input id="archGuyFeedback" value="${esc(d?.guyFeedback||'')}"></div><div class="field"><label>${esc(person(s.girlId)?.name||'Girl')} feedback</label><input id="archGirlFeedback" value="${esc(d?.girlFeedback||'')}"></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="arch-save-date">Save date</button></div>`);
}

const zmArchShidduchDetailBefore=shidduchDetail;
shidduchDetail=function(sid){
  let html=zmArchShidduchDetailBefore(sid);const s=shidduch(sid);if(!s)return html;
  if(ui.detailTab==='dates'&&s.status!=='ended')html+=`<div class="arch-detail-action"><button class="ghost-btn" data-act="arch-add-date" data-shidduch-id="${esc(s.id)}">Add date</button></div>`;
  if(ui.detailTab==='history'){
    const rs=data.rounds.filter(r=>r.shidduchId===s.id).sort((a,b)=>(Number(b.number)||0)-(Number(a.number)||0));
    if(rs.length>1)html+=`<div class="arch-rounds"><h3>Rounds</h3>${rs.map(r=>{const count=data.dates.filter(d=>d.roundId===r.id).length;return `<div><strong>Round ${r.number}</strong><span>${esc(r.status||'')} · ${count} date${count===1?'':'s'}${r.endedStage?` · ended at ${esc(r.endedStage)}`:''}</span></div>`;}).join('')}</div>`;
  }
  return html;
};

const zmArchEntryDetailBefore=entryDetail;
entryDetail=function(eid){let html=zmArchEntryDetailBefore(eid);const e=data.entries.find(x=>x.id===eid);if(e&&!e.deletedAt)html+=`<div class="arch-detail-action"><button class="ghost-btn danger" data-act="arch-delete-entry" data-entry-id="${esc(e.id)}">Delete this activity</button></div>`;return html;};

const zmArchSourceDetailBefore=sourceDetail;
sourceDetail=function(sid){let html=zmArchSourceDetailBefore(sid);const src=source(sid);if(src)html+=`<div class="arch-detail-action"><button class="ghost-btn" data-act="arch-source-add-person" data-source-id="${esc(src.id)}">Add person to source</button></div>`;return html;};

function zmArchMergeSheet(p){
  const choices=zmArchLivePeople().filter(x=>x.id!==p.id).sort((a,b)=>a.name.localeCompare(b.name));
  const undo=[...data.mergeHistory].reverse().find(x=>x.status==='done');
  openSheet(`<h2>Merge duplicate</h2><p class="lead">Use this only when two records are the same real person. Nothing is discarded, and the last merge can be undone.</p><div class="field"><label>Merge into ${esc(p.name)}</label><select id="archMergeFrom"><option value="">Choose duplicate…</option>${choices.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.city?` · ${esc(x.city)}`:''}</option>`).join('')}</select></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="arch-confirm-merge" data-person-id="${esc(p.id)}">Merge</button></div>${undo?`<button class="ghost-btn full arch-undo" data-act="arch-undo-merge">Undo last merge</button>`:''}`);
}

detailMenu=function(){
  if(ui.detail?.type!=='person')return;const p=person(ui.detail.id);if(!p)return;
  const undo=[...data.mergeHistory].reverse().find(x=>x.status==='done');
  openSheet(`<h2>${esc(p.name)}</h2><p class="lead">Less-used actions live here so the profile stays calm.</p><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Edit person</b><span>Facts, roles and profile versions</span></div><button class="option" data-act="edit-person">Edit</button></div><div class="setting-row"><div class="setting-copy"><b>Add activity</b><span>Call, note, message or referral</span></div><button class="option" data-act="add-person-note" data-person-id="${esc(p.id)}">Add</button></div><div class="setting-row"><div class="setting-copy"><b>Merge duplicate</b><span>One record per real person</span></div><button class="option" data-act="arch-merge-sheet" data-person-id="${esc(p.id)}">Merge</button></div>${undo?`<div class="setting-row"><div class="setting-copy"><b>Undo last merge</b><span>Restore both records</span></div><button class="option" data-act="arch-undo-merge">Undo</button></div>`:''}</div><button class="primary-btn full" data-act="close-sheet">Done</button>`);
};

confirmEndShidduch=async function(){
  const sid=document.getElementById('endShidduchId')?.value,s=shidduch(sid);if(!s)return;
  const idx=Math.max(0,Math.min(9,Number(document.getElementById('endStage')?.value)||0)),reason=document.getElementById('endReason')?.value.trim()||'';
  zmArchEndShidduch(s,idx,reason);await save();closeSheet();ui.detail=null;ui.screen='shidduchim';ui.screenView.shidduchim='ended';render();showToast('Moved to Ended');
};

function zmArchOpenSourcePersonSheet(sid){
  const src=source(sid);if(!src)return;const existing=new Set(zmArchSourceLinePeople(src));const choices=byType('Shadchan').filter(p=>!existing.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
  openSheet(`<h2>Add to ${esc(src.name)}</h2><p class="lead">The source points to the person's one permanent record. It never makes a copy.</p><div class="field"><label>Person</label><select id="archSourcePerson"><option value="">Choose…</option>${choices.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><input type="hidden" id="archSourceId" value="${esc(src.id)}"><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="arch-save-source-person">Add person</button></div>`);
}

// New architecture actions run in capture phase only when they would otherwise be interpreted
// as older generic person/contact actions.
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.openItemId){e.preventDefault();e.stopImmediatePropagation();zmArchOpenItemSheet(b.dataset.openItemId);return;}
},true);

document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  const act=b.dataset.act;

  if(b.dataset.archOpenAct){
    const itemId=document.getElementById('archOpenItemId')?.value,x=data.openItems.find(v=>v.id===itemId&&v.status==='open');if(!x)return;
    const note=document.getElementById('archOpenNote')?.value.trim()||'',which=b.dataset.archOpenAct;
    if(which==='checkin'){
      zmArchEntry({type:'message',channel:'App',direction:'out',fromPersonId:me()?.id,toPersonId:x.personId,personIds:[me()?.id,x.personId],aboutType:x.aboutType,aboutId:x.aboutId,text:note||`Checked in about: ${x.label}`,result:'To hear back',changes:[{kind:'open-item-checkin',openItemId:x.id}]});
      x.checkInAt=new Date(Date.now()+7*86400000).toISOString();await save();closeSheet();render();showToast('Check-in logged');return;
    }
    const incoming=which==='heard';
    const entry=zmArchEntry({type:incoming?'message':'status',channel:'App',direction:incoming?'in':'none',fromPersonId:incoming?x.personId:null,toPersonId:incoming?me()?.id:null,personIds:[x.personId,me()?.id],aboutType:x.aboutType,aboutId:x.aboutId,text:note||(which==='not-needed'?`No longer needed: ${x.label}`:`Completed: ${x.label}`),result:which==='heard'?'Heard back':which==='not-needed'?'Not needed':'Done',changes:[{kind:'open-item-closed',openItemId:x.id}]});
    zmArchCloseOpenItem(x.id,entry.id,which);await save();closeSheet();render();showToast(which==='heard'?'Heard back saved':'Closed');return;
  }

  if(act==='arch-confirm-idea-no'){
    const i=idea(zmArchIdeaNoId);if(!i)return;zmArchRejectIdea(i,document.getElementById('archIdeaReason')?.value.trim()||'');await save();closeSheet();render();showToast('Offer closed');return;
  }
  if(act==='arch-save-links'||act==='arch-skip-links'){
    const sid=document.getElementById('archLinkSid')?.value;
    if(act==='arch-save-links')for(const sel of document.querySelectorAll('[data-arch-link-entry]'))if(sel.value==='yes')zmArchSetEntryAbout(sel.dataset.archLinkEntry,'shidduch',sid,'linked after offer became shidduch');
    await save();zmArchOpenAfterLink(sid);return;
  }
  if(act==='arch-confirm-profile-send'){
    const pid=document.getElementById('archSendTo')?.value,recipient=person(pid),vid=document.getElementById('archSendVersion')?.value,v=data.profileVersions.find(x=>x.id===vid),purpose=document.getElementById('archSendPurpose')?.value,words=document.getElementById('archSendWords')?.value.trim()||'',fileIds=[...document.querySelectorAll('input[name="archSendFile"]:checked')].map(x=>x.value);if(!recipient||!v)return;
    const entry=zmArchEntry({type:'profile',channel:'WhatsApp',direction:'out',fromPersonId:me()?.id,toPersonId:recipient.id,personIds:[me()?.id,recipient.id],aboutType:'person',aboutId:me()?.id,text:`Sent my profile v${v.versionNumber} to ${recipient.name}.${words?` ${words}`:''}`,profileVersionId:v.id,fileIds,result:purpose==='opinion'?'Asked for opinion':'Sent',changes:[{kind:'profile-sent',profileVersionId:v.id,purpose}]});
    if(purpose==='opinion')zmArchCreateOpenItem({direction:'them',personId:recipient.id,aboutType:'person',aboutId:recipient.id,label:'Opinion on my profile',openedByEntryId:entry.id,dedupeKey:`profile-opinion:${entry.id}`});
    await save();closeSheet();render();showToast('Profile send saved');return;
  }
  if(act==='arch-add-date'){zmArchDateSheet(b.dataset.shidduchId||ui.detail?.id);return;}
  if(act==='arch-save-date'){
    const sid=document.getElementById('archDateSid')?.value,did=document.getElementById('archDateId')?.value||null,raw=document.getElementById('archDateWhen')?.value;
    const when=raw?new Date(raw).toISOString():null;
    zmArchDateSave({id:did,shidduchId:sid,when,state:document.getElementById('archDateState')?.value,guyFeedback:document.getElementById('archGuyFeedback')?.value.trim()||'',girlFeedback:document.getElementById('archGirlFeedback')?.value.trim()||''});await save();closeSheet();ui.detail={type:'shidduch',id:sid};ui.detailTab='dates';render();showToast('Date saved');return;
  }
  if(b.dataset.date){const d=zmArchDateRecord(b.dataset.date),r=data.rounds.find(x=>x.id===d?.roundId);if(d&&r){zmArchDateSheet(r.shidduchId,d.id);return;}}
  if(act==='arch-delete-entry'){
    const en=data.entries.find(x=>x.id===b.dataset.entryId);if(en){en.deletedAt=zmArchNow();await save();ui.detail=null;ui.screen='recent';render();showToast('Activity deleted');}return;
  }
  if(act==='arch-merge-sheet'){const p=person(b.dataset.personId||ui.detail?.id);if(p)zmArchMergeSheet(p);return;}
  if(act==='arch-confirm-merge'){
    const from=document.getElementById('archMergeFrom')?.value,to=b.dataset.personId;if(!from)return showToast('Choose the duplicate record');const r=zmArchMergePeople(from,to);if(r?.error)return showToast(r.error);await save();closeSheet();ui.detail={type:'person',id:to};render();showToast('Records merged');return;
  }
  if(act==='arch-undo-merge'){if(zmArchUndoLastMerge()){await save();closeSheet();ui.detail=null;render();showToast('Merge undone');}else showToast('Nothing to undo');return;}
  if(act==='arch-source-add-person'){zmArchOpenSourcePersonSheet(b.dataset.sourceId||ui.detail?.id);return;}
  if(act==='arch-save-source-person'){
    const sid=document.getElementById('archSourceId')?.value,pid=document.getElementById('archSourcePerson')?.value,src=source(sid),p=person(pid);if(!src||!p)return showToast('Choose a person');
    src.lines=src.lines||[];src.lines.push({id:id('sl'),originalText:p.name,personId:p.id,status:'linked'});src.peopleIds=zmArchSourceLinePeople(src);
    zmArchEntry({type:'source',channel:'App',direction:'none',personIds:[p.id,src.fromPersonId],aboutType:'source',aboutId:src.id,text:`Added ${p.name} to ${src.name}.`,changes:[{kind:'source-line-linked',personId:p.id}]});await save();closeSheet();ui.detail={type:'source',id:src.id};render();showToast('Added to source');return;
  }
});

// One small compatibility improvement: How I know them is a view of sources/referrals, never a typed field.
sourceNamesForPerson=function(pid){
  const srcs=data.sources.filter(s=>zmArchSourceLinePeople(s).includes(pid));
  const refs=zmArchLiveEntries().filter(e=>e.personIds?.includes(pid)&&['referral','source'].includes(e.type));
  const names=zmArchUnique([...srcs.map(s=>s.name),...refs.map(e=>e.text).filter(Boolean)]);
  if(!names.length)return'Not added yet';return names.slice(0,2).join(' · ')+(names.length>2?` · ${names.length-2} more`:'');
};

if(data)render();
