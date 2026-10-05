'use strict';

// ZivugMatch architecture engine v59.
// Implements the decided one-ledger / permanent-ID architecture without replacing the current UI.
// Existing scalar fields remain only as compatibility caches for older screens; the canonical history
// is the ledger plus permanent records.

const ZM_ARCH_VERSION=2;
let zmArchDirty=false;
let zmArchPersistTimer=0;

function zmArchArray(name){if(!Array.isArray(data[name])){data[name]=[];zmArchDirty=true;}return data[name];}
function zmArchClone(v){return JSON.parse(JSON.stringify(v));}
function zmArchUnique(a){return [...new Set((a||[]).filter(Boolean))];}
function zmArchNow(){return iso();}
function zmArchNormPhone(v){return phoneDigits(v||'');}
function zmArchNormEmail(v){return String(v||'').trim().toLowerCase();}
function zmArchNormName(v){
  return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(mr|mrs|ms|rabbi|rav|rebbe|dr|הרב|רב)\.?\b/g,'')
    .replace(/[^a-z0-9\u0590-\u05ff\s]/g,' ').replace(/\s+/g,' ').trim();
}
function zmArchPairKey(guyId,girlId){return `${guyId||''}::${girlId||''}`;}
function zmArchLivePeople(){return data.people.filter(p=>!p.mergedIntoId&&!p.deletedAt);}
function zmArchLiveEntries(){return data.entries.filter(e=>!e.deletedAt);}
function zmArchSourceLinePeople(src){
  const ids=(src.lines||[]).map(x=>x.personId).filter(Boolean);
  return ids.length?zmArchUnique(ids):zmArchUnique(src.peopleIds||[]);
}

function zmArchVersionIdFor(personId,number){
  const versions=data.profileVersions||[];
  const n=Number(number)||0;
  return versions.find(v=>v.personId===personId&&Number(v.versionNumber||v.version)===n)?.id||null;
}

function zmArchCreateMigratedProfileVersion(p){
  if(!p||!String(p.profileText||'').trim())return null;
  const n=Number(p.profileVersion)||1;
  let v=(data.profileVersions||[]).find(x=>x.personId===p.id&&Number(x.versionNumber||x.version)===n);
  if(!v){
    v={id:`pv_${p.id}_${n}`,personId:p.id,versionNumber:n,text:String(p.profileText||''),fileIds:[],language:p.profileLanguage||'',createdAt:null,dateUnknown:true,migrated:true,frozen:true};
    data.profileVersions.push(v);zmArchDirty=true;
  }
  if(p.currentProfileVersionId!==v.id){p.currentProfileVersionId=v.id;zmArchDirty=true;}
  return v;
}

function zmArchSnapshotProfile(p,text,opts={}){
  if(!p)return null;
  const versions=data.profileVersions.filter(v=>v.personId===p.id);
  const current=Math.max(Number(p.profileVersion)||0,...versions.map(v=>Number(v.versionNumber||v.version)||0),0);
  const v={
    id:id('pv'),personId:p.id,versionNumber:current+1,text:String(text||''),
    fileIds:zmArchUnique(opts.fileIds||[]),language:opts.language||p.profileLanguage||'',
    createdAt:opts.createdAt||zmArchNow(),dateUnknown:false,sourceEntryId:opts.sourceEntryId||null,frozen:true
  };
  data.profileVersions.push(v);
  p.currentProfileVersionId=v.id;
  p.profileVersion=v.versionNumber; // compatibility cache
  p.profileText=v.text;             // compatibility cache
  return v;
}

function zmArchCurrentProfileVersion(personId){
  const p=data.people.find(x=>x.id===personId);if(!p)return null;
  if(p.currentProfileVersionId){const v=data.profileVersions.find(x=>x.id===p.currentProfileVersionId);if(v)return v;}
  const versions=data.profileVersions.filter(v=>v.personId===personId).sort((a,b)=>(Number(b.versionNumber)||0)-(Number(a.versionNumber)||0));
  return versions[0]||zmArchCreateMigratedProfileVersion(p);
}

function zmArchNormalizeEntry(e){
  let changed=false;
  if(!e.id){e.id=id('e');changed=true;}
  if(!Object.prototype.hasOwnProperty.call(e,'originalText')){e.originalText=String(e.text||'');changed=true;}
  if(!Array.isArray(e.personIds)){e.personIds=zmArchUnique([e.fromPersonId,e.toPersonId]);changed=true;}else{
    const u=zmArchUnique(e.personIds);if(u.join('|')!==e.personIds.join('|')){e.personIds=u;changed=true;}
  }
  if(!Array.isArray(e.changes)){e.changes=[];changed=true;}
  if(!Array.isArray(e.fileIds)){e.fileIds=[];changed=true;}
  if(!e.about&&e.aboutType&&e.aboutId){e.about={type:e.aboutType,id:e.aboutId};changed=true;}
  if(e.about&&(!e.aboutType||!e.aboutId)){e.aboutType=e.about.type;e.aboutId=e.about.id;changed=true;}
  if(!e.profileVersionId&&e.profileVersion){
    let owner=null;
    if(e.aboutType==='person')owner=e.aboutId;
    else if(e.direction==='out')owner=e.fromPersonId;
    const vid=owner?zmArchVersionIdFor(owner,e.profileVersion):null;
    if(vid){e.profileVersionId=vid;changed=true;}
  }
  if(e.immutable!==true){e.immutable=true;changed=true;}
  if(changed)zmArchDirty=true;
}

