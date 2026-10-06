'use strict';

// Model: lookups, ledger views and everything worked out from the records.
// Nothing in this file writes data. Screens call these functions; they never keep their own copies.

let dataRev=0;
function touchData(){dataRev++;}

// ---- Records, read through merge pointers ----------------------------------------------------
function personRaw(pid){return data.people.find(p=>p.id===pid);}
function canonId(pid){let p=personRaw(pid);const seen=new Set();while(p?.mergedIntoId&&!seen.has(p.id)){seen.add(p.id);p=personRaw(p.mergedIntoId);}return p?.id||pid;}
function person(pid){return personRaw(canonId(pid));}
function samePerson(a,b){return !!a&&!!b&&canonId(a)===canonId(b);}
function shidduchRaw(sid){return data.shidduchim.find(s=>s.id===sid);}
function shidduch(sid){let s=shidduchRaw(sid);const seen=new Set();while(s?.mergedIntoId&&!seen.has(s.id)){seen.add(s.id);s=shidduchRaw(s.mergedIntoId);}return s;}
function round(rid){return data.rounds.find(r=>r.id===rid);}
function dateById(did){return data.dates.find(d=>d.id===did);}
function source(sid){return data.sources.find(s=>s.id===sid);}
function idea(iid){return data.ideas.find(i=>i.id===iid);}
function openItem(xid){return data.openItems.find(x=>x.id===xid);}
function me(){return data.people.find(p=>p.isMe&&!p.mergedIntoId)||data.people[0];}
function isMe(pid){return !!pid&&canonId(pid)===me()?.id;}
function byType(type){return data.people.filter(p=>!p.mergedIntoId&&!p.deletedAt&&p.types?.includes(type));}
function liveShidduchim(){return data.shidduchim.filter(s=>!s.mergedIntoId);}
// Every shidduch id that now reads as this one (itself and any combined into it).
function shidduchIdsFor(s){const ids=new Set([s.id]);let grew=true;while(grew){grew=false;for(const x of data.shidduchim)if(x.mergedIntoId&&ids.has(x.mergedIntoId)&&!ids.has(x.id)){ids.add(x.id);grew=true;}}return ids;}

// ---- Ledger views ----------------------------------------------------------------------------
// A pasted message whose real time is not known yet counts from when it was pasted (and says so).
function entryTime(e){const v=e?.at||e?.pastedAt,t=v?new Date(v).getTime():NaN;return Number.isFinite(t)?t:-Infinity;}
function newestFirst(a,b){return entryTime(b)-entryTime(a);}
function liveEntries(){return data.entries.filter(e=>!e.deletedAt&&!e.toFile);}
function entryAbout(e,type){return (e.about||[]).filter(a=>a.type===type).map(a=>a.id);}
function isAbout(e,type,idv){return (e.about||[]).some(a=>a.type===type&&a.id===idv);}
function entryPeople(e){return [...new Set([...(e.personIds||[]),e.fromPersonId,e.toPersonId].filter(Boolean).map(canonId))];}
function entriesForPerson(pid){const c=canonId(pid);return liveEntries().filter(e=>entryPeople(e).includes(c)).sort(newestFirst);}
// For working out a current state: newest first, and of two entries with the same time the later-written
// one counts as newer (a list shown on screen keeps its usual order).
function changesAbout(type,idv){return liveEntries().filter(e=>isAbout(e,type,idv)).reverse().sort(newestFirst);}
// A shidduch's history: entries about it, its rounds, its dates, and the offers it started from.
// With a round: that round's own entries, plus older entries about the whole shidduch dated within it.
function entriesForShidduch(sid,{roundId=null}={}){
  const s=shidduch(sid);if(!s)return [];
  const sids=shidduchIdsFor(s),rs=roundsOf(s);
  const rids=new Set(rs.map(r=>r.id)),dateRound=new Map(data.dates.filter(d=>rids.has(d.roundId)).map(d=>[d.id,d.roundId]));
  const ideaRound=new Map(rs.filter(r=>r.ideaId).map(r=>[r.ideaId,r.id]));
  for(const i of data.ideas)if(i.shidduchId&&sids.has(i.shidduchId)&&!ideaRound.has(i.id))ideaRound.set(i.id,i.roundId||null);
  const all=liveEntries().filter(e=>(e.about||[]).some(a=>(a.type==='shidduch'&&sids.has(a.id))||(a.type==='round'&&rids.has(a.id))||(a.type==='date'&&dateRound.has(a.id))||(a.type==='idea'&&ideaRound.has(a.id)))).sort(newestFirst);
  if(!roundId)return all;
  const idx=rs.findIndex(r=>r.id===roundId),from=idx>0?roundStart(rs[idx]):-Infinity,to=idx>=0&&idx<rs.length-1?roundStart(rs[idx+1]):Infinity;
  return all.filter(e=>{
    for(const a of e.about||[]){
      if(a.type==='round')return a.id===roundId;
      if(a.type==='date')return dateRound.get(a.id)===roundId;
      if(a.type==='idea'&&ideaRound.get(a.id))return ideaRound.get(a.id)===roundId;
    }
    const t=entryTime(e);return t>=from&&t<to;
  });
}
function lastContact(pid){const e=entriesForPerson(pid).find(x=>['call','message','profile','note'].includes(x.type));return e?.at||null;}

