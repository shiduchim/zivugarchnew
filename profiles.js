'use strict';

// Profiles: a person's current facts can change, but every profile version is frozen once made.
// Editing a profile makes a new version; a send always points to the exact version that went out,
// so "what exactly did I send?" is answered from the record, never rebuilt from today's profile.

function addProfileVersion(p,text,{entryId=null,origin='edit',fileIds=[]}={}){
  const v={id:id('pv'),personId:p.id,number:latestProfileNumber(p.id)+1,text:String(text||''),language:textLanguage(text),facts:{age:personAge(p)||null,city:p.city||'',occupation:p.occupation||''},fileIds:[...fileIds],createdAt:iso(),origin};
  if(entryId)v.createdByEntryId=entryId;
  data.profileVersions.push(v);
  return v;
}

// A version's language: Hebrew when it is written in Hebrew letters (worked out the same way for older versions).
function textLanguage(t){return /[\u0590-\u05FF]/.test(String(t||''))?'Hebrew':'English';}
// Which version of my profile a person has, worked out from the sends in the history.
function myProfileVersion(){return latestProfileNumber(me()?.id)||1;}
function sentVersionNumber(e){return Number(profileVersion(e.profileVersionId)?.number)||Number(e.profileVersionNumber)||Number(/v(\d+)/.exec(e.text||'')?.[1])||0;}
function profileSentTo(pid,subjectId=me()?.id){let best=0;for(const e of entriesForPerson(pid)){if(e.type!=='profile'||e.direction!=='out'||!samePerson(e.toPersonId,pid))continue;const subject=entryAbout(e,'person')[0]||(isMe(e.fromPersonId)?me().id:null);if(!samePerson(subject,subjectId))continue;const v=sentVersionNumber(e);if(v>best)best=v;}return best;}
function myProfileStatus(pid){const cur=myProfileVersion(),sent=profileSentTo(pid);return !sent?`Not sent yet · v${cur} ready`:sent<cur?`Has v${sent} · v${cur} ready`:`Has v${sent}`;}
// Who received each version (for the "earlier versions" list).
function versionRecipients(v){return [...new Set(liveEntries().filter(e=>e.type==='profile'&&e.direction==='out'&&e.toPersonId&&(e.profileVersionId===v.id||(!e.profileVersionId&&samePerson(entryAbout(e,'person')[0]||e.fromPersonId,v.personId)&&sentVersionNumber(e)===v.number))).map(e=>person(e.toPersonId)?.name).filter(Boolean))];}

function profileVersionsSheet(pid){
  const p=person(pid);if(!p)return;
  const vs=profileVersionsOf(pid).slice().reverse();
  openSheet(`<h2>Profile versions</h2><p class="lead">Each version stays exactly as it was. Sending always uses one of these.</p>${vs.map(v=>{const to=versionRecipients(v);return `<div class="profile-card version-card"><h3>v${v.number}<small>${esc([v.language||textLanguage(v.text),v.createdAt?fmtDate(v.createdAt):'Date unknown'].join(' · '))}</small></h3><div class="profile-text">${esc(v.text)}</div>${to.length?`<div class="version-sent">Sent to ${esc(to.join(', '))}</div>`:''}</div>`;}).join('')||empty('No profile yet','Add profile text with Edit.')}<button class="primary-btn full" data-act="close-sheet">Done</button>`);
}