function zmArchNormalizeSource(src){
  if(!src.id){src.id=id('src');zmArchDirty=true;}
  if(!Array.isArray(src.lines)){
    src.lines=(src.peopleIds||[]).map((pid,i)=>({id:`sl_${src.id}_${i+1}`,originalText:data.people.find(p=>p.id===pid)?.name||'',personId:pid||null,status:pid?'linked':'unlinked'}));
    zmArchDirty=true;
  }
  for(let i=0;i<src.lines.length;i++){
    const line=src.lines[i];if(!line.id){line.id=`sl_${src.id}_${i+1}`;zmArchDirty=true;}
    if(!Object.prototype.hasOwnProperty.call(line,'originalText')){line.originalText=line.personId?(data.people.find(p=>p.id===line.personId)?.name||''):'';zmArchDirty=true;}
    if(!line.status){line.status=line.personId?'linked':'unlinked';zmArchDirty=true;}
  }
  const ids=zmArchUnique(src.lines.map(x=>x.personId));
  if(JSON.stringify(ids)!==JSON.stringify(src.peopleIds||[])){src.peopleIds=ids;zmArchDirty=true;} // compatibility view
  if(!Number.isFinite(Number(src.followUpDays))){src.followUpDays=7;zmArchDirty=true;}
}

function zmArchConsolidatePairRecords(){
  const groups=new Map();
  for(const s of data.shidduchim){
    if(s.mergedIntoId)continue;
    s.pairKey=zmArchPairKey(s.guyId,s.girlId);
    const arr=groups.get(s.pairKey)||[];arr.push(s);groups.set(s.pairKey,arr);
  }
  for(const arr of groups.values()){
    if(arr.length<2)continue;
    arr.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id)));
    const keep=arr[0];
    for(const dup of arr.slice(1)){
      for(const r of data.rounds)if(r.shidduchId===dup.id)r.shidduchId=keep.id;
      for(const e of data.entries)if(e.aboutType==='shidduch'&&e.aboutId===dup.id){e.aboutCorrections=e.aboutCorrections||[];e.aboutCorrections.push({from:dup.id,to:keep.id,at:zmArchNow(),reason:'pair consolidation'});e.aboutId=keep.id;e.about={type:'shidduch',id:keep.id};}
      for(const x of data.openItems)if(x.aboutType==='shidduch'&&x.aboutId===dup.id)x.aboutId=keep.id;
      for(const i of data.ideas)if(i.shidduchId===dup.id)i.shidduchId=keep.id;
      keep.shadchanIds=zmArchUnique([...(keep.shadchanIds||[]),...(dup.shadchanIds||[])]);
      dup.mergedIntoId=keep.id;dup.status='merged';
      zmArchDirty=true;
    }
  }
  for(const s of data.shidduchim.filter(x=>!x.mergedIntoId)){
    const rs=data.rounds.filter(r=>r.shidduchId===s.id).sort((a,b)=>(Number(a.number)||0)-(Number(b.number)||0));
    s.roundIds=rs.map(r=>r.id);
    if(!s.currentRoundId&&rs.length){s.currentRoundId=rs[rs.length-1].id;zmArchDirty=true;}
  }
}

function zmArchEnsure(){
  if(!data)return false;
  zmArchDirty=false;
  data.version=Math.max(Number(data.version)||1,2);
  data.meta=data.meta||{createdAt:zmArchNow(),updatedAt:zmArchNow()};
  zmArchArray('people');zmArchArray('entries');zmArchArray('sources');zmArchArray('ideas');zmArchArray('shidduchim');
  zmArchArray('rounds');zmArchArray('dates');zmArchArray('openItems');zmArchArray('profileVersions');zmArchArray('files');zmArchArray('folders');
  zmArchArray('links');zmArchArray('intake');zmArchArray('identityDecisions');zmArchArray('mergeHistory');
  data.redirects=data.redirects||{people:{},shidduchim:{}};
  data.architecture=data.architecture||{};

  for(const p of data.people){
    if(!p.id){p.id=id('p');zmArchDirty=true;}
    p.types=zmArchUnique(p.types||[]);
    if(!p.createdAt){p.createdAt=null;p.dateUnknown=true;zmArchDirty=true;}
    if(p.age&&!Object.prototype.hasOwnProperty.call(p,'ageAsOf')){p.ageAsOf=null;p.ageDateUnknown=true;zmArchDirty=true;}
    if(!Array.isArray(p.folderIds)){p.folderIds=[];zmArchDirty=true;}
    zmArchCreateMigratedProfileVersion(p);
  }
  for(const e of data.entries)zmArchNormalizeEntry(e);
  for(const src of data.sources)zmArchNormalizeSource(src);
  for(const i of data.ideas){
    if(!i.id){i.id=id('idea');zmArchDirty=true;}
    i.pairKey=zmArchPairKey(i.guyId,i.girlId);
    const existing=data.shidduchim.find(s=>!s.mergedIntoId&&s.guyId===i.guyId&&s.girlId===i.girlId);
    if(existing&&!i.shidduchId){i.shidduchId=existing.id;zmArchDirty=true;}
  }
  for(const r of data.rounds){if(!r.id){r.id=id('round');zmArchDirty=true;}}
  for(const d of data.dates){if(!d.id){d.id=id('date');zmArchDirty=true;}if(!Array.isArray(d.fileIds)){d.fileIds=[];zmArchDirty=true;}}
  for(const x of data.openItems){
    if(!x.id){x.id=id('oi');zmArchDirty=true;}
    if(!x.status){x.status='open';zmArchDirty=true;}
    if(!x.openedAt){x.openedAt=x.createdAt||null;zmArchDirty=true;}
    if(!Object.prototype.hasOwnProperty.call(x,'openedByEntryId')){x.openedByEntryId=null;zmArchDirty=true;}
    if(!Object.prototype.hasOwnProperty.call(x,'closedByEntryId')){x.closedByEntryId=null;zmArchDirty=true;}
  }
  zmArchConsolidatePairRecords();
  data.architecture.version=ZM_ARCH_VERSION;
  data.meta.architectureVersion=ZM_ARCH_VERSION;
  return zmArchDirty;
}

