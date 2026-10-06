'use strict';

// Warm Modern UI layer — follows the approved rendering direction.
// It deliberately changes only presentation and screen composition; the agreed data architecture stays intact.

ICONS.girl='<circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/><path d="M8.7 5.8c1.1-2.2 5.5-2.2 6.6 0"/>';
ICONS.plus=ICONS.edit;

function warmWordmark(){return `<div class="warm-wordmark"><span>Zivug</span><b>Match</b><em>ב״ה</em></div>`;}

function header(title,sub,{add=false,back=false,filter=false}={}){
  return `<header class="warm-header">${warmWordmark()}<div class="warm-title-row">${back?`<button class="warm-back" data-act="back" aria-label="Back">${icon('back')}</button>`:''}<div class="warm-title-copy"><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div><div class="warm-title-actions">${add?`<button class="warm-add" data-act="add-current">Add</button>`:''}${filter?`<button class="warm-circle" data-act="filters" aria-label="Filter">${icon('filter')}</button>`:''}${title==='Recent'?`<button class="warm-circle" data-act="settings" aria-label="Settings">${icon('gear')}</button>`:''}</div></div></header>`;
}

function searchBox(ph){return `<div class="warm-search-row"><label class="warm-search">${icon('search')}<input data-role="search" value="${esc(ui.search)}" placeholder="${esc(ph)}" /></label><button class="warm-filter" data-act="filters" aria-label="Filter and sort">${icon('filter')}</button></div>`;}

function segment(items,active,scope){return `<div class="warm-segment-scroll"><div class="warm-segment">${items.map(x=>`<button class="warm-seg ${x.value===active?'active':''}" data-seg-scope="${scope}" data-seg="${esc(x.value)}"><span>${esc(x.label)}</span>${x.count!=null?`<small>${x.count}</small>`:''}</button>`).join('')}</div></div>`;}

function summaryCard(cls,val,label,act=''){const ic=cls==='amber'?'hourglass':cls==='sage'?'heart':'check';return `<button class="warm-summary ${cls}" ${act?`data-act="${act}"`:''}><span class="warm-summary-icon">${icon(ic)}</span><span class="warm-summary-copy"><small>${esc(label)}</small><strong>${esc(val)}</strong></span></button>`;}

function empty(title,text,act=''){return `<div class="warm-empty"><div class="warm-empty-icon">${icon('heart')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${act?`<button class="warm-primary" data-act="${act}">Add</button>`:''}</div>`;}

function warmActivityIcon(type){const map={call:['phone','sage'],message:['message','sky'],profile:['profile','peach'],date:['calendar','lav'],note:['note','amber'],source:['list','sky'],referral:['link','sage'],status:['check','sky']};return map[type]||['note','sky'];}
function activityRow(e){
  const [ic,tone]=warmActivityIcon(e.type);
  let primary=e.type==='call'?'Call':e.type==='message'?(e.channel||'Message'):e.type==='profile'?'Profile':e.type==='date'?'Date':e.type==='source'?'Source':e.type==='note'?'Note':'Activity';
  let who='';if(e.direction==='in')who=person(e.fromPersonId)?.name||'';else if(e.direction==='out')who=person(e.toPersonId)?.name||'';else who=e.personIds?.map(pid=>person(pid)?.name).filter(Boolean).join(' · ')||'';
  return `<button class="warm-activity-row" data-entry="${e.id}"><div class="warm-activity-icon ${tone}">${icon(ic)}</div><div class="warm-activity-main"><div class="warm-activity-top"><strong>${esc(who?`${primary} · ${who}`:primary)}</strong><time>${esc(fmtTime(e.at))}</time></div><div class="warm-activity-text">${esc(e.text||'')}</div>${linkedAbout(e)?`<div class="warm-activity-about">${esc(linkedAbout(e))}${e.result?` · ${esc(e.result)}`:''}</div>`:''}</div><div class="warm-chevron">›</div></button>`;
}