// ---- Open items ------------------------------------------------------------------------------
function openItems(){return data.openItems.filter(x=>x.status==='open');}
function itemAbout(x,type){return x.about?.type===type?x.about.id:null;}
function openForPerson(pid,dir){const c=canonId(pid);return openItems().filter(x=>canonId(x.personId)===c&&(!dir||x.direction===dir));}
function openForShidduch(sid,dir){
  const s=shidduch(sid);if(!s)return [];
  const sids=shidduchIdsFor(s),rids=new Set(roundsOf(s).map(r=>r.id)),dids=new Set(data.dates.filter(d=>rids.has(d.roundId)).map(d=>d.id));
  return openItems().filter(x=>(!dir||x.direction===dir)&&x.about&&((x.about.type==='shidduch'&&sids.has(x.about.id))||(x.about.type==='round'&&rids.has(x.about.id))||(x.about.type==='date'&&dids.has(x.about.id))));
}
// A to-do with a later due date (a list follow-up, a call planned for tomorrow) waits quietly until then.
function itemIsDue(x){return !x.dueAt||new Date(x.dueAt).getTime()<=Date.now();}

// ---- Shidduchim, rounds and dates --------------------------------------------------------------
function roundsOf(s){if(!s)return [];const sids=shidduchIdsFor(s);return data.rounds.filter(r=>sids.has(r.shidduchId)).sort((a,b)=>(roundStart(a)-roundStart(b))||((Number(a.number)||0)-(Number(b.number)||0)));}
function roundStart(r){const t=r?.startedAt?new Date(r.startedAt).getTime():NaN;return Number.isFinite(t)?t:0;}
function currentRound(s){const rs=roundsOf(s);return rs[rs.length-1]||null;}
function getCurrentRound(s){return currentRound(s);}
// The visible round number: rounds of a pair counted in order (combined pairs renumber naturally).
function roundNumber(r){const s=shidduch(r?.shidduchId);const rs=roundsOf(s);const i=rs.findIndex(x=>x.id===r?.id);return i>=0?i+1:(Number(r?.number)||1);}
function shStatus(s){return currentRound(s)?.status==='ended'?'ended':'active';}
function shidduchimForPerson(pid){const c=canonId(pid);return liveShidduchim().filter(s=>canonId(s.guyId)===c||canonId(s.girlId)===c||roundsOf(s).some(r=>(r.shadchanIds||[]).some(x=>canonId(x)===c)));}
function ideasForPerson(pid){const c=canonId(pid);return data.ideas.filter(i=>canonId(i.guyId)===c||canonId(i.girlId)===c);}
// The one permanent shidduch for a pair (read through merges). Uncertain duplicates stay separate and
// are listed for a look; the oldest record answers for the pair meanwhile.
function shidduchForPair(guyId,girlId){const g=canonId(guyId),gl=canonId(girlId);return liveShidduchim().filter(s=>canonId(s.guyId)===g&&canonId(s.girlId)===gl).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))[0]||null;}
function shidduchGoBetweens(s){return [...new Set(roundsOf(s).flatMap(r=>r.shadchanIds||[]).map(canonId))];}
function shidduchSuggestedBy(s){const r=currentRound(s);return r?.suggestedByPersonId||roundsOf(s).find(x=>x.suggestedByPersonId)?.suggestedByPersonId||null;}
function shidduchIsMine(s){return isMe(s?.guyId)||isMe(s?.girlId);}

