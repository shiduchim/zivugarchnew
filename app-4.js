'use strict';

// Actions: every change to the data goes through these functions. Each writes one ledger entry for what
// happened, changes the records it names, saves once, and then shows the result.

// A ledger entry. The words are kept exactly as given; "about" lists every record the moment concerns.
function addEntry(spec){
  const e={id:id('e'),at:spec.at||iso(),type:spec.type||'note',channel:spec.channel||'App',direction:spec.direction||'none',
    fromPersonId:spec.fromPersonId||null,toPersonId:spec.toPersonId||null,
    personIds:[...new Set((spec.personIds||[spec.fromPersonId,spec.toPersonId]).filter(Boolean))],
    about:(spec.about||[]).filter(a=>a&&a.type&&a.id),text:String(spec.text||''),result:spec.result||'',
    fileIds:spec.fileIds||[],changes:spec.changes||[]};
  for(const k of ['private','profileVersionId','profileVersionNumber','toFile','pastedAt'])if(spec[k]!=null)e[k]=spec[k];
  data.entries.push(e);
  return e;
}
function addOpenItem(spec){
  const x={id:id('oi'),direction:spec.direction==='them'?'them':'me',personId:spec.personId||null,about:spec.about||null,kind:spec.kind||'manual',label:String(spec.label||'Next step'),createdAt:spec.createdAt||iso(),status:'open',openedByEntryId:spec.openedByEntryId||null};
  if(spec.dueAt)x.dueAt=spec.dueAt;
  data.openItems.push(x);
  return x;
}
// A frozen profile version. Editing a profile always makes a new one; versions already made never change.
function addProfileVersion(p,text,{entryId=null,origin='edit',fileIds=[]}={}){const v={id:id('pv'),personId:p.id,number:latestProfileNumber(p.id)+1,text:String(text||''),facts:{age:p.age??null,city:p.city||'',occupation:p.occupation||''},fileIds:[...fileIds],createdAt:iso(),origin};if(entryId)v.createdByEntryId=entryId;data.profileVersions.push(v);return v;}
function closeItemRecord(x,{entryId=null,kind='done',at=iso()}={}){x.status='closed';x.closedAt=at;x.closedByEntryId=entryId;x.closeKind=kind;}

async function savePerson(){const name=document.getElementById('fName')?.value.trim();if(!name)return showToast('Enter a name');const types=[...document.querySelectorAll('input[name="fType"]:checked')].map(x=>x.value);if(!types.length)return showToast('Choose at least one role');const p={id:id('p'),name,types,city:document.getElementById('fCity').value.trim(),age:Number(document.getElementById('fAge').value)||undefined,occupation:document.getElementById('fOccupation').value.trim(),phone:document.getElementById('fPhone').value.trim(),email:document.getElementById('fEmail').value.trim(),createdAt:iso(),folderIds:[]};const profile=document.getElementById('fProfile').value.trim();const m=findPersonMatches(p);const dup=m.exact[0]||livePeople().find(x=>normName(x.name)===normName(name));if(dup){showToast(`${dup.name} is likely already here`);ui.detail={type:'person',id:dup.id};ui.detailTab=dup.types?.includes('Shadchan')?'details':'profile';closeSheet();render();return;}data.people.push(p);const e=addEntry({type:'note',personIds:[p.id],about:[{type:'person',id:p.id}],text:`Added ${p.name}.`,changes:[{kind:'person-added',personId:p.id}]});if(profile)addProfileVersion(p,profile,{entryId:e.id,origin:'created'});await save();closeSheet();ui.detail={type:'person',id:p.id};ui.detailTab=p.types.includes('Shadchan')?'details':'profile';render();showToast('Person saved');}
async function saveActivity(){const pid=document.getElementById('aPerson')?.value,type=document.getElementById('aType')?.value,text=document.getElementById('aText')?.value.trim();if(!pid||!text)return showToast('Choose a person and add a note');addEntry({type,channel:type==='call'?'Call':type==='message'?'Message':'App',personIds:[pid],about:[{type:'person',id:pid}],text});await save();closeSheet();render();showToast('Activity saved');}