// Send: only the chosen frozen version, the chosen files and your own words. Nothing else can go out:
// no history, notes, reasons, answers or other files.
let sendFlow=null;
function sendProfileSheet(subjectId,toId=null){
  const subject=person(subjectId);if(!subject)return;
  const versions=profileVersionsOf(subject.id).slice().reverse();
  if(!versions.length){showToast(subject.isMe?'Add your profile first (Edit)':'Add a profile first (Edit)');return;}
  const files=filesOf(subject.id);
  const recipients=livePeople().filter(p=>!samePerson(p.id,subject.id)&&!p.isMe).sort((a,b)=>(b.types?.includes('Shadchan')-a.types?.includes('Shadchan'))||byName(a,b));
  sendFlow={subjectId:subject.id};
  const whose=subject.isMe?'my profile':`${subject.name}'s profile`;
  openSheet(`<h2>Send ${esc(whose)}</h2><p class="lead">Only what you choose here is sent: this profile, the files you tick, and your words.</p>
    <div class="form-grid">
      <div class="field"><label>To</label>${toId?`<input type="hidden" id="sendTo" value="${esc(canonId(toId))}"><div class="send-to">${esc(person(toId)?.name||'')}</div>`:`<select id="sendTo"><option value="">Choose…</option>${recipients.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select>`}</div>
      <div class="field"><label>Version</label><select id="sendVersion">${versions.map(v=>`<option value="${esc(v.id)}">v${v.number} · ${esc(v.createdAt?fmtDate(v.createdAt):'date unknown')}</option>`).join('')}</select></div>
      ${files.length?`<div class="field"><label>Files</label><div class="sheet-section send-files">${files.map(f=>`<label class="checkbox-row"><input type="checkbox" name="sendFile" value="${esc(f.id)}"> ${esc(f.name)}</label>`).join('')}</div></div>`:''}
      <div class="field"><label>What for?</label><select id="sendPurpose"><option value="send">Just send</option><option value="opinion">Ask for an opinion</option></select></div>
      <div class="field"><label>Your words <span style="font-weight:400">(optional)</span></label><textarea id="sendWords" placeholder="A short message"></textarea></div>
    </div>
    <div class="send-preview-label">What will be sent</div><div class="send-preview" id="sendPreview"></div>
    <div class="send-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="ghost-btn" data-send="copy">Copy</button><button class="ghost-btn" data-send="share">Share</button><button class="primary-btn" data-send="whatsapp">WhatsApp</button></div>`);
  updateSendPreview();
}
function sendChoice(){
  const v=profileVersion(document.getElementById('sendVersion')?.value);
  const fileIds=[...document.querySelectorAll('input[name="sendFile"]:checked')].map(x=>x.value);
  const words=document.getElementById('sendWords')?.value.trim()||'';
  return {to:person(document.getElementById('sendTo')?.value),v,fileIds,words,purpose:document.getElementById('sendPurpose')?.value||'send'};
}
function composeSendText(c){return [c.words,c.v?.text||''].filter(Boolean).join('\n\n');}
function updateSendPreview(){const el=document.getElementById('sendPreview');if(!el)return;const c=sendChoice();const names=c.fileIds.map(fid=>data.files.find(f=>f.id===fid)?.name).filter(Boolean);el.textContent=composeSendText(c)+(names.length?`\n\nFiles: ${names.join(', ')}`:'');}
// The send is written to the history first (with the exact version, files and words), then handed to
// WhatsApp, the share sheet or the clipboard. Every send, single or from a list, goes through these two.
function recordSend({subjectId,toId,version,fileIds=[],words='',purpose='send',how='copy'}){
  const subject=person(subjectId),to=person(toId),text=composeSendText({words,v:version});
  const whose=subject.isMe?'my profile':`${subject.name}'s profile`;
  const e=addEntry({type:'profile',channel:how==='whatsapp'?'WhatsApp':how==='share'?'Shared':'Copied',direction:'out',fromPersonId:me().id,toPersonId:to.id,personIds:[me().id,to.id],about:[{type:'person',id:subject.id}],text:`Sent ${whose} v${version.number} to ${to.name}.`,profileVersionId:version.id,profileVersionNumber:version.number,fileIds:[...fileIds],sentText:text,changes:[{kind:'profile-sent',profileVersionId:version.id,purpose}]});
  if(purpose==='opinion')addOpenItem({direction:'them',personId:to.id,about:{type:'person',id:subject.id},kind:'opinion',label:`Opinion on ${whose}`,openedByEntryId:e.id});
  return {entry:e,text};
}
async function deliverSend(how,to,text,fileIds=[]){
  try{
    if(how==='whatsapp'){const n=waNumber(to.phone||'');location.href=`whatsapp://send?${n?`phone=${n}&`:''}text=${encodeURIComponent(text)}`;}
    else if(how==='share'&&navigator.share){const files=[];for(const fid of fileIds){const meta=data.files.find(x=>x.id===fid),blob=await getBlob(fid);if(meta&&blob)files.push(new File([blob],meta.name,{type:meta.mime||blob.type}));}await navigator.share(files.length&&navigator.canShare?.({files})?{text,files}:{text});}
    else await navigator.clipboard.writeText(text);
  }catch(err){}
}
async function confirmSend(how){
  const f=sendFlow,c=sendChoice();if(!f||!c.v)return;
  if(!c.to){showToast('Choose who to send it to');return;}
  const {text}=recordSend({subjectId:f.subjectId,toId:c.to.id,version:c.v,fileIds:c.fileIds,words:c.words,purpose:c.purpose,how});
  sendFlow=null;
  await save();closeSheet();render();showToast('Profile send saved');
  await deliverSend(how,c.to,text,c.fileIds);
}

// Send my profile to everyone on a list I have not contacted yet: choose the version, files and words
// once, then go through the people one by one (WhatsApp opens one chat at a time). Each send is saved
// as its own entry with the exact version, so the list's counts update as I go.
let listSendFlow=null;
function listNotContacted(src){return sourcePeopleIds(src).map(person).filter(p=>p&&!p.isMe&&!listProgress(p.id,src).contacted);}
function listSendSheet(sid){
  const src=source(sid),mine=me();if(!src||!mine)return;
  const versions=profileVersionsOf(mine.id).slice().reverse();
  if(!versions.length){showToast('Add your profile first (Edit)');return;}
  const people=listNotContacted(src);if(!people.length){showToast('Everyone on this list has been contacted');return;}
  const files=filesOf(mine.id);
  sendFlow={subjectId:mine.id};
  openSheet(`<h2>Send my profile</h2><p class="lead">${esc(src.name)}: the ${people.length} not contacted yet. You choose the version and words once, then send to each one in turn.</p>
    <div class="form-grid">
      <div class="field"><label>To</label><div class="sheet-section list-send-people">${people.map(p=>`<label class="checkbox-row"><input type="checkbox" name="listSendTo" value="${esc(p.id)}" checked> ${esc(p.name)}${phoneDigits(p.phone)?'':' <small>· no number</small>'}</label>`).join('')}</div></div>
      <div class="field"><label>Version</label><select id="sendVersion">${versions.map(v=>`<option value="${esc(v.id)}">v${v.number} · ${esc(v.createdAt?fmtDate(v.createdAt):'date unknown')}</option>`).join('')}</select></div>
      ${files.length?`<div class="field"><label>Files</label><div class="sheet-section send-files">${files.map(f=>`<label class="checkbox-row"><input type="checkbox" name="sendFile" value="${esc(f.id)}"> ${esc(f.name)}</label>`).join('')}</div></div>`:''}
      <div class="field"><label>What for?</label><select id="sendPurpose"><option value="send">Just send</option><option value="opinion">Ask for an opinion</option></select></div>
      <div class="field"><label>Your words <span style="font-weight:400">(optional)</span></label><textarea id="sendWords" placeholder="A short message"></textarea></div>
    </div>
    <div class="send-preview-label">What will be sent to each</div><div class="send-preview" id="sendPreview"></div>
    <input type="hidden" id="listSendSource" value="${esc(src.id)}">
    <div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="list-send-start">Start</button></div>`);
  updateSendPreview();
}
function startListSend(){
  const c=sendChoice(),srcId=document.getElementById('listSendSource')?.value;
  const queue=[...document.querySelectorAll('input[name="listSendTo"]:checked')].map(x=>x.value);
  if(!c.v||!srcId)return;if(!queue.length){showToast('Choose at least one person');return;}
  listSendFlow={sourceId:srcId,subjectId:me().id,versionId:c.v.id,fileIds:c.fileIds,words:c.words,purpose:c.purpose,queue,index:0,sent:0,skipped:0};
  sendFlow=null;listSendStepSheet();
}
function listSendStepSheet(){
  const f=listSendFlow;if(!f)return;
  const p=person(f.queue[f.index]);if(!p){finishListSend();return;}
  const v=profileVersion(f.versionId);
  openSheet(`<h2>${esc(p.name)}</h2><p class="lead">${f.index+1} of ${f.queue.length} · ${esc(source(f.sourceId)?.name||'')}</p><div class="send-preview">${esc(composeSendText({words:f.words,v}))}</div><div class="split-actions three list-send-step"><button class="ghost-btn" data-list-send="skip" data-person-id="${esc(p.id)}">Skip</button><button class="ghost-btn" data-list-send="copy" data-person-id="${esc(p.id)}">Copy</button><button class="primary-btn" data-list-send="whatsapp" data-person-id="${esc(p.id)}">WhatsApp</button></div><button class="ghost-btn full" data-act="list-send-stop" style="margin-top:8px">Stop here</button>`);
}
async function listSendStep(how,pid){
  const f=listSendFlow;if(!f||f.queue[f.index]!==pid)return; // a second tap on the same person does nothing
  f.index++;
  if(how==='skip'){f.skipped++;listSendStepSheet();return;}
  const to=person(pid),version=profileVersion(f.versionId);
  const {text}=recordSend({subjectId:f.subjectId,toId:pid,version,fileIds:f.fileIds,words:f.words,purpose:f.purpose,how});
  f.sent++;
  await save();render();
  if(f.index<f.queue.length)listSendStepSheet();else finishListSend();
  await deliverSend(how,to,text,f.fileIds);
}
function finishListSend(){const f=listSendFlow;listSendFlow=null;closeSheet();render();if(f)showToast(`Sent to ${f.sent}${f.skipped?` · ${f.skipped} skipped`:''}`);}