// Guys and Girls. In Single mode, Girls is one focused list: only profiles applicable to me.
function peopleScreen(type){
  const isGirl=type==='Girl',key=isGirl?'girls':'guys';
  if(isGirl&&data.settings.mode==='single'){
    let arr=byType('Girl').filter(p=>!p.isMe&&zmGirlAppliesToMe(p));
    const q=ui.search.trim().toLowerCase();
    if(q)arr=arr.filter(p=>(`${p.name} ${p.city||''} ${p.occupation||''} ${p.phone||''}`).toLowerCase().includes(q));
    arr=arr.sort(byRecentContact);
    return `${header('Girls','Profiles applicable to you',{add:true})}${searchBox('Search girls…')}<div class="warm-stack">${arr.map(p=>personRow(p)).join('')||empty('No applicable profiles yet','Profiles connected to an open offer or current shidduch with you will appear here.','add-current')}</div>`;
  }
  const tabs=[{value:'all',label:'All'},{value:'recent',label:'Recently added'}];
  const arr=filteredPeople(type);
  return `${header(isGirl?'Girls':'Guys','Browse and search',{add:true})}${searchBox(`Search ${isGirl?'girls':'guys'}…`)}${segment(tabs,ui.screenView[key],key)}<div class="warm-stack">${arr.map((p,i)=>personRow(p,{selected:i===0&&isGirl})).join('')||empty(`No ${isGirl?'girls':'guys'} here yet`,`Add a ${isGirl?'girl':'guy'} and the app will keep the profile, sources and history together.`,'add-current')}</div>`;
}

// Shadchanim: All (the ones I'm working with, then everyone A–Z), To hear back, My to-do, Time to contact, Sources.
// The header sticks while the long list scrolls.
function shadchanTabs(total,them,mine,needs){return [{value:'all',label:'All',count:total},{value:'them',label:'To hear back',count:them},{value:'me',label:'My to-do',count:mine},{value:'needs',label:'Time to contact',count:needs},{value:'sources',label:'Sources',count:data.sources.length}];}
function shadchanHeader(total){return `<div class="zm-shadchan-sticky-sentinel" aria-hidden="true"></div><div class="zm-shadchan-sticky-head">${header('Shadchanim',`${total} people in your network`,{add:true})}</div>`;}
function shadchanScreen(){
  const all=byType('Shadchan'),them=all.filter(p=>openForPerson(p.id,'them').length),mine=all.filter(p=>openForPerson(p.id,'me').length),needs=all.filter(needsContactPerson);
  const v=ui.screenView.shadchanim;
  if(v==='sources')return sourceScreenEmbedded(all.length,them.length,mine.length,needs.length);
  const tabs=shadchanTabs(all.length,them.length,mine.length,needs.length);
  if(v==='all'&&!ui.search){
    const byNameAll=[...all].sort(byName);
    const active=byNameAll.filter(p=>openForPerson(p.id).length||shidduchimForPerson(p.id).some(s=>s.status==='active'));
    const activeIds=new Set(active.map(p=>p.id)),rest=byNameAll.filter(p=>!activeIds.has(p.id));
    const groups={};for(const p of rest){const k=(p.name?.[0]||'#').toUpperCase();(groups[k]??=[]).push(p);}
    const activeHtml=active.length?`<div class="warm-section-title shad-section"><h2>Working with</h2><span>${active.length}</span></div><div class="warm-stack">${active.slice(0,8).map(p=>personRow(p)).join('')}</div>`:'';
    const az=Object.entries(groups).map(([letter,arr])=>`<section class="alpha-group"><div class="alpha-letter">${letter}</div><div class="warm-stack">${arr.map(p=>personRow(p)).join('')}</div></section>`).join('');
    return `${shadchanHeader(all.length)}${searchBox('Search name, phone or city…')}${segment(tabs,'all','shadchanim')}${activeHtml}<div class="warm-section-title shad-section"><h2>Everyone A–Z</h2><span>${rest.length}</span></div>${az}`;
  }
  let arr=all;if(v==='them')arr=them;if(v==='me')arr=mine;if(v==='needs')arr=needs;
  const q=ui.search.toLowerCase();if(q)arr=arr.filter(p=>(`${p.name} ${p.city||''} ${p.phone||''}`).toLowerCase().includes(q));arr=arr.sort(byRecentContact);
  return `${shadchanHeader(all.length)}${searchBox('Search name, phone or city…')}${segment(tabs,v,'shadchanim')}<div class="warm-stack">${arr.map((p,i)=>personRow(p,{selected:i===0})).join('')||empty('No shadchanim in this view','Nothing needs your attention here right now.')}</div>`;
}

