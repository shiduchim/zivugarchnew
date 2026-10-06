'use strict';

// Profiles: a person's current facts can change, but every profile version is frozen once made.
// Editing a profile makes a new version; a send always points to the exact version that went out,
// so "what exactly did I send?" is answered from the record, never rebuilt from today's profile.

function addProfileVersion(p,text,{entryId=null,origin='edit',fileIds=[]}={}){
  const v={id:id('pv'),personId:p.id,number:latestProfileNumber(p.id)+1,text:String(text||''),facts:{age:p.age??null,city:p.city||'',occupation:p.occupation||''},fileIds:[...fileIds],createdAt:iso(),origin};
  if(entryId)v.createdByEntryId=entryId;
  data.profileVersions.push(v);
  return v;
}

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
  openSheet(`<h2>Profile versions</h2><p class="lead">Each version stays exactly as it was. Sending always uses one of these.</p>${vs.map(v=>{const to=versionRecipients(v);return `<div class="profile-card version-card"><h3>v${v.number}<small>${esc(v.createdAt?fmtDate(v.createdAt):'Date unknown')}</small></h3><div class="profile-text">${esc(v.text)}</div>${to.length?`<div class="version-sent">Sent to ${esc(to.join(', '))}</div>`:''}</div>`;}).join('')||empty('No profile yet','Add profile text with Edit.')}<button class="primary-btn full" data-act="close-sheet">Done</button>`);
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
// WhatsApp, the share sheet or the clipboard.
async function confirmSend(how){
  const f=sendFlow,c=sendChoice();if(!f||!c.v)return;
  if(!c.to){showToast('Choose who to send it to');return;}
  const subject=person(f.subjectId),text=composeSendText(c);
  const whose=subject.isMe?'my profile':`${subject.name}'s profile`;
  const e=addEntry({type:'profile',channel:how==='whatsapp'?'WhatsApp':how==='share'?'Shared':'Copied',direction:'out',fromPersonId:me().id,toPersonId:c.to.id,personIds:[me().id,c.to.id],about:[{type:'person',id:subject.id}],text:`Sent ${whose} v${c.v.number} to ${c.to.name}.`,profileVersionId:c.v.id,profileVersionNumber:c.v.number,fileIds:c.fileIds,sentText:text,changes:[{kind:'profile-sent',profileVersionId:c.v.id,purpose:c.purpose}]});
  if(c.purpose==='opinion')addOpenItem({direction:'them',personId:c.to.id,about:{type:'person',id:subject.id},kind:'opinion',label:`Opinion on ${whose}`,openedByEntryId:e.id});
  sendFlow=null;
  await save();closeSheet();render();showToast('Profile send saved');
  try{
    if(how==='whatsapp'){const n=waNumber(c.to.phone||'');location.href=`whatsapp://send?${n?`phone=${n}&`:''}text=${encodeURIComponent(text)}`;}
    else if(how==='share'&&navigator.share){const files=[];for(const fid of c.fileIds){const meta=data.files.find(x=>x.id===fid),blob=await getBlob(fid);if(meta&&blob)files.push(new File([blob],meta.name,{type:meta.mime||blob.type}));}await navigator.share(files.length&&navigator.canShare?.({files})?{text,files}:{text});}
    else await navigator.clipboard.writeText(text);
  }catch(err){}
}