function zmArchQueuePersist(){
  if(!data||zmArchPersistTimer)return;
  zmArchPersistTimer=setTimeout(async()=>{zmArchPersistTimer=0;try{data.meta.updatedAt=zmArchNow();await dbPut(STATE_KEY,data);}catch(err){console.warn('Architecture migration save failed',err);}},0);
}

function zmArchEntry(spec={}){
  const text=String(spec.text||'');
  const e={
    id:spec.id||id('e'),at:spec.at||zmArchNow(),type:spec.type||'note',channel:spec.channel||'App',
    direction:spec.direction||'none',fromPersonId:spec.fromPersonId||null,toPersonId:spec.toPersonId||null,
    personIds:zmArchUnique(spec.personIds||[spec.fromPersonId,spec.toPersonId]),
    aboutType:spec.aboutType||null,aboutId:spec.aboutId||null,
    about:(spec.aboutType&&spec.aboutId)?{type:spec.aboutType,id:spec.aboutId}:null,
    text,originalText:text,result:spec.result||'',changes:zmArchClone(spec.changes||[]),
    profileVersionId:spec.profileVersionId||null,fileIds:zmArchUnique(spec.fileIds||[]),immutable:true
  };
  data.entries.push(e);return e;
}

function zmArchSetEntryAbout(entryId,type,idv,reason='user confirmed'){
  const e=data.entries.find(x=>x.id===entryId);if(!e)return false;
  e.aboutCorrections=e.aboutCorrections||[];
  e.aboutCorrections.push({fromType:e.aboutType||null,fromId:e.aboutId||null,toType:type,toId:idv,at:zmArchNow(),reason});
  e.aboutType=type;e.aboutId=idv;e.about={type,id:idv};return true;
}

function zmArchCreateOpenItem(spec={}){
  if(spec.dedupeKey){const same=data.openItems.find(x=>x.status==='open'&&x.dedupeKey===spec.dedupeKey);if(same)return same;}
  const x={
    id:spec.id||id('oi'),direction:spec.direction==='them'?'them':'me',personId:spec.personId||null,
    aboutType:spec.aboutType||'person',aboutId:spec.aboutId||spec.personId||null,roundId:spec.roundId||null,
    label:String(spec.label||'Next step'),createdAt:spec.createdAt||zmArchNow(),openedAt:spec.createdAt||zmArchNow(),
    openedByEntryId:spec.openedByEntryId||null,closedByEntryId:null,status:'open',dedupeKey:spec.dedupeKey||null,
    checkInAt:spec.checkInAt||null,auto:!!spec.auto
  };
  data.openItems.push(x);return x;
}

function zmArchCloseOpenItem(itemId,closingEntryId=null,reason='completed'){
  const x=data.openItems.find(v=>v.id===itemId);if(!x||x.status!=='open')return false;
  x.status='closed';x.closedAt=zmArchNow();x.closedByEntryId=closingEntryId||null;x.closeReason=reason;return true;
}
function zmArchCloseItemsForAbout(type,idv,closingEntryId=null,reason='ended'){
  for(const x of data.openItems.filter(v=>v.status==='open'&&v.aboutType===type&&v.aboutId===idv))zmArchCloseOpenItem(x.id,closingEntryId,reason);
}