function sourceScreenEmbedded(total,them,mine,needs){
  const tabs=shadchanTabs(total,them,mine,needs);
  const rows=data.sources.map(src=>{const st=sourceStats(src);return `<button class="warm-source-row" data-source="${src.id}"><div class="warm-activity-icon ${src.kind==='event'?'peach':'sky'}">${icon(src.kind==='event'?'calendar':'list')}</div><div class="warm-source-main"><div><strong>${esc(src.name)}</strong><time>${esc(fmtDate(src.createdAt))}</time></div><p>${st.total} total · ${st.contacted} contacted · ${st.replied} replied${st.follow?` · ${st.follow} follow-up`:''}</p></div><div class="warm-chevron">›</div></button>`;}).join('');
  return `${shadchanHeader(total)}${searchBox('Search sources…')}${segment(tabs,'sources','shadchanim')}<div class="warm-section-title"><h2>Sources</h2><button data-act="add-source">Add source</button></div><div class="warm-stack">${rows||empty('No sources yet','Lists, events and referrals stay here without duplicating people.','add-source')}</div>`;
}

function warmPersonTabs(p,active){const base=p.types?.includes('Shadchan')?[['details','Details'],['conversation','History'],['shidduchim','Shidduchim'],['files','Files']]:[['profile','Profile'],['conversation','History'],['shidduchim','Shidduchim'],['files','Files']];return `<div class="warm-tabs">${base.map(([v,l])=>`<button class="warm-tab ${active===v?'active':''}" data-detail-tab="${v}">${l}</button>`).join('')}</div>`;}

// On a person's page a waiting result reads as whose turn it is.
function personResultLabel(r){return r==='Waiting on them'?'Their turn':r==='Waiting on me'?'My turn':r;}
function warmTimeline(entries,onPersonPage=false){if(!entries.length)return empty('No history yet','Calls, messages, notes and profiles will appear here automatically.');return `<div class="warm-history">${entries.map(e=>{const [ic,tone]=warmActivityIcon(e.type);const title=e.type==='message'?(e.direction==='in'?(person(e.fromPersonId)?.name||'Message'):'Message sent'):e.type==='call'?'Call':e.type==='profile'?'Profile':e.type==='date'?'Date':e.type==='source'?'Source':e.type==='referral'?'Referral':'Note';return `<button class="warm-history-row" data-entry="${e.id}"><div class="warm-activity-icon ${tone}">${icon(ic)}</div><div class="warm-history-main"><div><strong>${esc(title)}</strong><time>${esc(fmtTime(e.at))}</time></div><p>${esc(e.text||'')}</p>${linkedAbout(e)?`<span>${esc(linkedAbout(e))}${e.result?` · ${esc(onPersonPage?personResultLabel(e.result):e.result)}`:''}</span>`:''}</div><div class="warm-chevron">›</div></button>`;}).join('')}</div>`;}

let timelineHtml=warmTimeline;

// Which version of my profile this person has, worked out from the profile sends in the history.
function myProfileVersion(){return Number(me()?.profileVersion)||1;}
function profileSentTo(pid){const mine=me()?.id;let best=0;for(const e of data.entries){if(!e||e.type!=='profile'||e.direction!=='out'||e.toPersonId!==pid||(e.fromPersonId!==mine&&e.aboutId!==mine))continue;const v=Number(e.profileVersion)||Number(/v(\d+)/.exec(e.text||'')?.[1])||0;if(v>best)best=v;}return best;}
function myProfileStatus(pid){const cur=myProfileVersion(),sent=profileSentTo(pid);return !sent?`Not sent yet · v${cur} ready`:sent<cur?`Has v${sent} · v${cur} ready`:`Has v${sent}`;}

