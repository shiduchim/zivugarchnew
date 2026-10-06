'use strict';

// The one-time upgrade of v58 data (one 'state' object) to v1.0 records (schema 2).
// migrateV58 is pure: it works on a deep copy and never touches storage, the screen or its input.
// Rules: keep every permanent ID; never invent a date or a history entry; never delete a record;
// never merge people or pairs. Anything ambiguous is kept as it is and listed in data.attention.

function isV1Data(d){return !!d&&Number(d.schema)>=DATA_SCHEMA;}

// In memory only: every list exists, settings and meta are objects, a retired skin falls back to Classic.
function normalizeV1(d){
  for(const c of COLLECTIONS)if(!Array.isArray(d[c]))d[c]=[];
  if(!d.meta||typeof d.meta!=='object')d.meta={};
  d.settings={...defaultSettings(),...(d.settings&&typeof d.settings==='object'?d.settings:{})};
  if(!FINAL_SKIN_IDS.has(d.settings.skin))d.settings.skin='classic';
  d.schema=DATA_SCHEMA;
  return d;
}

const V58_KNOWN_KEYS=new Set(['version','settings','meta','people','entries','sources','ideas','shidduchim','rounds','dates','openItems','profileVersions','files','folders']);

function migrateV58(old,{now=iso()}={}){
  if(isV1Data(old))return {data:normalizeV1(JSON.parse(JSON.stringify(old))),report:{from:'v1.0',at:now,counts:{},notes:['Already v1.0 data: nothing to upgrade.']}};
  const s=JSON.parse(JSON.stringify(old||{}));
  const report={from:'v58',at:now,counts:{},notes:[]};
  const note=t=>report.notes.push(t);
  const list=k=>Array.isArray(s[k])?s[k].filter(x=>x&&typeof x==='object'):[];
  const d={schema:DATA_SCHEMA,settings:{...defaultSettings(),...(s.settings&&typeof s.settings==='object'?s.settings:{})},meta:{createdAt:s.meta?.createdAt||null,updatedAt:s.meta?.updatedAt||null,demo:!!s.meta?.demo}};
  for(const c of COLLECTIONS)d[c]=[];
  const extra=Object.keys(s).filter(k=>!V58_KNOWN_KEYS.has(k));
  if(extra.length){d.meta.legacy=Object.fromEntries(extra.map(k=>[k,s[k]]));note(`Kept ${extra.length} unknown top-level field(s) under meta.legacy.`);}
  if(!FINAL_SKIN_IDS.has(d.settings.skin||'classic')){note(`The retired skin "${d.settings.skin}" shows as Classic.`);d.settings.skin='classic';}

  // Every record keeps its id. A record without one gets a new id; a repeated id gets a suffix. Both are noted.
  const withIds=(name,prefix)=>{
    const seen=new Set();
    return list(name).map((r,i)=>{
      const q={...r};
      if(!q.id){q.id=`${prefix}_upgrade_${i+1}`;note(`A ${prefix} record without an id got ${q.id}.`);}
      if(seen.has(q.id)){const n=`${q.id}_copy${i+1}`;note(`Two ${name} records shared the id ${q.id}; the later one is now ${n}.`);q.id=n;}
      seen.add(q.id);return q;
    });
  };
  const people=withIds('people','person'),entries=withIds('entries','entry'),sources=withIds('sources','source'),ideas=withIds('ideas','idea');
  const shidduchim=withIds('shidduchim','shidduch'),rounds=withIds('rounds','round'),dates=withIds('dates','date'),items=withIds('openItems','item');
  const nameOf=pid=>people.find(p=>p.id===pid)?.name||'';

  // People: current facts stay on the person; profile text becomes a frozen ProfileVersion.
  for(const p of people){
    const q={...p};
    q.types=[...new Set((Array.isArray(p.types)?p.types:[]).filter(Boolean))];
    if(!q.createdAt){q.createdAt=null;q.createdDateUnknown=true;}
    if(!Array.isArray(q.folderIds))q.folderIds=[];
    delete q.profileText;delete q.profileVersion;
    const text=typeof p.profileText==='string'?p.profileText:'';
    const n=Number(p.profileVersion)||0;
    if(text.trim()){
      const number=Math.max(1,n);
      d.profileVersions.push({id:`pv_${p.id}_${number}`,personId:p.id,number,text,facts:{age:p.age??null,city:p.city||'',occupation:p.occupation||''},fileIds:[],createdAt:null,dateUnknown:true,origin:'upgrade'});
    }else if(n)q.legacyProfileVersion=n; // a version number was shown, but no text was ever saved
    d.people.push(q);
  }
  for(const v of list('profileVersions'))if(v.id&&!d.profileVersions.some(x=>x.id===v.id))d.profileVersions.push({...v});

  // Ledger: one "about" list instead of aboutType/aboutId; the words stay exactly as written.
  for(const e of entries){
    const q={...e};
    const about=[];
    if(e.about&&typeof e.about==='object'&&!Array.isArray(e.about)&&e.about.type&&e.about.id)about.push({type:e.about.type,id:e.about.id});
    else if(Array.isArray(e.about))about.push(...e.about.filter(a=>a&&a.type&&a.id));
    if(e.aboutType&&e.aboutId&&!about.some(a=>a.type===e.aboutType&&a.id===e.aboutId))about.push({type:e.aboutType,id:e.aboutId});
    q.about=about;delete q.aboutType;delete q.aboutId;
    if(!Array.isArray(q.personIds))q.personIds=[...new Set([e.fromPersonId,e.toPersonId].filter(Boolean))];
    if(!q.at){q.at=null;q.dateUnknown=true;}
    if(!Array.isArray(q.fileIds))q.fileIds=[];
    if(!Array.isArray(q.changes))q.changes=[];
    if(e.profileVersion!=null&&e.profileVersion!==''){
      q.profileVersionNumber=Number(e.profileVersion)||null;delete q.profileVersion;
      const owner=about.find(a=>a.type==='person')?.id||(e.direction==='out'?e.fromPersonId:null);
      const pv=d.profileVersions.find(v=>v.personId===owner&&v.number===q.profileVersionNumber);
      if(pv)q.profileVersionId=pv.id;
    }
    d.entries.push(q);
  }

  // Sources: the people on a list become lines. v58 kept no original line text, so the name is used and marked.
  for(const src of sources){
    const q={...src};
    if(!Array.isArray(src.lines))q.lines=(Array.isArray(src.peopleIds)?src.peopleIds:[]).filter(Boolean).map((pid,i)=>({id:`${src.id}_line${i+1}`,personId:pid,text:nameOf(pid),textFromRecord:true}));
    delete q.peopleIds;
    if(!q.createdAt){q.createdAt=null;q.createdDateUnknown=true;}
    d.sources.push(q);
  }

  // Shidduchim and rounds: status, stage, go-betweens and the end now belong to the round.
  const roundsBy=new Map();
  for(const r of rounds){
    const q={...r};
    const base={};
    if(r.guyStatus!=null)base.guy=r.guyStatus;
    if(r.girlStatus!=null)base.girl=r.girlStatus;
    q.base=base;delete q.guyStatus;delete q.girlStatus;
    q.startedAt=r.startedAt||r.createdAt||null;
    if(!q.status)q.status='active';
    (roundsBy.get(q.shidduchId)||roundsBy.set(q.shidduchId,[]).get(q.shidduchId)).push(q);
  }
  for(const sh of shidduchim){
    const q={id:sh.id,guyId:sh.guyId,girlId:sh.girlId,createdAt:sh.createdAt||null};
    if(!q.createdAt)q.createdDateUnknown=true;
    const legacy={};
    for(const k of Object.keys(sh))if(!['id','guyId','girlId','createdAt'].includes(k))legacy[k]=sh[k];
    if(Object.keys(legacy).length)q.legacy=legacy;
    let rs=(roundsBy.get(sh.id)||[]).sort((a,b)=>(Number(a.number)||0)-(Number(b.number)||0));
    if(!rs.length){
      rs=[{id:`${sh.id}_round1`,shidduchId:sh.id,number:1,startedAt:sh.createdAt||null,status:sh.status==='ended'?'ended':'active',base:{},createdByUpgrade:true}];
      note(`${sh.id} had no round; Round 1 was made from the shidduch's own fields.`);
    }
    const current=rs[rs.length-1];
    if(sh.currentRoundId&&sh.currentRoundId!==current.id)note(`${sh.id} pointed to ${sh.currentRoundId} as its current round; the newest round ${current.id} is used.`);
    if(sh.status==='ended'&&current.status!=='ended'){current.status='ended';note(`${current.id} is ended, as its shidduch showed in v58.`);}
    if(sh.status==='active'&&current.status==='ended'){current.status='active';note(`${current.id} is in progress, as its shidduch showed in v58.`);}
    // v58 showed the shidduch's own end fields; they win, and differing round values are kept aside.
    for(const k of ['endedAt','endedStage','endedStageIndex','endReason']){
      if(sh[k]==null)continue;
      if(current[k]!=null&&current[k]!==sh[k]){(current.legacy||(current.legacy={}))[k]=current[k];note(`${current.id}: ${k} taken from its shidduch, as v58 showed it.`);}
      current[k]=sh[k];
    }
    const shads=Array.isArray(sh.shadchanIds)?sh.shadchanIds.filter(Boolean):[];
    for(const r of rs)if(!Array.isArray(r.shadchanIds))r.shadchanIds=[...shads];
    if(sh.suggestedByPersonId&&!rs[0].suggestedByPersonId)rs[0].suggestedByPersonId=sh.suggestedByPersonId;
    d.shidduchim.push(q);d.rounds.push(...rs);roundsBy.delete(sh.id);
  }
  for(const [sid,rs] of roundsBy){d.rounds.push(...rs);note(`${rs.length} round(s) point to a shidduch that does not exist (${sid}); kept as they are.`);}

  // Ideas: "converted" is now "interested", linked to its shidduch when the pair has one.
  for(const i of ideas){
    const q={...i};
    if(q.status==='converted')q.status='interested';
    if(q.status==='interested'&&!q.shidduchId){const sh=d.shidduchim.find(x=>x.guyId===i.guyId&&x.girlId===i.girlId);if(sh)q.shidduchId=sh.id;}
    if(!q.createdAt){q.createdAt=null;q.createdDateUnknown=true;}
    d.ideas.push(q);
  }

  // Dates keep their id; the v58 values become the starting point that later entries build on.
  for(const dt of dates){
    const q={id:dt.id,roundId:dt.roundId||null,number:dt.number,createdAt:dt.createdAt||null};
    q.shidduchId=d.rounds.find(r=>r.id===dt.roundId)?.shidduchId||null;
    if(!q.shidduchId)note(`${dt.id} belongs to no known round; kept as it is.`);
    const base={};
    if(dt.when!=null)base.when=dt.when;
    if(dt.state!=null)base.status=dt.state;
    if(dt.guyFeedback!=null&&dt.guyFeedback!=='')base.guy=dt.guyFeedback;
    if(dt.girlFeedback!=null&&dt.girlFeedback!=='')base.girl=dt.girlFeedback;
    q.base=base;
    for(const k of Object.keys(dt))if(!['id','roundId','number','createdAt','when','state','guyFeedback','girlFeedback'].includes(k))q[k]=dt[k];
    d.dates.push(q);
  }

  // Open items keep their ids and words; "about" becomes one object.
  for(const x of items){
    const q={...x};
    q.about=x.about&&x.about.type?x.about:(x.aboutType&&x.aboutId?{type:x.aboutType,id:x.aboutId}:null);
    delete q.aboutType;delete q.aboutId;
    if(!q.status)q.status='open';
    if(!q.kind)q.kind='manual';
    d.openItems.push(q);
  }

  d.files=withIds('files','file');
  d.folders=withIds('folders','folder');

  // Things the upgrade must not decide: kept, and listed for a later look.
  const pairs=new Map();
  for(const sh of d.shidduchim){const k=`${sh.guyId}|${sh.girlId}`;(pairs.get(k)||pairs.set(k,[]).get(k)).push(sh.id);}
  for(const ids of pairs.values())if(ids.length>1){d.attention.push({id:`att_pair_${ids[0]}`,kind:'duplicate-pair',ids,createdAt:now});note(`${ids.length} shidduch records for the same pair (${ids.join(', ')}) were kept apart for you to check.`);}
  for(const group of exactDuplicateGroups(d.people))d.attention.push({id:`att_people_${group[0]}`,kind:'possible-same-person',ids:group,createdAt:now});

  for(const c of COLLECTIONS)report.counts[c]=d[c].length;
  return {data:d,report};
}