function zmArchPairRecord(guyId,girlId){return data.shidduchim.find(s=>!s.mergedIntoId&&s.guyId===guyId&&s.girlId===girlId)||null;}
function zmArchStartRound(s,ideaRecord=null,decisionEntryId=null){
  const prior=data.rounds.filter(r=>r.shidduchId===s.id);
  const n=Math.max(0,...prior.map(r=>Number(r.number)||0))+1;
  const mine=me()?.id;
  const r={id:id('round'),shidduchId:s.id,number:n,createdAt:zmArchNow(),status:'active',stage:'Profile sent',guyStatus:'thinking',girlStatus:'thinking',startedFromIdeaId:ideaRecord?.id||null,statusSources:{}};
  if(mine===s.guyId){r.guyStatus='yes';r.statusSources.guy=decisionEntryId||null;}
  if(mine===s.girlId){r.girlStatus='yes';r.statusSources.girl=decisionEntryId||null;}
  data.rounds.push(r);s.currentRoundId=r.id;s.status='active';s.roundIds=zmArchUnique([...(s.roundIds||[]),r.id]);return r;
}

function zmArchCreateIdeaRecord(guyId,girlId,suggestedByPersonId=null){
  const open=data.ideas.find(i=>i.guyId===guyId&&i.girlId===girlId&&i.status==='open');if(open)return open;
  const pair=zmArchPairRecord(guyId,girlId);
  const i={id:id('idea'),guyId,girlId,pairKey:zmArchPairKey(guyId,girlId),shidduchId:pair?.id||null,suggestedByPersonId:suggestedByPersonId||null,createdAt:zmArchNow(),status:'open',privateReason:''};
  data.ideas.push(i);
  const e=zmArchEntry({type:'status',channel:'App',personIds:[guyId,girlId,suggestedByPersonId],aboutType:'idea',aboutId:i.id,text:`Offer created: ${person(guyId)?.name||'Guy'} - ${person(girlId)?.name||'Girl'}.`,result:'Offer',changes:[{kind:'idea-opened',ideaId:i.id}]});
  const self=me();if(self&&(guyId===self.id||girlId===self.id)){
    const other=guyId===self.id?person(girlId):person(guyId);
    zmArchCreateOpenItem({direction:'me',personId:suggestedByPersonId||self.id,aboutType:'idea',aboutId:i.id,label:`Answer about ${other?.name||'this offer'}`,openedByEntryId:e.id,dedupeKey:`idea-answer:${i.id}`});
  }
  return i;
}

function zmArchRejectIdea(i,reason=''){
  if(!i||i.status!=='open')return null;
  i.status='not-applicable';i.closedAt=zmArchNow();i.privateReason=String(reason||'');
  const e=zmArchEntry({type:'status',channel:'App',personIds:[i.guyId,i.girlId,i.suggestedByPersonId],aboutType:'idea',aboutId:i.id,text:'Marked offer not applicable.',result:'Not applicable',changes:[{kind:'idea-decision',decision:'not-applicable'}]});
  const items=data.openItems.filter(x=>x.status==='open'&&x.aboutType==='idea'&&x.aboutId===i.id);
  for(const x of items){
    if(i.suggestedByPersonId){x.direction='me';x.personId=i.suggestedByPersonId;x.label=`Tell ${person(i.suggestedByPersonId)?.name||'the shadchan'}: not applicable`;x.dedupeKey=`idea-tell-no:${i.id}`;}
    else zmArchCloseOpenItem(x.id,e.id,'no reply needed');
  }
  return e;
}

function zmArchAcceptIdea(i){
  if(!i||i.status!=='open')return null;
  i.status='converted';i.closedAt=zmArchNow();
  let s=zmArchPairRecord(i.guyId,i.girlId);
  if(!s){
    s={id:id('sh'),guyId:i.guyId,girlId:i.girlId,pairKey:zmArchPairKey(i.guyId,i.girlId),createdAt:zmArchNow(),status:'active',currentRoundId:null,roundIds:[],suggestedByPersonId:i.suggestedByPersonId||null,shadchanIds:i.suggestedByPersonId?[i.suggestedByPersonId]:[],private:i.guyId===me()?.id||i.girlId===me()?.id,createdFromIdeaId:i.id};
    data.shidduchim.push(s);
  }else{
    s.shadchanIds=zmArchUnique([...(s.shadchanIds||[]),i.suggestedByPersonId]);
  }
  i.shidduchId=s.id;
  const e=zmArchEntry({type:'status',channel:'App',personIds:[i.guyId,i.girlId,i.suggestedByPersonId],aboutType:'shidduch',aboutId:s.id,text:`Interested in offer from ${person(i.suggestedByPersonId)?.name||'the suggestion'}.`,result:'Interested',changes:[{kind:'idea-converted',ideaId:i.id,shidduchId:s.id}]});
  const activeRound=data.rounds.find(r=>r.shidduchId===s.id&&r.status==='active');
  if(!activeRound)zmArchStartRound(s,i,e.id);else{s.status='active';s.currentRoundId=activeRound.id;}
  for(const x of data.openItems.filter(x=>x.status==='open'&&x.aboutType==='idea'&&x.aboutId===i.id)){
    if(i.suggestedByPersonId){x.direction='me';x.personId=i.suggestedByPersonId;x.label=`Tell ${person(i.suggestedByPersonId)?.name||'the shadchan'}: interested`;x.dedupeKey=`idea-tell-yes:${i.id}`;}
    else zmArchCloseOpenItem(x.id,e.id,'decision recorded');
  }
  return {shidduch:s,entry:e};
}

