'use strict';

// Final plain-language pass. This changes words and status presentation only.
// Data, navigation, workflows and skin structure stay unchanged.

function clarityFirstName(p){return String(p?.name||'').trim().split(/\s+/)[0]||'them';}

const segmentBeforeClarity=segment;
segment=function(items,active,scope){
  const mapped=items.map(x=>({...x,label:x.label==='Needs contact'?'Time to contact':x.label}));
  return segmentBeforeClarity(mapped,active,scope);
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

// Clearer add flows without changing fields or actions.
function addPersonSheet(typePreset){
  const types=['Guy','Girl','Shadchan','Reference'];
  openSheet(`<h2>Add person</h2><p class="lead">Add their details. Choose every role that fits.</p><div class="form-grid"><div class="field"><label>Name</label><input id="fName" placeholder="Full name" /></div><div class="field"><label>Roles</label><div class="sheet-section" style="padding:6px 12px">${types.map(t=>`<label class="checkbox-row"><input type="checkbox" name="fType" value="${t}" ${typePreset===t?'checked':''}> ${t}</label>`).join('')}</div></div><div class="field"><label>City</label><input id="fCity" /></div><div class="field"><label>Age</label><input id="fAge" inputmode="numeric" /></div><div class="field"><label>Occupation</label><input id="fOccupation" /></div><div class="field"><label>Phone</label><input id="fPhone" type="tel" /></div><div class="field"><label>Email</label><input id="fEmail" type="email" /></div><div class="field"><label>Profile text or notes</label><textarea id="fProfile" placeholder="Paste profile text or a short note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-person">Save person</button></div>`);
}

function addActivitySheet(pid=''){
  const peopleOptions=data.people.filter(p=>!p.isMe).sort(byName);
  openSheet(`<h2>Add activity</h2><p class="lead">Add something that happened outside the app. It will also appear in this person's History.</p><div class="form-grid"><div class="field"><label>Person</label><select id="aPerson"><option value="">Choose…</option>${peopleOptions.map(p=>`<option value="${p.id}" ${pid===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Type</label><select id="aType"><option value="note">Note</option><option value="call">Call</option><option value="message">Message</option><option value="profile">Profile</option><option value="referral">Referral</option></select></div><div class="field"><label>What happened?</label><textarea id="aText" placeholder="Short note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-activity">Save</button></div>`);
}

function addSourceSheet(){
  openSheet(`<h2>Add source</h2><p class="lead">A source is where these names came from.</p><div class="form-grid"><div class="field"><label>Name</label><input id="sName" placeholder="For example: Rivka's shadchanim list" /></div><div class="field"><label>Type</label><select id="sKind"><option value="list">List</option><option value="event">Event</option><option value="site">Website</option><option value="referral">Referral</option></select></div><div class="field"><label>Contact again after</label><select id="sDays"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-source">Save source</button></div>`);
}

// Secondary filters use ordinary language and no visible plus signs.
function filtersSheet(){
  if(ui.screen==='shadchanim'){
    openSheet(`<h2>Shadchanim view</h2><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>No contact for 60 days or more</b><span>Show people you have not contacted recently</span></div><button class="option" data-act="show-dormant">Show</button></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);
  }else settingsSheet();
}

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
async function saveWaiting(){
  const pid=document.getElementById('wPerson')?.value,direction=document.getElementById('wDirection')?.value,label=document.getElementById('wLabel')?.value.trim();
  if(!pid||!label)return showToast('Say what needs to happen');
  data.openItems.push({id:id('oi'),direction,personId:pid,aboutType:'person',aboutId:pid,label,createdAt:iso(),status:'open'});
  const turn=direction==='them'?'Their turn':'My turn';
  data.entries.push({id:id('e'),at:iso(),type:'status',channel:'App',direction:'none',personIds:[pid],aboutType:'person',aboutId:pid,text:`${turn}: ${label}`,result:turn});
  await save();closeSheet();render();showToast('Turn saved');
}

async function logProfileSend(pid){
  const p=person(pid);data.entries.push({id:id('e'),at:iso(),type:'profile',channel:'WhatsApp',direction:'out',fromPersonId:me().id,toPersonId:pid,personIds:[me().id,pid],aboutType:'person',aboutId:me().id,text:`Sent my profile v${me().profileVersion||1} to ${p.name}.`,profileVersion:me().profileVersion||1,result:''});
  await save();render();showToast('Profile marked as sent');
}

if(data)render();
