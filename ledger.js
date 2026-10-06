'use strict';

// Ledger: every real moment is written once, as one entry with a permanent id. Recent, a person's
// History, a shidduch's History and a list's progress are all views of these same entries.
// The words of an entry never change. Only the app's reading of it (what it is about) can be corrected,
// and each correction is kept on the entry.

function addEntry(spec){
  const e={id:id('e'),at:spec.at!==undefined?spec.at:iso(),type:spec.type||'note',channel:spec.channel||'App',direction:spec.direction||'none',
    fromPersonId:spec.fromPersonId||null,toPersonId:spec.toPersonId||null,
    personIds:[...new Set((spec.personIds||[spec.fromPersonId,spec.toPersonId]).filter(Boolean))],
    about:(spec.about||[]).filter(a=>a&&a.type&&a.id),text:String(spec.text||''),result:spec.result||'',
    fileIds:spec.fileIds||[],changes:spec.changes||[]};
  for(const k of ['private','profileVersionId','profileVersionNumber','toFile','pastedAt','sentText'])if(spec[k]!=null)e[k]=spec[k];
  data.entries.push(e);
  if(!e.toFile)noteListProgress(e);
  return e;
}

// Open items: something owed, by me (My to-do) or by them (To hear back). Each has a permanent id, and is
// closed by the exact entry that answers it.
function addOpenItem(spec){
  const x={id:id('oi'),direction:spec.direction==='them'?'them':'me',personId:spec.personId||null,about:spec.about||null,kind:spec.kind||'manual',label:String(spec.label||'Next step'),createdAt:spec.createdAt||iso(),status:'open',openedByEntryId:spec.openedByEntryId||null};
  for(const k of ['dueAt','side','dateId'])if(spec[k])x[k]=spec[k];
  data.openItems.push(x);
  return x;
}
function closeItemRecord(x,{entryId=null,kind='done',at=iso()}={}){x.status='closed';x.closedAt=at;x.closedByEntryId=entryId;x.closeKind=kind;}

// Link an entry to more records (after Interested, when filing): "about" grows, the change is kept.
function addEntryAbout(e,additions,reason){
  const add=additions.filter(a=>a&&a.type&&a.id&&!isAbout(e,a.type,a.id));
  if(!add.length)return false;
  (e.corrections||(e.corrections=[])).push({at:iso(),field:'about',added:add,reason});
  e.about.push(...add);
  return true;
}

// Only entries that changed no record can be deleted; the deletion is reversible.
function entryChangesRecords(e){return (e.changes||[]).some(c=>!['profile-sent','item-checked-in'].includes(c.kind));}
async function deleteEntry(eid){
  const e=data.entries.find(x=>x.id===eid);if(!e||e.deletedAt||entryChangesRecords(e))return;
  e.deletedAt=iso();await save();ui.detail=null;render();
  showActionToast('Activity deleted',{act:'restore-entry',entryId:e.id});
}
async function restoreEntry(eid){const e=data.entries.find(x=>x.id===eid);if(!e?.deletedAt)return;delete e.deletedAt;await save();render();showToast('Activity restored');}

function entryTitle(e){return e.type==='message'?e.channel||'Message':e.type==='call'?'Call':e.type==='profile'?'Profile':e.type==='date'?'Date':e.type==='source'?'Source':'Note';}
function entryDetail(eid){
  const e=data.entries.find(x=>x.id===eid);if(!e||e.deletedAt)return recentScreen();
  const from=person(e.fromPersonId),to=person(e.toPersonId);
  const head=`${detailHeader(entryTitle(e),e.at?`${fmtDate(e.at)} · ${fmtTime(e.at)}`:e.pastedAt?`Pasted ${fmtDate(e.pastedAt)}`:'Date unknown')}<div class="profile-card"><h3>${e.direction==='in'?`${esc(from?.name||'Someone')} → Me`:e.direction==='out'?`Me → ${esc(to?.name||'Someone')}`:'Activity'}</h3><div class="profile-text">${esc(e.text||'')}</div></div>`;
  const sent=e.sentText?`<div class="profile-card entry-sent"><h3>What was sent</h3><div class="profile-text">${esc(e.sentText)}</div></div>`:'';
  const rest=(e.about||[]).slice(1).map(a=>`<div class="info-row"><div class="info-label">Also about</div><div class="info-value">${esc(aboutLabel(a))}</div><span></span></div>`).join('');
  const about=linkedAbout(e)?`<div class="info-card"><div class="info-row"><div class="info-label">About</div><div class="info-value">${esc(linkedAbout(e))}</div><button class="info-action" data-act="open-about" data-entry-id="${e.id}">Open</button></div>${rest}${e.result?`<div class="info-row"><div class="info-label">Result</div><div class="info-value">${esc(e.result)}</div><span></span></div>`:''}</div>`:'';
  const corrections=(e.corrections||[]).map(c=>`<div class="entry-correction">${esc(`Linked to ${c.added.map(aboutLabel).join(', ')} · ${fmtDate(c.at)}`)}</div>`).join('');
  const del=entryChangesRecords(e)?'':`<div class="entry-actions"><button class="ghost-btn" data-act="delete-entry" data-entry-id="${esc(e.id)}">Delete this activity</button></div>`;
  return head+sent+about+corrections+del;
}