function zmArchCurrentRound(s){return data.rounds.find(r=>r.id===s?.currentRoundId)||null;}
function zmArchDateRecord(did){return data.dates.find(d=>d.id===did)||null;}
function zmArchDateSave(spec={}){
  const s=spec.shidduchId?zmArchResolvedShidduch(spec.shidduchId):null;
  const r=s?zmArchCurrentRound(s):data.rounds.find(x=>x.id===spec.roundId);
  if(!r)return null;
  let d=spec.id?zmArchDateRecord(spec.id):null;
  const isNew=!d;
  if(!d){
    const n=Math.max(0,...data.dates.filter(x=>x.roundId===r.id).map(x=>Number(x.number)||0))+1;
    d={id:id('date'),roundId:r.id,number:n,when:null,state:'scheduled',guyFeedback:'',girlFeedback:'',fileIds:[]};data.dates.push(d);
  }
  const before={when:d.when||null,state:d.state||'',guyFeedback:d.guyFeedback||'',girlFeedback:d.girlFeedback||''};
  if(Object.prototype.hasOwnProperty.call(spec,'when'))d.when=spec.when||null;
  if(spec.state)d.state=spec.state;
  if(Object.prototype.hasOwnProperty.call(spec,'guyFeedback'))d.guyFeedback=spec.guyFeedback||'';
  if(Object.prototype.hasOwnProperty.call(spec,'girlFeedback'))d.girlFeedback=spec.girlFeedback||'';
  const changes=[];
  if(isNew)changes.push({kind:'date-created',dateId:d.id});
  if(before.when!==d.when&&before.when)changes.push({kind:'date-moved',from:before.when,to:d.when});
  if(before.state!==d.state)changes.push({kind:'date-state',from:before.state,to:d.state});
  if(before.guyFeedback!==d.guyFeedback)changes.push({kind:'date-feedback',side:'guy',value:d.guyFeedback});
  if(before.girlFeedback!==d.girlFeedback)changes.push({kind:'date-feedback',side:'girl',value:d.girlFeedback});
  const sh=data.shidduchim.find(x=>x.id===r.shidduchId);
  const e=zmArchEntry({type:'date',channel:'App',direction:'none',personIds:sh?[sh.guyId,sh.girlId,...(sh.shadchanIds||[])]:[],aboutType:'date',aboutId:d.id,text:`Date ${d.number} ${isNew?'created':'updated'}${d.when?` for ${fmtDate(d.when)}`:''}.`,result:d.state||'',changes});
  if(d.state==='happened'&&sh){
    const goBetween=(sh.shadchanIds||[])[0]||sh.suggestedByPersonId||me()?.id;
    const mine=me()?.id;
    if(mine===sh.guyId){
      if(!d.guyFeedback)zmArchCreateOpenItem({direction:'me',personId:goBetween,aboutType:'shidduch',aboutId:sh.id,roundId:r.id,label:`Give my feedback for Date ${d.number}`,openedByEntryId:e.id,dedupeKey:`date:${d.id}:guy-feedback`});
      if(!d.girlFeedback)zmArchCreateOpenItem({direction:'them',personId:goBetween,aboutType:'shidduch',aboutId:sh.id,roundId:r.id,label:`Other side's feedback for Date ${d.number}`,openedByEntryId:e.id,dedupeKey:`date:${d.id}:girl-feedback`});
    }else if(mine===sh.girlId){
      if(!d.girlFeedback)zmArchCreateOpenItem({direction:'me',personId:goBetween,aboutType:'shidduch',aboutId:sh.id,roundId:r.id,label:`Give my feedback for Date ${d.number}`,openedByEntryId:e.id,dedupeKey:`date:${d.id}:girl-feedback`});
      if(!d.guyFeedback)zmArchCreateOpenItem({direction:'them',personId:goBetween,aboutType:'shidduch',aboutId:sh.id,roundId:r.id,label:`Other side's feedback for Date ${d.number}`,openedByEntryId:e.id,dedupeKey:`date:${d.id}:guy-feedback`});
    }
    if(d.guyFeedback){const x=data.openItems.find(x=>x.status==='open'&&x.dedupeKey===`date:${d.id}:guy-feedback`);if(x)zmArchCloseOpenItem(x.id,e.id,'feedback recorded');}
    if(d.girlFeedback){const x=data.openItems.find(x=>x.status==='open'&&x.dedupeKey===`date:${d.id}:girl-feedback`);if(x)zmArchCloseOpenItem(x.id,e.id,'feedback recorded');}
  }
  return {date:d,entry:e};
}

function zmArchSourceStats(src){
  const pids=zmArchSourceLinePeople(src);let contacted=0,replied=0,follow=0;
  const start=src.createdAt?new Date(src.createdAt).getTime():null;
  for(const pid of pids){
    const es=zmArchLiveEntries().filter(e=>e.personIds?.includes(pid)&&(!start||new Date(e.at).getTime()>=start)).sort((a,b)=>new Date(a.at)-new Date(b.at));
    const firstOut=es.find(e=>e.direction==='out'&&['call','message','profile'].includes(e.type));
    if(firstOut){contacted++;const rep=es.find(e=>e.direction==='in'&&new Date(e.at)>new Date(firstOut.at));if(rep)replied++;else if(Date.now()>new Date(firstOut.at).getTime()+(Number(src.followUpDays)||7)*86400000)follow++;}
  }
  return {total:(src.lines||[]).length||pids.length,contacted,replied,follow,notContacted:Math.max(0,((src.lines||[]).length||pids.length)-contacted)};
}

