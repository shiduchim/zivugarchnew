'use strict';

// Storage: one IndexedDB database, opened once and kept open.
// Schema 2 (v1.0) keeps each collection in its own store, keyed by the record's permanent id, so a save
// writes only what changed and later versions can add stores without touching existing data.
// The v58 value kv/state is never changed or deleted: it stays the original the upgrade started from.
const DB_NAME='ZivugMatchDB';
const DB_VERSION=2;
const DATA_SCHEMA=2;
const KV='kv';
const COLLECTIONS=['people','links','entries','sources','ideas','shidduchim','rounds','dates','openItems','profileVersions','files','folders','merges','identityDecisions','attention'];
const SAFETY_MAX=5;

let dbConn=null,dbOpening=null,storageBlocked=false;
let persisted=null;          // collection -> Map(id -> JSON last written)
let persistedOrder={};       // collection -> JSON of the id order last written (lists keep the order records were added)
let saveChain=Promise.resolve();
let safetyCopies=[];         // [{id, at, reason, format, pinned}] newest first

function dbOpen(){
  if(dbConn)return Promise.resolve(dbConn);
  if(dbOpening)return dbOpening;
  dbOpening=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(KV))db.createObjectStore(KV);
      for(const c of COLLECTIONS)if(!db.objectStoreNames.contains(c))db.createObjectStore(c,{keyPath:'id'});
      if(!db.objectStoreNames.contains('blobs'))db.createObjectStore('blobs');
      if(!db.objectStoreNames.contains('copies'))db.createObjectStore('copies',{keyPath:'id'});
    };
    // Another open window of an older version holds the database; the upgrade continues once it closes.
    req.onblocked=()=>{try{showToast('Close other ZivugMatch windows to finish updating');}catch(e){}};
    req.onsuccess=()=>{dbConn=req.result;dbConn.onversionchange=()=>{dbConn.close();dbConn=null;};resolve(dbConn);};
    req.onerror=()=>reject(req.error);
  }).finally(()=>{dbOpening=null;});
  return dbOpening;
}

function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Transaction aborted'));});}
function reqValue(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}

async function kvGet(key){const db=await dbOpen();return reqValue(db.transaction(KV,'readonly').objectStore(KV).get(key));}