// An offer is a suggested pair, not a shidduch. An offer for me opens "answer the one who suggested it";
// with no suggester there is nobody to answer, so no item opens.
async function saveIdea(){const guyId=document.getElementById('iGuy').value,girlId=document.getElementById('iGirl').value,by=document.getElementById('iBy').value;if(!guyId||!girlId||guyId===girlId)return showToast('Choose a guy and a girl');const existing=data.ideas.find(i=>samePerson(i.guyId,guyId)&&samePerson(i.girlId,girlId)&&i.status==='open');if(existing){closeSheet();ideaSheet(existing.id);return;}const i={id:id('idea'),guyId,girlId,suggestedByPersonId:by||null,createdAt:iso(),status:'open',privateReason:''};const pair=shidduchForPair(guyId,girlId);if(pair)i.shidduchId=pair.id;data.ideas.push(i);const e=addEntry({type:'status',personIds:[guyId,girlId,by],about:[{type:'idea',id:i.id}],text:`Idea created: ${person(guyId).name} ↔ ${person(girlId).name}.`,result:'Idea',changes:[{kind:'idea-opened',ideaId:i.id}]});i.openedByEntryId=e.id;if(by&&(isMe(guyId)||isMe(girlId)))addOpenItem({direction:'me',personId:by,about:{type:'idea',id:i.id},kind:'answer-offer',label:`Answer about ${isMe(guyId)?person(girlId).name:person(guyId).name}`,openedByEntryId:e.id});await save();closeSheet();ui.screen='shidduchim';ui.screenView.shidduchim='ideas';render();showToast('Offer saved');}
async function saveSource(){const name=document.getElementById('sName').value.trim();if(!name)return showToast('Enter a source name');const src={id:id('src'),name,kind:document.getElementById('sKind').value,createdAt:iso(),lines:[],followUpDays:Number(document.getElementById('sDays').value)||7};data.sources.push(src);const e=addEntry({type:'source',about:[{type:'source',id:src.id}],text:`Added the source ${name}.`,changes:[{kind:'source-added',sourceId:src.id}]});src.entryId=e.id;await save();closeSheet();render();showToast('Source saved');}

// Interested makes (or reopens) the one shidduch of this pair. A round already in progress continues;
// an ended pair starts its next round on the same record. Not applicable creates no shidduch.
async function chooseIdea(iid,yes){
  const i=idea(iid);if(!i||i.status!=='open')return;
  const suggester=i.suggestedByPersonId&&person(i.suggestedByPersonId);
  if(!yes){
    const e=addEntry({type:'status',personIds:[i.guyId,i.girlId],about:[{type:'idea',id:i.id}],text:'Marked not applicable.',result:'Not applicable',changes:[{kind:'idea-closed',ideaId:i.id,decision:'not-applicable'}]});
    i.status='not-applicable';i.closedAt=e.at;i.closedByEntryId=e.id;
    for(const x of openItems().filter(x=>x.about?.type==='idea'&&x.about.id===i.id)){
      if(suggester){x.label=`Tell ${suggester.name}: not applicable`;x.direction='me';x.personId=suggester.id;x.kind='tell-decision';}
      else closeItemRecord(x,{entryId:e.id,kind:'not-needed',at:e.at});
    }
    await save();closeSheet();render();showToast('Offer closed');return;
  }
  let s=shidduchForPair(i.guyId,i.girlId);
  const current=s&&currentRound(s),continuing=current?.status==='active';
  const e=addEntry({type:'status',personIds:[i.guyId,i.girlId,i.suggestedByPersonId],about:[],text:'',result:'Shidduch active',changes:[]});
  if(!s){s={id:id('sh'),guyId:i.guyId,girlId:i.girlId,createdAt:e.at,createdByEntryId:e.id};data.shidduchim.push(s);e.changes.push({kind:'shidduch-created',shidduchId:s.id});}
  let r=current;
  if(!continuing){
    const number=Math.max(0,...roundsOf(s).map(x=>Number(x.number)||0))+1;
    r={id:id('round'),shidduchId:s.id,number,ideaId:i.id,suggestedByPersonId:i.suggestedByPersonId||null,shadchanIds:i.suggestedByPersonId?[i.suggestedByPersonId]:[],startedAt:e.at,startedByEntryId:e.id,status:'active',stage:'Waiting for other side',base:{guy:isMe(i.guyId)?'yes':'unknown',girl:'unknown'}};
    data.rounds.push(r);e.changes.push({kind:'round-started',roundId:r.id,number});
  }
  e.about.push({type:'shidduch',id:s.id},{type:'round',id:r.id},{type:'idea',id:i.id});
  e.text=continuing?`Interested again. Round ${roundNumber(r)} continues.`:`Interested. Round ${roundNumber(r)} started.`;
  i.status='interested';i.closedAt=e.at;i.closedByEntryId=e.id;i.shidduchId=s.id;i.roundId=r.id;
  e.changes.push({kind:'idea-closed',ideaId:i.id,decision:'interested'});
  for(const x of openItems().filter(x=>x.about?.type==='idea'&&x.about.id===i.id))closeItemRecord(x,{entryId:e.id,kind:'done',at:e.at});
  if(i.suggestedByPersonId&&!openForShidduch(s.id,'them').some(x=>samePerson(x.personId,i.suggestedByPersonId)))addOpenItem({direction:'them',personId:i.suggestedByPersonId,about:{type:'shidduch',id:s.id},kind:'other-side',label:'Other side answer',openedByEntryId:e.id});
  await save();closeSheet();ui.detail={type:'shidduch',id:s.id};ui.detailTab='overview';render();showToast(continuing?'Shidduch already in progress':'Shidduch started');
}