function zmArchSyncSourceFollowups(){
  for(const src of data.sources){
    if(src.kind!=='list')continue;
    const st=zmArchSourceStats(src),key=`source-followup:${src.id}`;
    const current=data.openItems.find(x=>x.dedupeKey===key&&x.status==='open');
    if(st.follow>0&&!current){
      zmArchCreateOpenItem({direction:'me',personId:src.fromPersonId||me()?.id,aboutType:'source',aboutId:src.id,label:`Follow up on ${src.name}`,dedupeKey:key,auto:true});
    }else if(st.follow===0&&current){zmArchCloseOpenItem(current.id,null,'source caught up');}
  }
}

function zmArchIdentityKey(a,b){return [a,b].sort().join('::');}
function zmArchNotSame(a,b){return data.identityDecisions.some(x=>x.kind==='not-same'&&x.key===zmArchIdentityKey(a,b));}
function zmArchFingerprint(c){return `${zmArchNormName(c.name)}|${zmArchNormPhone(c.phone)}|${zmArchNormEmail(c.email)}|${String(c.city||'').toLowerCase()}`;}
function zmArchFindPersonMatches(candidate,excludeId=null){
  const phone=zmArchNormPhone(candidate.phone),email=zmArchNormEmail(candidate.email),name=zmArchNormName(candidate.name),city=String(candidate.city||'').trim().toLowerCase();
  const fp=zmArchFingerprint(candidate),exact=[],likely=[],similar=[];
  for(const p of zmArchLivePeople()){
    if(p.id===excludeId||zmArchNotSame(fp,p.id))continue;
    const pp=zmArchNormPhone(p.phone),pe=zmArchNormEmail(p.email),pn=zmArchNormName(p.name),pc=String(p.city||'').trim().toLowerCase();
    if((phone&&pp&&phone===pp)||(email&&pe&&email===pe)){exact.push(p);continue;}
    if(name&&pn===name&&((city&&pc===city)||(!city&&!pc))){likely.push(p);continue;}
    if(name&&pn&&(pn.includes(name)||name.includes(pn)||pn.split(' ').pop()===name.split(' ').pop()))similar.push(p);
  }
  return {exact,likely,similar};
}
function zmArchRememberNotSame(candidate,existingId){data.identityDecisions.push({id:id('ident'),kind:'not-same',key:zmArchIdentityKey(zmArchFingerprint(candidate),existingId),candidateFingerprint:zmArchFingerprint(candidate),existingPersonId:existingId,at:zmArchNow()});}

function zmArchInsertPerson(candidate){
  const p={...candidate,id:candidate.id||id('p'),types:zmArchUnique(candidate.types||[]),createdAt:candidate.createdAt||zmArchNow(),folderIds:[],needsNumber:!zmArchNormPhone(candidate.phone)&&!zmArchNormEmail(candidate.email)};
  delete p.profileVersion;const profileText=String(candidate.profileText||'');p.profileText='';p.profileVersion=0;
  data.people.push(p);
  if(profileText)zmArchSnapshotProfile(p,profileText,{createdAt:zmArchNow()});
  const e=zmArchEntry({type:'note',channel:'App',direction:'none',personIds:[p.id],aboutType:'person',aboutId:p.id,text:`Added ${p.name}.`,changes:[{kind:'person-created'}]});
  return {person:p,entry:e};
}

