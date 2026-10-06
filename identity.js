'use strict';

// Identity: one real person = one Person record. This file owns the one matching check that every way
// in uses (add person, file from intake, add to a list, contact card), "not the same person" decisions,
// and safe merges.

// Names are compared as sets of words without titles, accents, Hebrew points, final-letter forms or
// punctuation. (The v59 code removed titles with \b, which never matches next to Hebrew letters.)
const NAME_TITLES=new Set(['mr','mrs','ms','miss','mister','rabbi','rav','reb','rebbetzin','rebbitzen','dr','prof','harav','hagaon','הרב','הרבנית','רב','רבי','ר','מרת','גברת','גב','דר','פרופ','הגאון','מר']);
const HEBREW_FINALS={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
function nameTokens(v){
  const s=String(v||'').normalize('NFKD')
    .replace(/[̀-ͯ]/g,'')
    .replace(/[֑-ׇ]/g,'')
    .toLowerCase()
    .replace(/[ךםןףץ]/g,c=>HEBREW_FINALS[c])
    .replace(/[׳״'"`’‘”“]/g,'')
    .replace(/[^a-z0-9א-ת]+/g,' ')
    .trim();
  return s?s.split(' ').filter(t=>t&&!NAME_TITLES.has(t)):[];
}
function normName(v){return nameTokens(v).sort().join(' ');}
function normEmail(v){return String(v||'').trim().toLowerCase();}
// Phones compare in international form: 05x… and 0x… are Israeli (972…), a 00 prefix is dropped.
function normPhone(v){let d=phoneDigits(v);if(d.startsWith('00'))d=d.slice(2);else if(d.startsWith('0'))d='972'+d.slice(1);return d.length>=7?d:'';}
function normCity(v){return nameTokens(v).join(' ');}

// A rough consonant outline of a word, so "Miriam" and "מרים" can be hinted as maybe the same.
const HEB_TO_LATIN={'א':'','ב':'b','ג':'g','ד':'d','ה':'h','ו':'','ז':'z','ח':'h','ט':'t','י':'','כ':'k','ל':'l','מ':'m','נ':'n','ס':'s','ע':'','פ':'p','צ':'ts','ק':'k','ר':'r','ש':'sh','ת':'t'};
function nameOutline(token){
  let t=/[א-ת]/.test(token)?[...token].map(c=>HEB_TO_LATIN[c]??'').join(''):token.replace(/ch|kh/g,'h').replace(/ph|f/g,'p').replace(/[cq]/g,'k').replace(/w|v/g,'').replace(/x/g,'ks').replace(/tz/g,'ts');
  return t.replace(/[aeiouy]/g,'').replace(/(.)\1+/g,'$1');
}

function livePeople(){return data.people.filter(p=>!p.mergedIntoId&&!p.deletedAt);}
function notSameDecided(a,b){return data.identityDecisions.some(x=>x.kind==='not-same'&&x.ids?.includes(a)&&x.ids?.includes(b));}

// The one matching check. candidate: {name, phone, email, city, referrerId}. Returns
// {exact: same phone or email, likely: same name and same city or referrer, similar: name looks alike}.
function findPersonMatches(candidate,{excludeId=null}={}){
  const phone=normPhone(candidate.phone),email=normEmail(candidate.email),name=normName(candidate.name),city=normCity(candidate.city);
  const tokens=nameTokens(candidate.name),outlines=tokens.map(nameOutline).filter(x=>x.length>=2);
  const exact=[],likely=[],similar=[];
  for(const p of livePeople()){
    if(p.id===excludeId||(excludeId&&notSameDecided(excludeId,p.id)))continue;
    if(candidate.notSameIds?.includes(p.id))continue;
    if((phone&&normPhone(p.phone)===phone)||(email&&normEmail(p.email)===email)){exact.push(p);continue;}
    const pn=normName(p.name);
    const sameReferrer=candidate.referrerId&&sharesReferrer(p.id,candidate.referrerId);
    const pt=nameTokens(p.name),po=pt.map(nameOutline).filter(x=>x.length>=2);
    const outlineMatch=outlines.length&&outlines.every(o=>po.includes(o));
    // The same full name in another script (Hebrew / English): every word matches, in both directions.
    const sameNameAnyScript=pn===name||(outlines.length>=2&&outlines.length===po.length&&outlineMatch);
    if(name&&sameNameAnyScript&&((city&&normCity(p.city)===city)||sameReferrer)){likely.push(p);continue;}
    if(!name||!pn)continue;
    const shared=tokens.filter(t=>t.length>=3&&pt.includes(t)).length;
    if(pn===name||shared>=Math.min(2,tokens.length,pt.length)&&shared>0||outlineMatch)similar.push(p);
  }
  return {exact,likely,similar};
}
// Did this referrer bring the person (a source from them, or a referral/meeting entry with them)?
function sharesReferrer(pid,referrerId){
  if(data.sources.some(s=>s.fromPersonId===referrerId&&s.lines?.some(l=>l.personId===pid)))return true;
  return data.entries.some(e=>!e.deletedAt&&e.type==='referral'&&e.personIds?.includes(pid)&&e.personIds?.includes(referrerId));
}

// People who share a phone or an email (the same real person, or a shared family phone).
function exactDuplicateGroups(people){
  const live=people.filter(p=>!p.mergedIntoId&&!p.deletedAt),parent=new Map(live.map(p=>[p.id,p.id]));
  const find=x=>{while(parent.get(x)!==x)x=parent.get(x);return x;};
  const byKey=new Map();
  for(const p of live)for(const k of [normPhone(p.phone)&&'p'+normPhone(p.phone),normEmail(p.email)&&'e'+normEmail(p.email)].filter(Boolean)){
    if(byKey.has(k))parent.set(find(p.id),find(byKey.get(k)));else byKey.set(k,p.id);
  }
  const groups=new Map();
  for(const p of live){const r=find(p.id);(groups.get(r)||groups.set(r,[]).get(r)).push(p.id);}
  return [...groups.values()].filter(g=>g.length>1);
}

// ---- Decisions and merges -------------------------------------------------------------------------
function rememberNotSame(a,b){
  if(!a||!b||notSameDecided(a,b))return;
  data.identityDecisions.push({id:id('ident'),kind:'not-same',ids:[a,b],at:iso()});
  for(const x of data.attention)if(!x.resolvedAt&&x.kind==='possible-same-person'&&x.ids.includes(a)&&x.ids.includes(b)){x.resolvedAt=iso();x.resolution='not-same';}
}
const MERGE_FIELDS=['phone','email','city','age','ageAsOf','occupation'];
const emptyValue=v=>v==null||String(v).trim()==='';
// Two records can be merged unless one is the guy and the other the girl of the same pair.
function mergeBlocker(a,b){
  const pairs=[...liveShidduchim(),...data.ideas];
  if(pairs.some(x=>(samePerson(x.guyId,a)&&samePerson(x.girlId,b))||(samePerson(x.guyId,b)&&samePerson(x.girlId,a))))return 'These two are the two sides of one shidduch, so they cannot be one person.';
  return '';
}
// Merge: the duplicate keeps its record and points to the kept one. Nothing is copied or rewritten, so
// every screen simply reads the duplicate's history, sources, shidduchim, files and versions as the kept
// person's. The merge record lists exactly which empty fields were filled, for a clean undo.
function mergePeople(keepId,dupId){
  let keep=person(keepId),dup=person(dupId);
  if(!keep||!dup||keep.id===dup.id)return {error:'Choose two different people.'};
  if(dup.isMe&&!keep.isMe)[keep,dup]=[dup,keep];
  const blocked=mergeBlocker(keep.id,dup.id);if(blocked)return {error:blocked};
  const e=addEntry({type:'status',personIds:[keep.id,dup.id],about:[{type:'person',id:keep.id}],text:`Merged ${dup.name||'a record'} into ${keep.name||'this record'}.`,result:'Merged',changes:[]});
  const filled={};
  for(const k of MERGE_FIELDS)if(emptyValue(keep[k])&&!emptyValue(dup[k])){filled[k]=dup[k];keep[k]=dup[k];}
  const addedTypes=(dup.types||[]).filter(t=>!(keep.types||[]).includes(t));
  keep.types=[...(keep.types||[]),...addedTypes];
  const addedFolders=(dup.folderIds||[]).filter(f=>!(keep.folderIds||[]).includes(f));
  keep.folderIds=[...(keep.folderIds||[]),...addedFolders];
  const m={id:id('merge'),kind:'person',keepId:keep.id,dupId:dup.id,at:e.at,entryId:e.id,filled,addedTypes,addedFolders};
  dup.mergedIntoId=keep.id;dup.mergedAt=e.at;
  data.merges.push(m);
  e.changes.push({kind:'person-merged',mergeId:m.id,keepId:keep.id,dupId:dup.id});
  for(const x of data.attention)if(!x.resolvedAt&&x.kind==='possible-same-person'&&x.ids.includes(keep.id)&&x.ids.includes(dup.id)){x.resolvedAt=e.at;x.resolution='merged';}
  noteDuplicatePairs(e.at);
  return {merge:m,entry:e};
}
// Undo a merge: the pointer goes, and filled fields return to empty unless changed since. Work done after
// the merge stays with the kept person; the duplicate's own records were never moved, so nothing is lost.
function undoMerge(mergeId){
  const m=data.merges.find(x=>x.id===mergeId);if(!m||m.undoneAt)return {error:'Nothing to undo'};
  const keep=personRaw(m.keepId),dup=personRaw(m.dupId);if(!keep||!dup||dup.mergedIntoId!==keep.id)return {error:'Nothing to undo'};
  for(const [k,v] of Object.entries(m.filled||{}))if(JSON.stringify(keep[k])===JSON.stringify(v))delete keep[k];
  keep.types=(keep.types||[]).filter(t=>!(m.addedTypes||[]).includes(t));
  keep.folderIds=(keep.folderIds||[]).filter(f=>!(m.addedFolders||[]).includes(f));
  delete dup.mergedIntoId;delete dup.mergedAt;
  const e=addEntry({type:'status',personIds:[keep.id,dup.id],about:[{type:'person',id:keep.id},{type:'person',id:dup.id}],text:`Separated ${dup.name||'a record'} from ${keep.name||'this record'} again.`,result:'Merge undone',changes:[{kind:'person-unmerged',mergeId:m.id}]});
  m.undoneAt=e.at;m.undoneByEntryId=e.id;
  return {entry:e};
}
// Two shidduch records for one pair (from old data, or after a merge) are listed for a look, never combined
// by themselves.
function noteDuplicatePairs(at=iso()){
  const groups=new Map();
  for(const s of liveShidduchim()){const k=`${canonId(s.guyId)}|${canonId(s.girlId)}`;(groups.get(k)||groups.set(k,[]).get(k)).push(s.id);}
  for(const ids of groups.values()){
    if(ids.length<2)continue;
    if(data.attention.some(x=>!x.resolvedAt&&x.kind==='duplicate-pair'&&ids.every(i=>x.ids.includes(i))))continue;
    data.attention.push({id:id('att'),kind:'duplicate-pair',ids,createdAt:at});
  }
}
// Combining two records of one pair: the newer points to the older; rounds of both show in time order.
// Two rounds in progress at once cannot be combined: one of them has to end first.
function combineShidduchim(keepId,dupId){
  const keep=shidduch(keepId),dup=shidduch(dupId);if(!keep||!dup||keep.id===dup.id)return {error:'Nothing to combine'};
  if(!samePerson(keep.guyId,dup.guyId)||!samePerson(keep.girlId,dup.girlId))return {error:'These are different pairs.'};
  if(shStatus(keep)==='active'&&shStatus(dup)==='active')return {error:'Both are in progress. End one of them first.'};
  const e=addEntry({type:'status',personIds:[keep.guyId,keep.girlId],about:[{type:'shidduch',id:keep.id},{type:'shidduch',id:dup.id}],text:`Combined two records of ${shidduchTitle(keep)}.`,result:'Combined',changes:[]});
  dup.mergedIntoId=keep.id;dup.mergedAt=e.at;
  const m={id:id('merge'),kind:'shidduch',keepId:keep.id,dupId:dup.id,at:e.at,entryId:e.id};
  data.merges.push(m);e.changes.push({kind:'shidduch-combined',mergeId:m.id});
  for(const x of data.attention)if(!x.resolvedAt&&x.kind==='duplicate-pair'&&x.ids.includes(keep.id)&&x.ids.includes(dup.id)){x.resolvedAt=e.at;x.resolution='combined';}
  return {merge:m,entry:e};
}
function undoCombine(mergeId){
  const m=data.merges.find(x=>x.id===mergeId&&x.kind==='shidduch');if(!m||m.undoneAt)return {error:'Nothing to undo'};
  const dup=shidduchRaw(m.dupId);if(!dup||dup.mergedIntoId!==m.keepId)return {error:'Nothing to undo'};
  delete dup.mergedIntoId;delete dup.mergedAt;
  const e=addEntry({type:'status',about:[{type:'shidduch',id:m.keepId},{type:'shidduch',id:dup.id}],text:'Separated the two records again.',result:'Combine undone',changes:[{kind:'shidduch-separated',mergeId:m.id}]});
  m.undoneAt=e.at;m.undoneByEntryId=e.id;
  return {entry:e};
}
function openAttention(){return data.attention.filter(x=>!x.resolvedAt&&x.ids.every(i=>x.kind==='duplicate-pair'?shidduchRaw(i)&&!shidduchRaw(i).mergedIntoId:personRaw(i)&&!personRaw(i).mergedIntoId));}

// People this person may be the same as (shown as a quiet hint on their page until decided).
function maybeSamePeople(p){
  if(!p||p.mergedIntoId)return [];
  const m=findPersonMatches({name:p.name,phone:p.phone,email:p.email,city:p.city},{excludeId:p.id});
  return [...m.exact,...m.likely,...m.similar].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i&&!(x.isMe||p.isMe));
}

// ---- Screens and sheets ----------------------------------------------------------------------------
let identityFlow=null; // {candidate, existingId, after(personId)}
function personMatchCard(p){
  const n=entriesForPerson(p.id).length;
  return `<div class="identity-card"><div class="warm-avatar ${avatarTone(p)}">${esc(initials(p.name))}</div><div><strong>${esc(p.name||'No name')}</strong><span>${esc([p.types?.join(', '),p.city,p.phone,p.email].filter(Boolean).join(' · '))}</span><small>${n} history item${n===1?'':'s'}</small></div></div>`;
}
// The one "same person?" question, for every way someone comes in.
function askSamePerson(candidate,existing,kind,after){
  identityFlow={candidate,existingId:existing.id,after};
  const exact=kind==='exact';
  openSheet(`<h2>${exact?`${esc(existing.name)} is already here`:`Is this the ${esc(existing.name)} you know?`}</h2>
    <p class="lead">${exact?'The phone number or email is the same. Family members sometimes share a phone, so you choose.':'Same name and the same city or the same person who told you about them.'}</p>
    ${personMatchCard(existing)}
    <div class="split-actions identity-actions"><button class="ghost-btn" data-act="identity-different">${exact?'Not the same person':'No, someone else'}</button><button class="${exact?'primary-btn':'ghost-btn'}" data-act="identity-same">${exact?'Same person':'Yes, same person'}</button></div>`);
}
// Every way in calls this: it asks when needed, then hands back the one person record to use.
function matchThenUse(candidate,after){
  const m=findPersonMatches(candidate);
  if(m.exact.length)return askSamePerson(candidate,m.exact[0],'exact',after);
  if(m.likely.length)return askSamePerson(candidate,m.likely[0],'likely',after);
  return after(createPersonRecord(candidate).id,false);
}
function createPersonRecord(c,{notSameAs=null}={}){
  const p={id:id('p'),name:c.name,types:[...new Set(c.types||[])],city:c.city||'',phone:c.phone||'',email:c.email||'',createdAt:iso(),folderIds:[]};
  if(c.age){p.age=c.age;p.ageAsOf=iso();}if(c.occupation)p.occupation=c.occupation;
  data.people.push(p);
  const e=addEntry({type:'note',personIds:[p.id],about:[{type:'person',id:p.id}],text:`Added ${p.name}.`,changes:[{kind:'person-added',personId:p.id}]});
  if(c.profile)addProfileVersion(p,c.profile,{entryId:e.id,origin:'created'});
  if(notSameAs)rememberNotSame(p.id,notSameAs);
  return p;
}
// "Same person": new roles and empty facts go onto the existing record (listed in the entry), never a copy.
function useExistingPerson(existing,c){
  const filled={};
  for(const k of ['phone','email','city','age','occupation'])if(emptyValue(existing[k])&&!emptyValue(c[k])){existing[k]=c[k];filled[k]=c[k];}
  if(filled.age){existing.ageAsOf=iso();filled.ageAsOf=existing.ageAsOf;}
  const added=(c.types||[]).filter(t=>!(existing.types||[]).includes(t));
  existing.types=[...(existing.types||[]),...added];
  const e=addEntry({type:'status',personIds:[existing.id],about:[{type:'person',id:existing.id}],text:`Matched to ${existing.name}, already here.`,result:'Already here',changes:[{kind:'identity-matched',filled,addedTypes:added}]});
  if(c.profile&&c.profile!==currentProfileText(existing.id))addProfileVersion(existing,c.profile,{entryId:e.id,origin:'arrival'});
  return existing;
}
async function identitySame(){const f=identityFlow;identityFlow=null;if(!f)return;const p=person(f.existingId);if(!p)return;useExistingPerson(p,f.candidate);await f.after(p.id,true);}
async function identityDifferent(){const f=identityFlow;identityFlow=null;if(!f)return;const p=createPersonRecord(f.candidate,{notSameAs:f.existingId});await f.after(p.id,false);}

// "Needs a number": a quiet line on the page of someone saved without a phone. Adding one (Edit) runs the
// matching check again.
function numberHint(p){return needsNumber(p)?`<div class="identity-hint number-hint"><span>Needs a number</span><button data-act="add-number" data-person-id="${esc(p.id)}">Add</button></div>`:'';}
// A quiet line on a person's page when another record may be the same person.
function identityHint(p){
  const others=maybeSamePeople(p);if(!others.length)return '';
  const o=others[0];
  return `<div class="identity-hint"><span>Maybe the same as <b>${esc(o.name||'another record')}</b></span><button data-act="compare-people" data-person-id="${esc(p.id)}" data-other-id="${esc(o.id)}">Check</button></div>`;
}
function comparePeopleSheet(pid,otherId){
  const p=person(pid),o=person(otherId);if(!p||!o)return;
  const blocked=mergeBlocker(p.id,o.id);
  openSheet(`<h2>Same person?</h2><p class="lead">If these are one real person, they become one record. Nothing is lost, and you can undo it.</p>${personMatchCard(p)}${personMatchCard(o)}${blocked?`<p class="lead">${esc(blocked)}</p>`:''}<div class="split-actions identity-actions"><button class="ghost-btn" data-act="not-same" data-person-id="${esc(p.id)}" data-other-id="${esc(o.id)}">Not the same</button>${blocked?'':`<button class="primary-btn" data-act="merge-confirm" data-person-id="${esc(p.id)}" data-other-id="${esc(o.id)}">Same person</button>`}</div>`);
}
// "Same person as…" from a person's ⋯ menu: choose the other record.
function mergeSheet(pid){
  const p=person(pid);if(!p)return;
  const choices=livePeople().filter(x=>x.id!==p.id&&!x.isMe).sort(byName);
  openSheet(`<h2>Same person as…</h2><p class="lead">Choose the other record of ${esc(p.name)}. They become one record; nothing is lost, and you can undo it.</p><div class="field"><select id="mergeOther"><option value="">Choose…</option>${choices.map(x=>`<option value="${esc(x.id)}">${esc(x.name||'No name')}${x.city?` · ${esc(x.city)}`:''}</option>`).join('')}</select></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="merge-chosen" data-person-id="${esc(p.id)}">Continue</button></div>`);
}
async function confirmMerge(pid,otherId){
  const r=mergePeople(pid,otherId);if(r.error){showToast(r.error);return;}
  await save();closeSheet();ui.detail={type:'person',id:r.merge.keepId};render();
  showActionToast('Now one person',{act:'undo-merge',mergeId:r.merge.id});
}
async function confirmUndoMerge(mergeId){const r=undoMerge(mergeId);if(r.error){showToast(r.error);return;}await save();closeSheet();render();showToast('Separated again');}
async function confirmNotSame(pid,otherId){rememberNotSame(pid,otherId);await save();closeSheet();render();showToast('Noted: not the same person');}

// Settings → Needs a look: what the upgrade or a merge could not decide.
function needsLookSheet(){
  const items=openAttention();
  const row=x=>{
    if(x.kind==='duplicate-pair'){const [a,b]=x.ids.map(shidduchRaw);return `<div class="setting-row"><div class="setting-copy"><b>${esc(shidduchTitle(a))}</b><span>Two records for the same pair</span></div><button class="option" data-act="combine-pair" data-keep-id="${esc(a.id)}" data-dup-id="${esc(b.id)}">Combine</button></div>`;}
    const [a,b]=x.ids.map(person);return `<div class="setting-row"><div class="setting-copy"><b>${esc(a?.name||'')} · ${esc(b?.name||'')}</b><span>Same phone or email</span></div><button class="option" data-act="compare-people" data-person-id="${esc(a?.id)}" data-other-id="${esc(b?.id)}">Check</button></div>`;
  };
  openSheet(`<h2>Needs a look</h2><p class="lead">Things the app would not decide by itself. Nothing changes until you choose.</p>${items.length?`<div class="sheet-section">${items.map(row).join('')}</div>`:empty('All clear','Nothing needs a look right now.')}<button class="primary-btn full" data-act="close-sheet">Done</button>`);
}
async function confirmCombine(keepId,dupId){const r=combineShidduchim(keepId,dupId);if(r.error){showToast(r.error);return;}await save();closeSheet();ui.detail={type:'shidduch',id:r.merge.keepId};ui.detailTab='overview';render();showActionToast('Combined',{act:'undo-combine',mergeId:r.merge.id});}
async function confirmUndoCombine(mergeId){const r=undoCombine(mergeId);if(r.error){showToast(r.error);return;}await save();render();showToast('Separated again');}