// A side's answer in a round: the newest answer entry, otherwise the v58 value the round started with.
function answerEntry(r,side){return changesAbout('round',r?.id).find(e=>e.changes?.some(c=>c.kind==='answer'&&c.side===side));}
function roundAnswer(r,side){if(!r)return '';const e=answerEntry(r,side);if(e)return e.changes.find(c=>c.kind==='answer'&&c.side===side).value;return r.base?.[side]||'';}

// A date's state: its v58 starting values, then every change recorded about this Date ID, oldest first.
function dateState(d){
  const st={when:d?.base?.when??null,status:d?.base?.status||'',guy:d?.base?.guy||'',girl:d?.base?.girl||'',history:[]};
  if(!d)return st;
  const es=changesAbout('date',d.id).reverse();
  for(const e of es){
    for(const c of e.changes||[]){
      if(c.kind==='date-set'||c.kind==='date-moved'){st.when=c.to??c.when??st.when;if(!st.status||st.status==='cancelled')st.status='planned';}
      else if(c.kind==='date-happened')st.status='happened';
      else if(c.kind==='date-cancelled')st.status='cancelled';
      else if(c.kind==='date-feedback'&&(c.side==='guy'||c.side==='girl'))st[c.side]=c.value;
    }
    st.history.push(e);
  }
  return st;
}
function roundDates(r,{withCancelled=false}={}){return data.dates.filter(d=>d.roundId===r?.id).sort((a,b)=>(Number(a.number)||0)-(Number(b.number)||0)).filter(d=>withCancelled||!/cancel/i.test(dateState(d).status));}

// ---- Profiles ----------------------------------------------------------------------------------
function profileVersionsOf(pid){const c=canonId(pid);return data.profileVersions.filter(v=>canonId(v.personId)===c).sort((a,b)=>(Number(a.number)||0)-(Number(b.number)||0));}
function latestProfileVersion(pid){const vs=profileVersionsOf(pid);return vs[vs.length-1]||null;}
function latestProfileNumber(pid){return Math.max(Number(latestProfileVersion(pid)?.number)||0,Number(person(pid)?.legacyProfileVersion)||0);}
// ---- Links, files, intake ----------------------------------------------------------------------
// A link is a lasting fact between two people ("Rachel is Leah's mother"); a or b may have been merged.
function liveLinks(){return data.links.filter(l=>!l.removedAt);}
function linksOf(pid){const c=canonId(pid);return liveLinks().filter(l=>canonId(l.bId)===c);}
function linkedTo(pid){const c=canonId(pid);return liveLinks().filter(l=>canonId(l.aId)===c);}
function intakeEntries(){return data.entries.filter(e=>e.toFile&&!e.deletedAt).sort(newestFirst);}
function filesOf(pid){const c=canonId(pid);return data.files.filter(f=>!f.deletedAt&&f.personId&&canonId(f.personId)===c);}
function profileVersion(vid){return data.profileVersions.find(v=>v.id===vid);}
function currentProfileText(pid){return latestProfileVersion(pid)?.text||'';}