function zmArchMergePeople(fromId,toId){
  if(fromId===toId)return null;
  const from=data.people.find(p=>p.id===fromId&&!p.mergedIntoId),to=data.people.find(p=>p.id===toId&&!p.mergedIntoId);if(!from||!to)return null;
  const invalidPair=data.shidduchim.some(s=>!s.mergedIntoId&&((s.guyId===fromId&&s.girlId===toId)||(s.guyId===toId&&s.girlId===fromId)));
  if(invalidPair)return {error:'These two people are the two sides of a shidduch and cannot be merged.'};
  const snapshot={people:zmArchClone(data.people),entries:zmArchClone(data.entries),sources:zmArchClone(data.sources),ideas:zmArchClone(data.ideas),shidduchim:zmArchClone(data.shidduchim),rounds:zmArchClone(data.rounds),dates:zmArchClone(data.dates),openItems:zmArchClone(data.openItems),profileVersions:zmArchClone(data.profileVersions),links:zmArchClone(data.links)};
  const mergeId=id('merge');data.mergeHistory.push({id:mergeId,fromId,toId,at:zmArchNow(),status:'done',snapshot});
  if(data.mergeHistory.length>3)data.mergeHistory.splice(0,data.mergeHistory.length-3);
  to.types=zmArchUnique([...(to.types||[]),...(from.types||[])]);to.aliases=zmArchUnique([...(to.aliases||[]),from.name,...(from.aliases||[])]);
  for(const k of ['city','phone','email','occupation','age'])if(!to[k]&&from[k])to[k]=from[k];
  for(const e of data.entries){
    if(e.fromPersonId===fromId)e.fromPersonId=toId;if(e.toPersonId===fromId)e.toPersonId=toId;
    if(e.personIds?.includes(fromId))e.personIds=zmArchUnique(e.personIds.map(x=>x===fromId?toId:x));
    if(e.aboutType==='person'&&e.aboutId===fromId){e.aboutCorrections=e.aboutCorrections||[];e.aboutCorrections.push({from:fromId,to:toId,at:zmArchNow(),reason:'person merge'});e.aboutId=toId;e.about={type:'person',id:toId};}
  }
  for(const src of data.sources){if(src.fromPersonId===fromId)src.fromPersonId=toId;for(const line of src.lines||[])if(line.personId===fromId)line.personId=toId;src.peopleIds=zmArchUnique((src.peopleIds||[]).map(x=>x===fromId?toId:x));}
  for(const i of data.ideas){if(i.guyId===fromId)i.guyId=toId;if(i.girlId===fromId)i.girlId=toId;if(i.suggestedByPersonId===fromId)i.suggestedByPersonId=toId;i.pairKey=zmArchPairKey(i.guyId,i.girlId);}
  for(const s of data.shidduchim){if(s.guyId===fromId)s.guyId=toId;if(s.girlId===fromId)s.girlId=toId;if(s.suggestedByPersonId===fromId)s.suggestedByPersonId=toId;s.shadchanIds=zmArchUnique((s.shadchanIds||[]).map(x=>x===fromId?toId:x));s.pairKey=zmArchPairKey(s.guyId,s.girlId);}
  for(const x of data.openItems)if(x.personId===fromId)x.personId=toId;
  for(const v of data.profileVersions)if(v.personId===fromId)v.personId=toId;
  for(const l of data.links){if(l.fromPersonId===fromId)l.fromPersonId=toId;if(l.toPersonId===fromId)l.toPersonId=toId;}
  from.mergedIntoId=toId;from.mergedAt=zmArchNow();data.redirects.people[fromId]=toId;
  zmArchEntry({type:'status',channel:'App',personIds:[toId],aboutType:'person',aboutId:toId,text:`Merged duplicate record ${from.name} into ${to.name}.`,result:'Merged',changes:[{kind:'person-merge',fromId,toId,mergeId}]});
  zmArchConsolidatePairRecords();return {mergeId,person:to};
}
function zmArchUndoLastMerge(){
  const m=[...data.mergeHistory].reverse().find(x=>x.status==='done'&&x.snapshot);if(!m)return false;
  for(const k of ['people','entries','sources','ideas','shidduchim','rounds','dates','openItems','profileVersions','links'])data[k]=zmArchClone(m.snapshot[k]||[]);
  m.status='undone';m.undoneAt=zmArchNow();data.redirects={people:{},shidduchim:{}};zmArchEnsure();return true;
}

function zmArchResolvedPerson(pid){
  let p=data.people.find(x=>x.id===pid);const seen=new Set();while(p?.mergedIntoId&&!seen.has(p.id)){seen.add(p.id);p=data.people.find(x=>x.id===p.mergedIntoId);}return p||null;
}
function zmArchResolvedShidduch(sid){
  let s=data.shidduchim.find(x=>x.id===sid);const seen=new Set();while(s?.mergedIntoId&&!seen.has(s.id)){seen.add(s.id);s=data.shidduchim.find(x=>x.id===s.mergedIntoId);}return s||null;
}

function zmArchEndShidduch(s,stageIndex=0,reason=''){
  if(!s)return null;const labels=typeof ZM_FLOW_STAGE_LABELS!=='undefined'?ZM_FLOW_STAGE_LABELS:['Profile sent','References','Date 1','Date 2','Date 3','Date 4','Date 5','Date 6','Date 7','Date 8','Marriage'];
  const idx=Math.max(0,Math.min(labels.length-1,Number(stageIndex)||0)),label=labels[idx],stamp=zmArchNow();
  s.status='ended';s.endedAt=stamp;s.endedStage=label;s.endedStageIndex=idx;s.endReason=reason||'';
  const r=zmArchCurrentRound(s);if(r){r.status='ended';r.endedAt=stamp;r.endedStage=label;r.endedStageIndex=idx;r.endReason=reason||'';}
  const e=zmArchEntry({type:'status',channel:'App',direction:'none',personIds:[s.guyId,s.girlId,...(s.shadchanIds||[])],aboutType:'shidduch',aboutId:s.id,text:`Shidduch ended at ${label}.${reason?` ${reason}`:''}`,result:'Ended',changes:[{kind:'shidduch-ended',stageIndex:idx,reason:reason||''}]});
  zmArchCloseItemsForAbout('shidduch',s.id,e.id,'shidduch ended');return e;
}

