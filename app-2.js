function shidduch(sid){return data.shidduchim.find(s=>s.id===sid)}
function round(rid){return data.rounds.find(r=>r.id===rid)}
function dateById(did){return data.dates.find(d=>d.id===did)}
function source(sid){return data.sources.find(s=>s.id===sid)}
function idea(iid){return data.ideas.find(i=>i.id===iid)}
function me(){return data.people.find(p=>p.isMe)||data.people[0]}
function byType(type){return data.people.filter(p=>p.types?.includes(type));}
function entriesForPerson(pid){return data.entries.filter(e=>e.personIds?.includes(pid)).sort((a,b)=>new Date(b.at)-new Date(a.at));}
function entriesForAbout(type,idv){return data.entries.filter(e=>e.aboutType===type&&e.aboutId===idv).sort((a,b)=>new Date(b.at)-new Date(a.at));}
function openForPerson(pid,dir){return data.openItems.filter(x=>x.status==='open'&&x.personId===pid&&(!dir||x.direction===dir));}
function shidduchimForPerson(pid){return data.shidduchim.filter(s=>s.guyId===pid||s.girlId===pid||s.shadchanIds?.includes(pid));}
function ideasForPerson(pid){return data.ideas.filter(i=>i.guyId===pid||i.girlId===pid);}
function lastContact(pid){const e=entriesForPerson(pid).find(x=>['call','message','profile','note'].includes(x.type));return e?.at||null;}
// Sort helpers that tolerate people without a contact date, createdAt or name (they go last).
function recentKey(p){return String(lastContact(p.id)||p.createdAt||'');}
function byRecentContact(a,b){return recentKey(b).localeCompare(recentKey(a));}
function byName(a,b){return String(a.name||'').localeCompare(String(b.name||''));}
function fmtDay(ts){if(!ts)return'No contact yet';const d=new Date(ts),now=new Date();const diff=Math.floor((now-d)/86400000);if(diff<=0)return'Today';if(diff===1)return'Yesterday';if(diff<7)return`${diff} days ago`;return d.toLocaleDateString(undefined,{month:'short',day:'numeric'});}
function fmtTime(ts){return new Date(ts).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function fmtDate(ts){return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric',year:new Date(ts).getFullYear()===new Date().getFullYear()?undefined:'numeric'});}
function dayKey(ts){const d=new Date(ts),today=new Date(),y=new Date(Date.now()-86400000);const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();if(same(d,today))return'Today';if(same(d,y))return'Yesterday';return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});}
function ageText(p){return [p.age,p.city,p.occupation].filter(Boolean).join(' · ');}
function avatarTone(p){const tones=['sky','sage','peach','lav','rose'];let n=0;for(const c of p.name||'')n+=c.charCodeAt(0);return tones[n%tones.length];}
function getCurrentRound(s){return round(s?.currentRoundId)}
function linkedAbout(entry){if(entry.aboutType==='person')return person(entry.aboutId)?.name||'Person';if(entry.aboutType==='shidduch')return shidduch(entry.aboutId)?shidduchTitle(shidduch(entry.aboutId)):'Shidduch';if(entry.aboutType==='idea'){const i=idea(entry.aboutId);return i?`${person(i.guyId)?.name} ↔ ${person(i.girlId)?.name}`:'Idea';}if(entry.aboutType==='source')return source(entry.aboutId)?.name||'Source';if(entry.aboutType==='date'){const d=dateById(entry.aboutId),r=round(d?.roundId),s=shidduch(r?.shidduchId);return s?`${shidduchTitle(s)} · Date ${d.number}`:'Date';}return'';}

function sourceStats(src){
  const peopleIds=src.peopleIds||[];let contacted=0,replied=0,follow=0;
  for(const pid of peopleIds){
    const es=entriesForPerson(pid).filter(e=>new Date(e.at)>=new Date(src.createdAt));
    const firstOut=[...es].reverse().find(e=>e.direction==='out');
    if(firstOut){contacted++;const rep=es.find(e=>e.direction==='in'&&new Date(e.at)>new Date(firstOut.at));if(rep)replied++;else{const due=new Date(firstOut.at).getTime()+(src.followUpDays||7)*86400000;if(Date.now()>due)follow++;}}
  }
  return {total:peopleIds.length,contacted,replied,follow,notContacted:peopleIds.length-contacted};
}
function needsContactPerson(p){const es=entriesForPerson(p.id);if(!es.some(e=>e.direction==='out'))return true;for(const src of data.sources.filter(s=>s.peopleIds?.includes(p.id))){const es2=es.filter(e=>new Date(e.at)>=new Date(src.createdAt));const firstOut=[...es2].reverse().find(e=>e.direction==='out');if(firstOut&&!es2.find(e=>e.direction==='in'&&new Date(e.at)>new Date(firstOut.at))&&Date.now()>new Date(firstOut.at).getTime()+(src.followUpDays||7)*86400000)return true;}return false;}
function dormantPerson(p){const lc=lastContact(p.id);return lc&&Date.now()-new Date(lc).getTime()>60*86400000;}

function applySettings(){const s=data.settings||defaultSettings();document.documentElement.dataset.theme=s.theme||'warm';document.documentElement.dataset.density=s.density||'comfortable';document.documentElement.dataset.iconSize=s.iconSize||'medium';const themeColor=s.theme==='dark'?'#151917':s.theme==='blue'?'#f2f6fa':s.theme==='sage'?'#f1f4ef':'#f6f0e7';document.querySelector('meta[name="theme-color"]').setAttribute('content',themeColor);}

function filteredPeople(type){let arr=byType(type).filter(p=>!p.isMe);const q=ui.search.trim().toLowerCase();if(q)arr=arr.filter(p=>(`${p.name} ${p.city||''} ${p.occupation||''} ${p.phone||''}`).toLowerCase().includes(q));if(type==='Girl'&&data.settings.mode==='single'){
  const view=ui.screenView.girls;if(view==='for-me')arr=arr.filter(p=>ideasForPerson(p.id).some(i=>i.status==='open'&&(i.guyId===me().id||i.girlId===me().id))||shidduchimForPerson(p.id).some(s=>s.status==='active'&&(s.guyId===me().id||s.girlId===me().id)));if(view==='previous')arr=arr.filter(p=>shidduchimForPerson(p.id).some(s=>s.status==='ended'&&(s.guyId===me().id||s.girlId===me().id))||ideasForPerson(p.id).some(i=>i.status==='not-applicable'&&(i.guyId===me().id||i.girlId===me().id)));
  }
  return arr.sort(byRecentContact);
}