// A person's page: compact identity bar, open items (only when there are any), contact buttons, tabs.
// Notes and profile text are shown exactly as written; only labels use the app's wording.
function personDetail(pid){
  const p=person(pid);if(!p)return recentScreen();
  const isShad=p.types?.includes('Shadchan'),them=openForPerson(pid,'them'),mine=openForPerson(pid,'me'),lc=lastContact(pid);
  const defaultTab=isShad?'details':'profile';if(!['details','profile','conversation','shidduchim','files'].includes(ui.detailTab))ui.detailTab=defaultTab;
  let content='';
  if(ui.detailTab==='conversation')content=`<div class="warm-section-title"><h2>History</h2><button data-act="add-person-note" data-person-id="${p.id}">Add note</button></div>${warmTimeline(entriesForPerson(pid),true)}`;
  else if(ui.detailTab==='shidduchim'){const ideas=ideasForPerson(pid),shids=shidduchimForPerson(pid);const rows=[...ideas.map(i=>`<button class="warm-match-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>Offer · ${esc(person(i.guyId)?.name)} ↔ ${esc(person(i.girlId)?.name)}</strong></div><p>${esc(i.status)}</p></div><div class="warm-chevron">›</div></button>`),...shids.map(s=>`<button class="warm-match-row" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong></div><p>${esc(getCurrentRound(s)?.stage||s.status)}</p></div><div class="warm-chevron">›</div></button>`)].join('');content=`<div class="warm-section-title"><h2>Offers and shidduchim</h2></div><div class="warm-stack">${rows||empty('Nothing linked yet','Offers and shidduchim involving this person will stay together here.')}</div>`;}
  else if(ui.detailTab==='files')content=empty('No files yet','Profiles, PDFs and recordings will live here without mixing with private history.');
  else if(ui.detailTab==='profile')content=`<div class="warm-profile-card"><h3>Profile${p.profileVersion?` · v${p.profileVersion}`:''}</h3><p>${esc(p.profileText||'No profile text saved yet.')}</p></div><div class="warm-info-card"><div><span>Age</span><strong>${esc(p.age||'—')}</strong><button data-act="edit-person">Edit</button></div><div><span>City</span><strong>${esc(p.city||'—')}</strong></div><div><span>Occupation</span><strong>${esc(p.occupation||'—')}</strong></div></div>`;
  else if(isShad)content=`<div class="warm-info-card"><div><span>My profile</span><strong>${esc(myProfileStatus(p.id))}</strong><button data-act="log-profile" data-person-id="${p.id}">Send v${myProfileVersion()}</button></div><div><span>How I know them</span><strong>${esc(sourceNamesForPerson(p.id).replace('No source recorded','Not added yet'))}</strong></div></div>`;
  else content=`<div class="warm-info-card"><div><span>Their turn</span><strong>${esc(them.map(x=>x.label).join(', ')||'Nothing')}</strong></div><div><span>My turn</span><strong>${esc(mine.map(x=>x.label).join(', ')||'Nothing')}</strong></div><div><span>Last contact</span><strong>${esc(lc?`${fmtDay(lc)} · ${fmtTime(lc)}`:'Never')}</strong></div><div><span>How I know them</span><strong>${esc(sourceNamesForPerson(p.id))}</strong></div></div>`;
  return `<div class="warm-detail-page"><div class="warm-detail-glow"></div>${warmWordmark()}${zmProfileIdentity(p)}${zmPersonOpenStatus(p)}${warmContactButtons(p)}${warmPersonTabs(p,ui.detailTab)}<div class="warm-detail-content">${content}</div></div>`;
}

function sourceNamesForPerson(pid){const srcs=data.sources.filter(s=>s.peopleIds?.includes(pid));if(!srcs.length)return'No source recorded';const first=srcs.slice(0,2).map(s=>s.name).join(' · ');return srcs.length>2?`${first} · ${srcs.length-2} more`:first;}

