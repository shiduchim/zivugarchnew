'use strict';

// Intake: a pasted message (and its files) waits in "To file" until I say who it is from and what it is
// about. The words are kept exactly as pasted. Until the real time is known it says "Pasted Oct 4";
// no time is invented. Filing changes only the app's reading of it (from, about, when), and the change
// is kept on the entry.

const FILE_KINDS=[['idea','Idea for me'],['shidduch','About a shidduch'],['shadchan','A shadchan'],['list','A list of shadchanim'],['note','Just a note']];

function pasteSheet(){
  openSheet(`<h2>Paste</h2><p class="lead">Paste what someone sent. It waits in To file until you say who it is from and what it is about. The words are kept exactly.</p><div class="field"><label>Message</label><textarea id="pasteText" placeholder="Paste here"></textarea></div>${navigator.clipboard?.readText?'<button class="ghost-btn full paste-clip" data-act="paste-clipboard">Paste from clipboard</button>':''}<div class="field"><label>Files <span style="font-weight:400">(optional)</span></label><input type="file" id="pasteFiles" multiple accept="image/*,application/pdf,audio/*"></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-paste">Save</button></div>`);
}
async function pasteFromClipboard(){try{const t=await navigator.clipboard.readText();const box=document.getElementById('pasteText');if(box&&t)box.value=t;}catch(e){showToast('Long-press the box and choose Paste');}}
async function savePaste(){
  const text=document.getElementById('pasteText')?.value||'',files=[...(document.getElementById('pasteFiles')?.files||[])];
  if(!text.trim()&&!files.length){showToast('Paste a message first');return;}
  const e=addEntry({type:'message',channel:'Pasted',direction:'in',at:null,personIds:[],text,toFile:true,pastedAt:iso()});
  if(files.length){const fs=await storeFiles(files,{entryId:e.id});e.fileIds=fs.map(f=>f.id);}
  await save();closeSheet();render();
  fileSheet(e.id);
}

// Recent shows this row only while something waits.
function toFileRow(){const n=intakeEntries().length;return n?`<button class="to-file-row" data-act="intake"><span class="to-file-icon">${icon('folder')}</span><span class="to-file-copy"><b>To file</b><small>Say who sent it and what it is about</small></span><strong>${n}</strong></button>`:'';}
function intakeSheet(){
  const es=intakeEntries();
  openSheet(`<h2>To file</h2><p class="lead">Pasted messages waiting for you.</p>${es.length?`<div class="warm-stack">${es.map(e=>`<button class="warm-person-row intake-row" data-act="file-entry" data-entry-id="${esc(e.id)}"><div class="warm-activity-icon sky">${icon('folder')}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(String(e.text||'Files').split('\n')[0].slice(0,60))}</strong><time>Pasted ${esc(fmtDate(e.pastedAt))}</time></div><div class="warm-person-line">${esc(e.fileIds?.length?`${e.fileIds.length} file${e.fileIds.length===1?'':'s'}`:'Message')}</div></div><div class="warm-chevron">›</div></button>`).join('')}</div>`:empty('Nothing to file','Pasted messages wait here until you file them.')}<div class="split-actions"><button class="ghost-btn" data-act="paste">Paste</button><button class="primary-btn" data-act="close-sheet">Done</button></div>`);
}

// A first guess at who sent it: a phone number in the text, or a name it starts with ("Miriam Cohen: …").
function guessSender(text){
  const t=String(text||'');
  for(const m of t.match(/\+?\d[\d\s().-]{6,}\d/g)||[]){const n=normPhone(m);const p=n&&livePeople().find(x=>!x.isMe&&normPhone(x.phone)===n);if(p)return p.id;}
  // The first words of the message (after a "[date, time]" a chat export may start with).
  const head=nameTokens(t.split('\n')[0].replace(/^\[[^\]]*\]\s*/,'').split(/[:\-–]/)[0]).slice(0,4);
  const p=head.length&&livePeople().filter(x=>!x.isMe&&nameTokens(x.name).length>=2).sort((a,b)=>nameTokens(b.name).length-nameTokens(a.name).length).find(x=>nameTokens(x.name).every(w=>head.includes(w)));
  return p?.id||'';
}
function otherSingles(){const mineGuy=!!me()?.types?.includes('Guy');return byType(mineGuy?'Girl':'Guy').filter(p=>!p.isMe).sort(byName);}