// Completing an open item closes exactly that item and writes what happened to the history.
async function closeOpenItem(itemId,kind){const x=openItem(itemId);if(!x||x.status!=='open')return;const heard=x.direction==='them';kind=kind||(heard?'heard-back':'done');const word=kind==='not-needed'?'Not needed':heard?'Heard back':'Done';const e=addEntry({type:'status',personIds:[x.personId],about:x.about?[x.about]:[],text:`${word}: ${x.label}`,result:word,changes:[{kind:'item-closed',itemId:x.id,closeKind:kind}]});closeItemRecord(x,{entryId:e.id,kind,at:e.at});await save();closeSheet();render();showActionToast(kind==='not-needed'?'Marked as not needed':heard?'Marked as heard back':'Marked as done',{act:'undo-close-item',itemId:x.id,entryId:e.id});}
async function undoCloseOpenItem(itemId,entryId){const x=openItem(itemId);if(!x||x.closedByEntryId!==entryId)return;x.status='open';delete x.closedAt;delete x.closedByEntryId;delete x.closeKind;data.entries=data.entries.filter(e=>e.id!==entryId);await save();render();showToast('Reopened');}

// WhatsApp needs the international form: Israeli local numbers (05x…, 0x…) become 972…, and a 00 prefix is dropped.
function waNumber(phone){let d=phoneDigits(phone);if(d.startsWith('00'))d=d.slice(2);else if(d.startsWith('0'))d='972'+d.slice(1);return d;}
function contactUrl(p,kind){if(kind==='call'&&phoneDigits(p.phone))return`tel:${p.phone}`;if(kind==='sms'&&phoneDigits(p.phone))return`sms:${p.phone}`;if(kind==='email'&&p.email)return`mailto:${encodeURIComponent(p.email)}`;if(kind==='wa'&&phoneDigits(p.phone))return`whatsapp://send?phone=${waNumber(p.phone)}`;return'';}
// A contact is written to the history only when the app actually opens the call, message or email.
async function logContact(pid,kind){const p=person(pid);if(!p)return;const channel=kind==='call'?'Call':kind==='wa'?'WhatsApp':kind==='sms'?'SMS':'Email';const url=contactUrl(p,kind);if(!url){showToast(`Add ${kind==='email'?'an email':'a phone number'} to use ${channel}`);return;}addEntry({type:kind==='call'?'call':'message',channel,direction:'out',fromPersonId:me().id,toPersonId:p.id,personIds:[me().id,p.id],about:[{type:'person',id:p.id}],text:`${channel} opened.`});await save();render();location.href=url;}

// Backups: one JSON file with every record, the settings and every file's content.
async function exportBackup(){try{const obj=await backupObject();const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ZivugMatch_${APP_VERSION_LABEL}_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Backup exported');}catch(e){console.error(e);showToast('Could not export the backup');}}
async function importBackup(file){let incoming;try{incoming=readBackupObject(JSON.parse(await file.text()));}catch(e){showToast('Could not restore this file');return;}const copyId=await keepSafetyCopy('restoring a backup');for(const [fid,url] of Object.entries(incoming.blobs||{})){try{await putBlob(fid,await dataUrlToBlob(url));}catch(e){}}data=incoming.data;await save();closeSheet();ui.detail=null;ui.screen='recent';render();showUndoToast('Backup restored',copyId);}

function openAbout(entry){const a=entry.about?.[0];if(!a)return;if(a.type==='person')ui.detail={type:'person',id:canonId(a.id)};else if(a.type==='shidduch')ui.detail={type:'shidduch',id:shidduch(a.id)?.id||a.id};else if(a.type==='round'){const r=round(a.id);if(r)ui.detail={type:'shidduch',id:shidduch(r.shidduchId)?.id||r.shidduchId};}else if(a.type==='source')ui.detail={type:'source',id:a.id};else if(a.type==='idea'){closeSheet();ideaSheet(a.id);return;}else if(a.type==='date'){const d=dateById(a.id);const sid=d?.shidduchId||round(d?.roundId)?.shidduchId;if(sid)ui.detail={type:'shidduch',id:shidduch(sid)?.id||sid};}ui.detailTab='overview';render();}