function zmArchAudit(){
  const livePeople=zmArchLivePeople(),pairKeys=data.shidduchim.filter(s=>!s.mergedIntoId).map(s=>zmArchPairKey(s.guyId,s.girlId));
  const exactContacts=new Map();let duplicateContacts=0;
  for(const p of livePeople){for(const key of [zmArchNormPhone(p.phone)&&`p:${zmArchNormPhone(p.phone)}`,zmArchNormEmail(p.email)&&`e:${zmArchNormEmail(p.email)}`].filter(Boolean)){if(exactContacts.has(key))duplicateContacts++;else exactContacts.set(key,p.id);}}
  return {
    version:data.architecture?.version||0,
    people:livePeople.length,ledger:zmArchLiveEntries().length,
    duplicateExactContacts:duplicateContacts,duplicatePairs:pairKeys.length-new Set(pairKeys).size,
    entriesMissingOriginal:data.entries.filter(e=>!Object.prototype.hasOwnProperty.call(e,'originalText')).length,
    recordsMissingIds:[...data.sources,...data.ideas,...data.shidduchim,...data.rounds,...data.dates,...data.openItems].filter(x=>!x.id).length,
    openItemsWithoutAbout:data.openItems.filter(x=>x.status==='open'&&(!x.aboutType||!x.aboutId)).length,
    profileSnapshots:data.profileVersions.length
  };
}

// Replace compatibility readers with redirect/deletion-aware views.
person=function(pid){return zmArchResolvedPerson(pid);};
shidduch=function(sid){return zmArchResolvedShidduch(sid);};
byType=function(type){return zmArchLivePeople().filter(p=>p.types?.includes(type));};
entriesForPerson=function(pid){const rp=zmArchResolvedPerson(pid);const rid=rp?.id||pid;return zmArchLiveEntries().filter(e=>e.personIds?.includes(rid)).sort((a,b)=>new Date(b.at)-new Date(a.at));};
entriesForAbout=function(type,idv){return zmArchLiveEntries().filter(e=>e.aboutType===type&&e.aboutId===idv).sort((a,b)=>new Date(b.at)-new Date(a.at));};
lastContact=function(pid){const e=entriesForPerson(pid).find(x=>['call','message','profile'].includes(x.type));return e?.at||null;};
sourceStats=function(src){return zmArchSourceStats(src);};

// One of the user's standing workflow fixes: dates never advance the bar while either side is still thinking.
if(typeof zmStageForShidduch==='function'){
  zmStageForShidduch=function(s){
    if(!s)return {index:0,label:ZM_FLOW_STAGE_LABELS[0]};
    if(s.status==='ended'){
      const idx=Number.isInteger(s.endedStageIndex)?s.endedStageIndex:zmFlowStageIndexFromLabel(s.endedStage);
      if(idx!=null)return {index:idx,label:ZM_FLOW_STAGE_LABELS[idx]||s.endedStage||'Profile sent'};
    }
    const r=zmArchCurrentRound(s),raw=String(r?.stage||'').toLowerCase();
    if(/married|marriage/.test(raw))return {index:10,label:'Marriage'};
    const thinking=['thinking'].includes(String(r?.guyStatus||'').toLowerCase())||['thinking'].includes(String(r?.girlStatus||'').toLowerCase());
    if(thinking){
      const explicit=zmFlowStageIndexFromLabel(raw);
      if(explicit===0)return {index:0,label:'Profile sent'};
      return {index:1,label:'References'};
    }
    const ds=data.dates.filter(d=>d.roundId===r?.id&&!/cancel/i.test(String(d.state||''))).sort((a,b)=>(a.number||0)-(b.number||0));
    if(ds.length){const n=Math.min(8,Math.max(1,Math.max(...ds.map(d=>Number(d.number)||0)||[1])));return {index:n+1,label:`Date ${n}`};}
    const explicit=zmFlowStageIndexFromLabel(raw);if(explicit!=null)return {index:explicit,label:ZM_FLOW_STAGE_LABELS[explicit]};
    if(/dating/.test(raw))return {index:2,label:'Date 1'};
    return {index:0,label:'Profile sent'};
  };
}

const zmArchSaveBefore=save;
save=async function(){zmArchEnsure();zmArchSyncSourceFollowups();data.architecture.lastAudit=zmArchAudit();return zmArchSaveBefore();};
const zmArchRenderBefore=render;
render=function(){const changed=zmArchEnsure();zmArchSyncSourceFollowups();data.architecture.lastAudit=zmArchAudit();const out=zmArchRenderBefore();if(changed||zmArchDirty)zmArchQueuePersist();return out;};

window.ZivugArchitecture={
  version:ZM_ARCH_VERSION,audit:zmArchAudit,ensure:zmArchEnsure,entry:zmArchEntry,
  createOpenItem:zmArchCreateOpenItem,closeOpenItem:zmArchCloseOpenItem,setEntryAbout:zmArchSetEntryAbout,
  createIdea:zmArchCreateIdeaRecord,acceptIdea:zmArchAcceptIdea,rejectIdea:zmArchRejectIdea,
  saveDate:zmArchDateSave,currentProfileVersion:zmArchCurrentProfileVersion,snapshotProfile:zmArchSnapshotProfile,
  findPersonMatches:zmArchFindPersonMatches,mergePeople:zmArchMergePeople,undoLastMerge:zmArchUndoLastMerge
};

if(data){if(zmArchEnsure())zmArchQueuePersist();render();}