// ---- Sources -----------------------------------------------------------------------------------
function sourcePeopleIds(src){return [...new Set((src?.lines||[]).map(l=>l.personId).filter(Boolean).map(canonId))];}
function sourcesForPerson(pid){const c=canonId(pid);return data.sources.filter(s=>sourcePeopleIds(s).includes(c));}
// Progress comes from the ledger: contacting someone anywhere in the app updates every list they are on.
// Contacted = something I sent them since the list arrived; replied = something from them after that.
function personEntriesInOrder(pid){const c=canonId(pid);return liveEntries().filter(e=>entryPeople(e).includes(c)).sort((a,b)=>entryTime(a)-entryTime(b));}
function sentTo(e,pid){return e.direction==='out'&&samePerson(e.toPersonId,pid);}
function cameFrom(e,pid){return e.direction==='in'&&samePerson(e.fromPersonId,pid);}
function listProgress(pid,src){
  const since=src.createdAt?new Date(src.createdAt).getTime():-Infinity;
  const es=personEntriesInOrder(pid).filter(e=>entryTime(e)>=since);
  const i=es.findIndex(e=>sentTo(e,pid));if(i<0)return {contacted:false,replied:false,followUp:false};
  const replied=es.slice(i+1).some(e=>cameFrom(e,pid));
  return {contacted:true,replied,followUp:!replied&&Date.now()>entryTime(es[i])+(Number(src.followUpDays)||7)*86400000};
}
function sourceStats(src){
  const lines=src.lines||[];let contacted=0,replied=0,follow=0;
  for(const pid of sourcePeopleIds(src)){const s=listProgress(pid,src);if(s.contacted)contacted++;if(s.replied)replied++;if(s.followUp)follow++;}
  return {total:lines.length,contacted,replied,follow,notContacted:Math.max(0,lines.length-contacted)};
}
// Time to contact: never contacted, or a list's follow-up time has passed with no reply.
function needsContactPerson(p){return !liveEntries().some(e=>sentTo(e,p.id))||sourcesForPerson(p.id).some(src=>listProgress(p.id,src).followUp);}
// Dormant (no contact for 60 days or more) is a view only. It never creates a reminder.
function dormantPerson(p){const lc=lastContact(p.id);return lc&&Date.now()-new Date(lc).getTime()>60*86400000;}

// ---- Lists, formatting ---------------------------------------------------------------------------
function recentKey(p){return String(lastContact(p.id)||p.createdAt||'');}
function byRecentContact(a,b){return recentKey(b).localeCompare(recentKey(a));}
function byName(a,b){return String(a.name||'').localeCompare(String(b.name||''));}
function inFolderView(p){return !ui.folder||(p.folderIds||[]).includes(ui.folder);}
function filteredPeople(type){let arr=byType(type).filter(p=>!p.isMe&&inFolderView(p));const q=ui.search.trim().toLowerCase();if(q)arr=arr.filter(p=>personMatchesSearch(p,q));return arr.sort(byRecentContact);}
function personMatchesSearch(p,q){return (`${p.name} ${p.city||''} ${p.occupation||''} ${p.phone||''}`).toLowerCase().includes(q);}
function fmtDay(ts){if(!ts)return'No contact yet';const d=new Date(ts),now=new Date();const diff=Math.floor((now-d)/86400000);if(diff<=0)return'Today';if(diff===1)return'Yesterday';if(diff<7)return`${diff} days ago`;return d.toLocaleDateString(undefined,{month:'short',day:'numeric'});}
function fmtTime(ts){if(!ts)return'';return new Date(ts).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function fmtDate(ts){if(!ts)return'Date unknown';return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric',year:new Date(ts).getFullYear()===new Date().getFullYear()?undefined:'numeric'});}
// The time shown on a row; a pasted message with no known time says so instead of inventing one.
function entryClock(e){return e.at?fmtTime(e.at):e.pastedAt?'Pasted':'';}
function dayKey(ts){if(!ts)return'Date unknown';const d=new Date(ts),today=new Date(),y=new Date(Date.now()-86400000);const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();if(same(d,today))return'Today';if(same(d,y))return'Yesterday';return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});}
function ageText(p){return [p.age,p.city,p.occupation].filter(Boolean).join(' · ');}
function avatarTone(p){const tones=['sky','sage','peach','lav','rose'];let n=0;for(const c of p.name||'')n+=c.charCodeAt(0);return tones[n%tones.length];}

// The words shown for what an entry is about (its first "about").
function aboutLabel(a){
  if(!a)return'';
  if(a.type==='person')return person(a.id)?.name||'Person';
  if(a.type==='shidduch'){const s=shidduch(a.id);return s?shidduchTitle(s):'Shidduch';}
  if(a.type==='round'){const r=round(a.id),s=shidduch(r?.shidduchId);return s?`${shidduchTitle(s)} · Round ${roundNumber(r)}`:'Round';}
  if(a.type==='idea'){const i=idea(a.id);return i?`${person(i.guyId)?.name} ↔ ${person(i.girlId)?.name}`:'Idea';}
  if(a.type==='source')return source(a.id)?.name||'Source';
  if(a.type==='date'){const d=dateById(a.id),s=shidduch(d?.shidduchId||round(d?.roundId)?.shidduchId);return s?`${shidduchTitle(s)} · Date ${d.number}`:'Date';}
  return'';
}
function linkedAbout(entry){return aboutLabel(entry.about?.[0]);}