// Load v1.0 data, or null when the database holds no v1.0 data yet. Reading never writes.
async function dbLoadAll(){
  const db=await dbOpen();
  const tx=db.transaction([KV,...COLLECTIONS],'readonly');
  const kv=tx.objectStore(KV);
  const metaReq=kv.get('meta'),settingsReq=kv.get('settings');
  const reqs=Object.fromEntries(COLLECTIONS.map(c=>[c,tx.objectStore(c).getAll()]));
  const orderReqs=Object.fromEntries(COLLECTIONS.map(c=>[c,kv.get('order:'+c)]));
  await txDone(tx);
  const meta=metaReq.result;
  if(!meta||!(Number(meta.schema)>=DATA_SCHEMA))return null;
  const d={schema:Number(meta.schema),meta:{...meta},settings:settingsReq.result||{}};
  delete d.meta.schema;
  // A store returns records sorted by id; the saved order puts them back in the order they were added.
  for(const c of COLLECTIONS){
    const rows=reqs[c].result||[],order=orderReqs[c].result||[],pos=new Map(order.map((idv,i)=>[idv,i]));
    d[c]=rows.map((r,i)=>[pos.has(r.id)?pos.get(r.id):order.length+i,r]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  }
  rememberPersisted(d);
  return d;
}

function rememberPersisted(d){persisted={};persistedOrder={};for(const c of COLLECTIONS){persisted[c]=new Map((d[c]||[]).map(r=>[r.id,JSON.stringify(r)]));persistedOrder[c]=JSON.stringify((d[c]||[]).map(r=>r.id));}}

// Write everything that differs from what is stored, in one transaction, together with the schema marker.
// fresh: the stores are cleared first (first write of a new data set), inside the same transaction.
async function persist(d,{fresh=false,extra}={}){
  const db=await dbOpen();
  const stores=[KV,...COLLECTIONS,...(extra?.copies?['copies']:[])];
  const tx=db.transaction(stores,'readwrite');
  const next={},nextOrder={},kvStore=tx.objectStore(KV);
  for(const c of COLLECTIONS){
    const order=JSON.stringify((d[c]||[]).map(r=>r.id));nextOrder[c]=order;
    if(fresh||persistedOrder[c]!==order)kvStore.put(JSON.parse(order),'order:'+c);
    const store=tx.objectStore(c),prev=fresh?new Map():(persisted?.[c]||new Map()),now=new Map();
    if(fresh)store.clear();
    for(const r of d[c]||[]){const j=JSON.stringify(r);now.set(r.id,j);if(prev.get(r.id)!==j)store.put(r);}
    for(const k of prev.keys())if(!now.has(k))store.delete(k);
    next[c]=now;
  }
  const kv=tx.objectStore(KV);
  kv.put({...d.meta,schema:DATA_SCHEMA,appVersion:APP_VERSION},'meta');
  kv.put(d.settings||{},'settings');
  if(extra?.copies){const cs=tx.objectStore('copies');for(const c of extra.copies)cs.put(c);if(extra.copiesIndex)kv.put(extra.copiesIndex,'copiesIndex');}
  await txDone(tx);
  persisted=next;persistedOrder=nextOrder;
}

async function save(){
  if(storageBlocked){showToast('Not saved: local storage is unavailable');return;}
  touchData();
  data.meta.updatedAt=iso();
  const snapshot=data;
  saveChain=saveChain.catch(()=>{}).then(()=>persist(snapshot));
  return saveChain;
}

// Safety copies: before data is replaced as a whole (demo, restore, upgrade), the current data is kept
// in the 'copies' store so it can come back with Undo or from Settings. The "Before v1.0" copy is pinned
// and never rotated out. Newest first.
async function loadSafetyCopies(){try{safetyCopies=(await kvGet('copiesIndex'))||[];}catch(e){safetyCopies=[];}}
function nextCopiesIndex(copy){
  const list=[{id:copy.id,at:copy.at,reason:copy.reason,format:copy.format,pinned:!!copy.pinned},...safetyCopies.filter(x=>x.id!==copy.id)];
  const loose=list.filter(x=>!x.pinned);
  const drop=new Set(loose.slice(SAFETY_MAX).map(x=>x.id));
  return {index:list.filter(x=>!drop.has(x.id)),drop:[...drop]};
}
async function writeCopy(copy){
  const db=await dbOpen();const {index,drop}=nextCopiesIndex(copy);
  const tx=db.transaction(['copies',KV],'readwrite');
  tx.objectStore('copies').put(copy);for(const idv of drop)tx.objectStore('copies').delete(idv);
  tx.objectStore(KV).put(index,'copiesIndex');
  await txDone(tx);safetyCopies=index;return copy.id;
}
async function keepSafetyCopy(reason){
  if(storageBlocked)return null;
  return writeCopy({id:id('safe'),at:iso(),reason,format:'v1',data:JSON.parse(JSON.stringify(dataForCopy(data)))});
}
async function getSafetyCopy(copyId){const db=await dbOpen();return reqValue(db.transaction('copies','readonly').objectStore('copies').get(copyId));}
async function restoreSafetyCopy(copyId){
  const c=await getSafetyCopy(copyId||safetyCopies.find(x=>!x.pinned)?.id||safetyCopies[0]?.id);
  if(!c){showToast('Nothing to restore');return;}
  const incoming=c.format==='v58'?migrateV58(c.data).data:normalizeV1(c.data);
  const back=await keepSafetyCopy(c.pinned?'restoring data from before v1.0':'restoring earlier data');
  data=incoming;await save();closeSheet();ui.detail=null;ui.screen='recent';render();
  showUndoToast(c.pinned?'Data from before v1.0 restored':'Earlier data restored',back);
}
function dataForCopy(d){const out={schema:DATA_SCHEMA,settings:d.settings,meta:d.meta};for(const c of COLLECTIONS)out[c]=d[c];return out;}

// File contents are stored once, by file id.
async function putBlob(fileId,blob){const db=await dbOpen();const tx=db.transaction('blobs','readwrite');tx.objectStore('blobs').put(blob,fileId);await txDone(tx);}
async function getBlob(fileId){const db=await dbOpen();return reqValue(db.transaction('blobs','readonly').objectStore('blobs').get(fileId));}

// Start-up: load v1.0 data, or upgrade v58 data once, or start with the demo on a fresh install.
// Returns {data, migrated, report}. Throws only when the v58 upgrade itself fails; nothing is written then.
async function loadOrUpgrade(){
  const loaded=await dbLoadAll();
  if(loaded)return {data:normalizeV1(loaded),migrated:false};
  const old=await kvGet('state');
  if(old){
    const at=iso();
    const preCopy={id:'copy_before_v1',at,reason:'the v1.0 upgrade',format:'v58',pinned:true,data:old};
    const legacy=(await kvGet('safetyCopies'))||[];
    const {data:upgraded,report}=migrateV58(old,{now:at});
    upgraded.meta.migration=report;
    // The original v58 state stays in kv/state. Its copy and any v58 safety copies become restorable copies.
    // Records, copies and the schema marker are written in one transaction: all of it, or none of it.
    const copies=[preCopy,...legacy.filter(c=>c&&c.data).map(c=>({id:c.id||id('safe'),at:c.at||null,reason:c.reason||'earlier data',format:'v58',data:c.data}))];
    const index=copies.map(c=>({id:c.id,at:c.at,reason:c.reason,format:c.format,pinned:!!c.pinned}));
    await persist(upgraded,{fresh:true,extra:{copies,copiesIndex:index}});
    safetyCopies=index;
    return {data:upgraded,migrated:true,report};
  }
  const fresh=demoData();
  await persist(fresh,{fresh:true});
  return {data:fresh,migrated:false};
}

// Backups: one JSON file with every record, the settings and every file's content.
async function backupObject(){
  const blobs={};
  for(const f of data.files){try{const b=await getBlob(f.id);if(b)blobs[f.id]=await blobToDataUrl(b);}catch(e){}}
  return {app:'ZivugMatch',version:'1.0',schema:DATA_SCHEMA,exportedAt:iso(),data:dataForCopy(data),blobs};
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function dataUrlToBlob(url){return (await fetch(url)).blob();}
// Read a backup file: a v1.0 backup, or a v58 backup that is upgraded in memory.
function readBackupObject(obj){
  if(obj&&obj.app==='ZivugMatch'&&Number(obj.schema)>=DATA_SCHEMA&&obj.data)return {data:normalizeV1(obj.data),blobs:obj.blobs||{},format:'v1'};
  if(obj&&Array.isArray(obj.people)&&Array.isArray(obj.entries)&&obj.settings)return {data:migrateV58(obj).data,blobs:{},format:'v58'};
  throw new Error('Not a ZivugMatch backup');
}
