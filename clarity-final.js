'use strict';

// Final plain-language pass. This changes words and status presentation only.
// Data, navigation, workflows and skin structure stay unchanged.

function clarityFirstName(p){return String(p?.name||'').trim().split(/\s+/)[0]||'them';}

// Clearer add flows without changing fields or actions.
function addPersonSheet(typePreset){
  const types=['Guy','Girl','Shadchan','Reference'];
  openSheet(`<h2>Add person</h2><p class="lead">Add their details. Choose every role that fits.</p><div class="form-grid"><div class="field"><label>Name</label><input id="fName" placeholder="Full name" /></div><div class="field"><label>Roles</label><div class="sheet-section" style="padding:6px 12px">${types.map(t=>`<label class="checkbox-row"><input type="checkbox" name="fType" value="${t}" ${typePreset===t?'checked':''}> ${t}</label>`).join('')}</div></div><div class="field"><label>City</label><input id="fCity" /></div><div class="field"><label>Age</label><input id="fAge" inputmode="numeric" /></div><div class="field"><label>Occupation</label><input id="fOccupation" /></div><div class="field"><label>Phone</label><input id="fPhone" type="tel" /></div><div class="field"><label>Email</label><input id="fEmail" type="email" /></div><div class="field"><label>Profile text or notes</label><textarea id="fProfile" placeholder="Paste profile text or a short note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-person">Save person</button></div>`);
}

function addActivitySheet(pid=''){
  const peopleOptions=livePeople().filter(p=>!p.isMe).sort(byName);
  openSheet(`<h2>Add activity</h2><p class="lead">Add something that happened outside the app. It will also appear in this person's History.</p><div class="form-grid"><div class="field"><label>Person</label><select id="aPerson"><option value="">Choose…</option>${peopleOptions.map(p=>`<option value="${p.id}" ${pid===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Type</label><select id="aType"><option value="note">Note</option><option value="call">Call</option><option value="message">Message</option><option value="profile">Profile</option><option value="referral">Referral</option></select></div><div class="field"><label>What happened?</label><textarea id="aText" placeholder="Short note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-activity">Save</button></div>`);
}

function addSourceSheet(){
  openSheet(`<h2>Add source</h2><p class="lead">A source is where these names came from.</p><div class="form-grid"><div class="field"><label>Name</label><input id="sName" placeholder="For example: Rivka's shadchanim list" /></div><div class="field"><label>Type</label><select id="sKind"><option value="list">List</option><option value="event">Event</option><option value="site">Website</option><option value="referral">Referral</option></select></div><div class="field"><label>Contact again after</label><select id="sDays"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-source">Save source</button></div>`);
}

// Filters: Recent's filter/sort sheet (History only), the Shadchanim view sheet, otherwise Settings.
function filtersSheet(){
  if(ui.screen==='recent'){
    const filter=ui.recentFilter||'all';
    const sort=ui.recentSort||'newest';
    const filterButton=(value,label)=>`<button class="option ${filter===value?'active':''}" data-recent-filter="${value}">${label}</button>`;
    const sortButton=(value,label)=>`<button class="option ${sort===value?'active':''}" data-recent-sort="${value}">${label}</button>`;
    openSheet(`<h2>Recent view</h2>
      <p class="lead">These choices affect History only. Your to-do list and To hear back stay unchanged.</p>
      <div class="sheet-section">
        <div class="setting-row">
          <div class="setting-copy"><b>Sort History</b><span>Choose which activity appears first</span></div>
          <div class="option-group">${sortButton('newest','Newest')}${sortButton('oldest','Oldest')}</div>
        </div>
        <div class="setting-row">
          <div class="setting-copy"><b>Show</b><span>Filter the History feed</span></div>
          <div class="option-group">${filterButton('all','All')}${filterButton('call','Calls')}${filterButton('message','Messages')}${filterButton('profile','Profiles')}${filterButton('date','Dates')}${filterButton('note','Notes')}</div>
        </div>
      </div>
      <button class="primary-btn full" data-act="close-sheet">Done</button>`);
    return;
  }
  if(ui.screen==='shadchanim'){
    openSheet(`<h2>Shadchanim view</h2><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>No contact for 60 days or more</b><span>Show people you have not contacted recently</span></div><button class="option" data-act="show-dormant">Show</button></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);
  }else settingsSheet();
}

// New waiting/history entries use the same language users see on screen.
async function saveWaiting(){
  const pid=document.getElementById('wPerson')?.value,direction=document.getElementById('wDirection')?.value,label=document.getElementById('wLabel')?.value.trim();
  if(!pid||!label)return showToast('Say what needs to happen');
  const turn=direction==='them'?'Their turn':'My turn';
  const e=addEntry({type:'status',personIds:[pid],about:[{type:'person',id:pid}],text:`${turn}: ${label}`,result:turn,changes:[]});
  const x=addOpenItem({direction,personId:pid,about:{type:'person',id:pid},kind:'manual',label,openedByEntryId:e.id});
  e.changes.push({kind:'item-opened',itemId:x.id});
  await save();closeSheet();render();showToast('Turn saved');
}

async function logProfileSend(pid){
  const p=person(pid),v=latestProfileVersion(me().id),n=v?.number||myProfileVersion();
  addEntry({type:'profile',channel:'WhatsApp',direction:'out',fromPersonId:me().id,toPersonId:p.id,personIds:[me().id,p.id],about:[{type:'person',id:me().id}],text:`Sent my profile v${n} to ${p.name}.`,profileVersionId:v?.id,profileVersionNumber:n,changes:[{kind:'profile-sent',profileVersionId:v?.id||null}]});
  await save();render();showToast('Profile marked as sent');
}