function fileSheet(eid){
  const e=data.entries.find(x=>x.id===eid&&x.toFile&&!x.deletedAt);if(!e)return;
  const guess=guessSender(e.text),nFiles=(e.fileIds||[]).length;
  const people=livePeople().filter(p=>!p.isMe).sort((a,b)=>(b.types?.includes('Shadchan')-a.types?.includes('Shadchan'))||byName(a,b));
  const shids=liveShidduchim().sort((a,b)=>(shStatus(a)==='ended')-(shStatus(b)==='ended'));
  openSheet(`<h2>File this</h2><div class="profile-card intake-text"><div class="profile-text">${esc(e.text||'(Files only)')}</div><small>Pasted ${esc(fmtDate(e.pastedAt))}${nFiles?` · ${nFiles} file${nFiles===1?'':'s'}`:''}</small></div>
    <input type="hidden" id="fileEntry" value="${esc(e.id)}"><input type="hidden" id="fileKind" value="">
    <div class="form-grid">
      <div class="field"><label>Who sent it?</label><select id="fileFrom"><option value="">Choose…</option><option value="__new">Someone new…</option>${people.map(p=>`<option value="${esc(p.id)}" ${p.id===guess?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field file-new" id="fileNewBox" hidden><label>Their name</label><input id="fileNewName"><label>Phone</label><input id="fileNewPhone" type="tel"></div>
      <div class="field"><label>When was it sent? <span style="font-weight:400">(optional)</span></label><input id="fileWhen" type="datetime-local"></div>
      <div class="field"><label>What is it?</label><div class="option-group file-kinds">${FILE_KINDS.map(([v,l])=>`<button class="option" data-file-kind="${v}">${l}</button>`).join('')}</div></div>
      <div class="field file-part" data-part="idea" hidden><label>Who is suggested?</label><select id="fileIdeaWho"><option value="">Choose…</option><option value="__new">Someone new…</option>${otherSingles().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><input id="fileIdeaName" placeholder="Their name" hidden></div>
      <div class="field file-part" data-part="shidduch" hidden><label>Which shidduch?</label><select id="fileShidduch">${shids.map(s=>`<option value="${esc(s.id)}">${esc(shidduchTitle(s))}${shStatus(s)==='ended'?' (ended)':''}</option>`).join('')}</select></div>
      <div class="field file-part" data-part="list" hidden><label>Name of the list</label><input id="fileListName" placeholder="For example: Rivka's shadchanim"></div>
    </div>
    <div class="split-actions intake-actions"><button class="ghost-btn" data-act="intake-delete" data-entry-id="${esc(e.id)}">Delete</button><button class="ghost-btn" data-act="close-sheet">Later</button><button class="primary-btn" data-act="save-filing">File it</button></div>`);
}
function pickFileKind(v){
  const input=document.getElementById('fileKind');if(input)input.value=v;
  document.querySelectorAll('[data-file-kind]').forEach(b=>b.classList.toggle('active',b.dataset.fileKind===v));
  document.querySelectorAll('.file-part').forEach(x=>{x.hidden=x.dataset.part!==v;});
}
function fileFormChanged(target){
  if(target.id==='fileFrom'){const box=document.getElementById('fileNewBox');if(box)box.hidden=target.value!=='__new';}
  if(target.id==='fileIdeaWho'){const n=document.getElementById('fileIdeaName');if(n)n.hidden=target.value!=='__new';}
}

let filingFlow=null;
function saveFiling(){
  const v=k=>document.getElementById(k)?.value||'';
  const f={entryId:v('fileEntry'),kind:v('fileKind'),from:v('fileFrom'),newName:v('fileNewName').trim(),newPhone:v('fileNewPhone').trim(),when:v('fileWhen'),ideaWho:v('fileIdeaWho'),ideaName:v('fileIdeaName').trim(),shidduchId:v('fileShidduch'),listName:v('fileListName').trim()};
  if(!f.kind){showToast('Choose what it is');return;}
  if(f.from==='__new'&&!f.newName){showToast('Enter their name');return;}
  if(['idea','shadchan','list'].includes(f.kind)&&!f.from){showToast('Choose who sent it');return;}
  if(f.kind==='idea'&&(!f.ideaWho||(f.ideaWho==='__new'&&!f.ideaName))){showToast('Choose who is suggested');return;}
  if(f.kind==='shidduch'&&!f.shidduchId){showToast('Choose the shidduch');return;}
  filingFlow=f;
  // Each new person goes through the one matching check; then the entry is filed.
  const withSender=next=>f.from==='__new'?matchThenUse({name:f.newName,phone:f.newPhone,types:['shadchan','list','idea'].includes(f.kind)?['Shadchan']:[]},pid=>next(pid)):next(f.from||null);
  const withIdea=(fromId,next)=>f.kind!=='idea'?next(fromId,null):f.ideaWho==='__new'?matchThenUse({name:f.ideaName,types:[me()?.types?.includes('Guy')?'Girl':'Guy'],referrerId:fromId},pid=>next(fromId,pid)):next(fromId,f.ideaWho);
  withSender(fromId=>withIdea(fromId,(a,b)=>runOnce('filing',()=>applyFiling(a,b))));
}
async function applyFiling(fromId,otherId){
  const f=filingFlow;filingFlow=null;if(!f)return;
  const e=data.entries.find(x=>x.id===f.entryId);if(!e?.toFile)return;
  const before={fromPersonId:e.fromPersonId,about:[...(e.about||[])],at:e.at};
  e.direction='in';e.fromPersonId=fromId||null;e.toPersonId=me().id;e.personIds=[...new Set([fromId,me().id].filter(Boolean))];
  if(f.when){const t=new Date(f.when);if(!Number.isNaN(t.getTime()))e.at=t.toISOString();}
  const about=[];let filesTo=fromId;
  if(f.kind==='idea'){
    const mineGuy=!!me()?.types?.includes('Guy');
    const i={id:id('idea'),guyId:mineGuy?me().id:otherId,girlId:mineGuy?otherId:me().id,suggestedByPersonId:fromId,createdAt:e.at||e.pastedAt,status:'open',privateReason:'',openedByEntryId:e.id};
    const pair=shidduchForPair(i.guyId,i.girlId);if(pair)i.shidduchId=pair.id;
    data.ideas.push(i);about.push({type:'idea',id:i.id});e.personIds.push(otherId);e.result='Idea';e.changes.push({kind:'idea-opened',ideaId:i.id});
    if(fromId)addOpenItem({direction:'me',personId:fromId,about:{type:'idea',id:i.id},kind:'answer-offer',label:`Answer about ${person(otherId)?.name}`,openedByEntryId:e.id});
    filesTo=otherId;
  }else if(f.kind==='shidduch'){
    const s=shidduch(f.shidduchId),r=currentRound(s);
    about.push({type:'shidduch',id:s.id});if(r)about.push({type:'round',id:r.id});
    e.personIds.push(s.guyId,s.girlId);
  }else if(f.kind==='shadchan'){
    const p=person(fromId);if(p&&!p.types?.includes('Shadchan')){p.types=[...(p.types||[]),'Shadchan'];e.changes.push({kind:'role-added',personId:p.id,role:'Shadchan'});}
    about.push({type:'person',id:fromId});
  }else if(f.kind==='list'){
    const src=createSource({name:f.listName||`${clarityFirstName(person(fromId))}'s list`,kind:'list',fromPersonId:fromId,text:e.text,entry:e});
    about.push({type:'source',id:src.id});
  }else if(fromId)about.push({type:'person',id:fromId});
  e.about=about;e.personIds=[...new Set(e.personIds.filter(Boolean))];
  for(const fid of e.fileIds||[]){const file=data.files.find(x=>x.id===fid);if(file&&!file.personId&&filesTo)file.personId=filesTo;}
  (e.corrections||(e.corrections=[])).push({at:iso(),field:'filed',before,reason:'filed from Intake'});
  delete e.toFile;
  noteListProgress(e);
  await save();closeSheet();render();showToast('Filed');
}
