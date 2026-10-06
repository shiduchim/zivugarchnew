'use strict';

// Open items: My to-do (waiting on me) and To hear back (waiting on them). Each has a permanent id and is
// closed by the exact entry that settles it; the app names the item and you confirm. Nothing here ever
// opens an item by itself while a screen is shown.

const DUE_CHOICES=[['','No date'],['0','Today'],['1','Tomorrow'],['7','In a week']];
function dueFromChoice(v){if(v===''||v==null)return null;const d=new Date();d.setHours(9,0,0,0);d.setDate(d.getDate()+Number(v));return d.toISOString();}

// What's next? for a person: everything open with them, and a new item.
function waitingSheet(pid){
  const items=openForPerson(pid);
  const actions=x=>x.direction==='me'
    ?`<button class="option" data-act="close-open-item" data-item-id="${esc(x.id)}">Done</button><button class="option quiet" data-act="item-not-needed" data-item-id="${esc(x.id)}">Not needed</button>`
    :`<button class="option" data-act="close-open-item" data-item-id="${esc(x.id)}">Heard back</button><button class="option quiet" data-act="item-check-in" data-item-id="${esc(x.id)}">Check in now</button><button class="option quiet" data-act="item-not-needed" data-item-id="${esc(x.id)}">Not needed</button>`;
  const openList=items.length?`<div class="sheet-section zm-open-list">${items.map(x=>`<div class="setting-row"><div class="setting-copy"><b>${esc(x.label||'Next step')}</b><span>${x.direction==='me'?'My to-do':'To hear back'}${x.dueAt&&!itemIsDue(x)?` · ${esc(fmtDate(x.dueAt))}`:''}</span></div><div class="option-group">${actions(x)}</div></div>`).join('')}</div>`:'';
  openSheet(`<h2>What's next?</h2><p class="lead">Keep one open thing in the right place.</p>${openList}<input type="hidden" id="wPerson" value="${esc(pid)}"><div class="form-grid"><div class="field"><label>Who needs to act?</label><select id="wDirection"><option value="me">I need to…</option><option value="them">I'll hear back about…</option></select></div><div class="field"><label>What is it about?</label><input id="wLabel" placeholder="For example: answer about the Cohen idea" /></div><div class="field"><label>When? <span style="font-weight:400">(optional)</span></label><select id="wDue">${DUE_CHOICES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-waiting">Save</button></div>`);
}

async function saveWaiting(){
  const pid=document.getElementById('wPerson')?.value,direction=document.getElementById('wDirection')?.value,label=document.getElementById('wLabel')?.value.trim();
  if(!pid||!label)return showToast('Say what needs to happen');
  const turn=direction==='them'?'Their turn':'My turn';
  const e=addEntry({type:'status',personIds:[pid],about:[{type:'person',id:pid}],text:`${turn}: ${label}`,result:turn,changes:[]});
  const x=addOpenItem({direction,personId:pid,about:{type:'person',id:pid},kind:'manual',label,openedByEntryId:e.id,dueAt:direction==='me'?dueFromChoice(document.getElementById('wDue')?.value):null});
  e.changes.push({kind:'item-opened',itemId:x.id});
  await save();closeSheet();render();showToast('Turn saved');
}

// Done, Heard back or Not needed: exactly this item closes, with an entry saying so. Undo reopens it.
async function closeOpenItem(itemId,kind){
  const x=openItem(itemId);if(!x||x.status!=='open')return;
  const heard=x.direction==='them';kind=kind||(heard?'heard-back':'done');
  const word=kind==='not-needed'?'Not needed':heard?'Heard back':'Done';
  const e=addEntry({type:'status',personIds:[x.personId],about:x.about?[x.about]:[],text:`${word}: ${x.label}`,result:word,changes:[{kind:'item-closed',itemId:x.id,closeKind:kind}]});
  closeItemRecord(x,{entryId:e.id,kind,at:e.at});
  await save();closeSheet();render();
  showActionToast(kind==='not-needed'?'Marked as not needed':heard?'Marked as heard back':'Marked as done',{act:'undo-close-item',itemId:x.id,entryId:e.id});
}
async function undoCloseOpenItem(itemId,entryId){const x=openItem(itemId);if(!x||x.closedByEntryId!==entryId)return;x.status='open';delete x.closedAt;delete x.closedByEntryId;delete x.closeKind;data.entries=data.entries.filter(e=>e.id!==entryId);await save();render();showToast('Reopened');}

// Check in now: the item stays open; the message is written to the history like any contact.
async function checkInItem(itemId){
  const x=openItem(itemId);if(!x||x.status!=='open')return;
  const p=person(x.personId);if(!p)return;
  const kind=['wa','sms','call'].find(k=>contactUrl(p,k));
  if(!kind){showToast(`Add a phone number for ${p.name} to check in`);return;}
  const channel=kind==='wa'?'WhatsApp':kind==='sms'?'SMS':'Call';
  const about=x.about&&!(x.about.type==='person'&&samePerson(x.about.id,p.id))?[x.about,{type:'person',id:p.id}]:[{type:'person',id:p.id}];
  addEntry({type:kind==='call'?'call':'message',channel,direction:'out',fromPersonId:me().id,toPersonId:p.id,personIds:[me().id,p.id],about,text:`Checked in about: ${x.label}`,changes:[{kind:'item-checked-in',itemId:x.id}]});
  await save();closeSheet();render();location.href=contactUrl(p,kind);
}

// After a contact with someone who has open items: the app names them, you tick what was settled.
let afterContactFlow=null;
function afterContactSheet(pid,entryId){
  const p=person(pid),items=openForPerson(pid);if(!p||!items.length)return false;
  afterContactFlow={pid:p.id,entryId};
  openSheet(`<h2>After talking to ${esc(clarityFirstName(p))}</h2><p class="lead">Did this settle any of these?</p><div class="sheet-section">${items.map(x=>`<label class="checkbox-row"><input type="checkbox" name="afterItem" value="${esc(x.id)}"> ${esc(x.label)} · ${x.direction==='me'?'My to-do':'To hear back'}</label>`).join('')}</div><div class="field"><label>Note <span style="font-weight:400">(optional)</span></label><textarea id="afterNote"></textarea></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Not now</button><button class="primary-btn" data-act="after-contact-save">Save</button></div>`);
  return true;
}
async function saveAfterContact(){
  const f=afterContactFlow;afterContactFlow=null;if(!f)return;
  const note=document.getElementById('afterNote')?.value.trim()||'';
  let closing=data.entries.find(e=>e.id===f.entryId);
  if(note)closing=addEntry({type:'note',personIds:[f.pid],about:[{type:'person',id:f.pid}],text:note});
  for(const box of document.querySelectorAll('input[name="afterItem"]:checked')){const x=openItem(box.value);if(x?.status==='open'){closeItemRecord(x,{entryId:closing?.id||null,kind:x.direction==='them'?'heard-back':'done'});closing?.changes?.push({kind:'item-closed',itemId:x.id});}}
  await save();closeSheet();render();showToast('Saved');
}

// The Add activity sheet lists what this person owes or is owed; ticking one closes exactly that item.
function activityItemsHtml(pid){const items=pid?openForPerson(pid):[];return items.length?`<div class="setting-copy" style="padding:4px 0"><b>This settles</b></div>${items.map(x=>`<label class="checkbox-row"><input type="checkbox" name="activitySettles" value="${esc(x.id)}"> ${esc(x.label)}</label>`).join('')}`:'';}
function refreshActivityItems(){const box=document.getElementById('aItems');if(box)box.innerHTML=activityItemsHtml(document.getElementById('aPerson')?.value);}
