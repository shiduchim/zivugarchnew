'use strict';

// Warm Modern UI layer — follows the approved rendering direction.
// It deliberately changes only presentation and screen composition; the agreed data architecture stays intact.

ICONS.girl='<circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/><path d="M8.7 5.8c1.1-2.2 5.5-2.2 6.6 0"/>';
ICONS.plus=ICONS.edit;

const baseDefaultSettingsWarm=defaultSettings;
defaultSettings=function(){return {...baseDefaultSettingsWarm(),appearance:'1'};};
const baseApplySettingsWarm=applySettings;
applySettings=function(){
  baseApplySettingsWarm();
  const s=data?.settings||defaultSettings();
  document.documentElement.dataset.appearance=s.appearance||'1';
};

function warmWordmark(){return `<div class="warm-wordmark"><span>Zivug</span><b>Match</b><em>ב״ה</em></div>`;}

header=function(title,sub,{add=false,back=false,filter=false}={}){
  return `<header class="warm-header">${warmWordmark()}<div class="warm-title-row">${back?`<button class="warm-back" data-act="back" aria-label="Back">${icon('back')}</button>`:''}<div class="warm-title-copy"><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div><div class="warm-title-actions">${add?`<button class="warm-add" data-act="add-current">Add</button>`:''}${filter?`<button class="warm-circle" data-act="filters" aria-label="Filter">${icon('filter')}</button>`:''}<button class="warm-circle" data-act="settings" aria-label="Settings">${icon('gear')}</button></div></div></header>`;
};

searchBox=function(ph){return `<div class="warm-search-row"><label class="warm-search">${icon('search')}<input data-role="search" value="${esc(ui.search)}" placeholder="${esc(ph)}" /></label><button class="warm-filter" data-act="filters" aria-label="Filter and sort">${icon('filter')}</button></div>`;};

segment=function(items,active,scope){return `<div class="warm-segment-scroll"><div class="warm-segment">${items.map(x=>`<button class="warm-seg ${x.value===active?'active':''}" data-seg-scope="${scope}" data-seg="${esc(x.value)}"><span>${esc(x.label)}</span>${x.count!=null?`<small>${x.count}</small>`:''}</button>`).join('')}</div></div>`;};

summaryCard=function(cls,val,label,act=''){const ic=cls==='amber'?'hourglass':cls==='sage'?'heart':'check';return `<button class="warm-summary ${cls}" ${act?`data-act="${act}"`:''}><span class="warm-summary-icon">${icon(ic)}</span><span class="warm-summary-copy"><small>${esc(label)}</small><strong>${esc(val)}</strong></span></button>`;};

empty=function(title,text,act=''){return `<div class="warm-empty"><div class="warm-empty-icon">${icon('heart')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${act?`<button class="warm-primary" data-act="${act}">Add</button>`:''}</div>`;};

nav=function(){const items=[['recent','recent','Recent'],['guys','guy','Guys'],['girls','girl','Girls'],['shadchanim','shad','Shadchanim'],['shidduchim','heart','Shidduchim']];return `<nav class="warm-bottom-nav">${items.map(([screen,ic,label])=>`<button class="warm-nav ${ui.screen===screen?'active':''}" data-screen="${screen}"><span class="warm-nav-icon">${icon(ic)}</span><span>${label}</span></button>`).join('')}</nav>`;};

personRow=function(p,{selected=false,context=''}={}){
  const them=openForPerson(p.id,'them').length,meCount=openForPerson(p.id,'me').length,active=shidduchimForPerson(p.id).filter(s=>s.status==='active').length,lc=lastContact(p.id);
  const bits=[];if(them)bits.push(`${them} waiting`);if(meCount)bits.push(`${meCount} for me`);if(active)bits.push(`${active} active`);if(!bits.length&&needsContactPerson(p))bits.push('Needs contact');
  const line=context||ageText(p)||p.city||p.types?.join(', ')||'';
  return `<button class="warm-person-row ${selected?'selected':''}" data-person="${p.id}"><div class="warm-avatar ${avatarTone(p)}">${esc(initials(p.name))}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(p.name)}</strong><time>${esc(fmtDay(lc))}</time></div><div class="warm-person-line">${esc(line)}</div>${bits.length?`<div class="warm-person-status">${esc(bits.join(' · '))}</div>`:''}</div><div class="warm-chevron">›</div></button>`;
};

function warmActivityIcon(type){const map={call:['phone','sage'],message:['message','sky'],profile:['profile','peach'],date:['calendar','lav'],note:['note','amber'],source:['list','sky'],referral:['link','sage'],status:['check','sky']};return map[type]||['note','sky'];}
activityIcon=warmActivityIcon;
activityRow=function(e){
  const [ic,tone]=warmActivityIcon(e.type);
  let primary=e.type==='call'?'Call':e.type==='message'?(e.channel||'Message'):e.type==='profile'?'Profile':e.type==='date'?'Date':e.type==='source'?'Source':e.type==='note'?'Note':'Activity';
  let who='';if(e.direction==='in')who=person(e.fromPersonId)?.name||'';else if(e.direction==='out')who=person(e.toPersonId)?.name||'';else who=e.personIds?.map(pid=>person(pid)?.name).filter(Boolean).join(' · ')||'';
  return `<button class="warm-activity-row" data-entry="${e.id}"><div class="warm-activity-icon ${tone}">${icon(ic)}</div><div class="warm-activity-main"><div class="warm-activity-top"><strong>${esc(who?`${primary} · ${who}`:primary)}</strong><time>${esc(fmtTime(e.at))}</time></div><div class="warm-activity-text">${esc(e.text||'')}</div>${linkedAbout(e)?`<div class="warm-activity-about">${esc(linkedAbout(e))}${e.result?` · ${esc(e.result)}`:''}</div>`:''}</div><div class="warm-chevron">›</div></button>`;
};

recentScreen=function(){
  const c=counts(),settings=data.settings;let entries=[...data.entries].sort((a,b)=>new Date(b.at)-new Date(a.at));
  if(ui.recentFilter!=='all')entries=entries.filter(e=>e.type===ui.recentFilter);
  if(ui.search){const q=ui.search.toLowerCase();entries=entries.filter(e=>(e.text+' '+linkedAbout(e)+' '+e.personIds?.map(pid=>person(pid)?.name).join(' ')).toLowerCase().includes(q));}
  const groups={};for(const e of entries){const k=dayKey(e.at);(groups[k]??=[]).push(e);}
  const summary=settings.summaryCards?`<div class="warm-summary-grid">${summaryCard('blue',c.me,'Waiting on me','show-wait-me')}${summaryCard('amber',c.them,'Waiting on them','show-wait-them')}${summaryCard('sage',c.active,'Active shidduchim','show-active')}</div>`:'';
  const filters=[['all','All'],['call','Calls'],['message','Messages'],['profile','Profiles'],['date','Dates'],['note','Notes']];
  const feed=Object.entries(groups).map(([day,arr])=>`<section class="warm-day"><div class="warm-day-label">${esc(day)}</div><div class="warm-feed">${arr.map(activityRow).join('')}</div></section>`).join('')||empty('Nothing here yet','Recent fills itself as you call, message, receive profiles and work on shidduchim.','add-activity');
  const backupText=`${data.meta.demo?'Demo data':'Private local data'} · saved ${fmtTime(data.meta.updatedAt)}`;
  return `${header('Recent',backupText,{add:true})}${summary}${searchBox('Search people, messages, profiles…')}${segment(filters.map(([value,label])=>({value,label})),ui.recentFilter,'recent')}<div class="warm-section-title"><h2>Activity</h2><button data-act="add-activity">Add note</button></div>${feed}`;
};

peopleScreen=function(type){
  const isGirl=type==='Girl',key=isGirl?'girls':'guys';
  let tabs;if(isGirl&&data.settings.mode==='single')tabs=[{value:'for-me',label:'For me'},{value:'previous',label:'Previous'}];else tabs=[{value:'all',label:'All'},{value:'recent',label:'Recently added'}];
  const arr=filteredPeople(type);
  return `${header(isGirl?'Girls':'Guys',isGirl&&data.settings.mode==='single'?'Profiles relevant to you':'Browse and search',{add:true})}${searchBox(`Search ${isGirl?'girls':'guys'}…`)}${segment(tabs,ui.screenView[key],key)}<div class="warm-stack">${arr.map((p,i)=>personRow(p,{selected:i===0&&isGirl})).join('')||empty(`No ${isGirl?'girls':'guys'} here yet`,`Add a ${isGirl?'girl':'guy'} and the app will keep the profile, sources and history together.`,'add-current')}</div>`;
};

shadchanScreen=function(){
  const all=byType('Shadchan'),them=all.filter(p=>openForPerson(p.id,'them').length),mine=all.filter(p=>openForPerson(p.id,'me').length),needs=all.filter(needsContactPerson);
  let arr=all;const v=ui.screenView.shadchanim;if(v==='them')arr=them;if(v==='me')arr=mine;if(v==='needs')arr=needs;if(v==='sources')return sourceScreenEmbedded(all.length,them.length,mine.length,needs.length);
  const q=ui.search.toLowerCase();if(q)arr=arr.filter(p=>(`${p.name} ${p.city||''} ${p.phone||''}`).toLowerCase().includes(q));arr=arr.sort((a,b)=>(lastContact(b.id)||b.createdAt).localeCompare(lastContact(a.id)||a.createdAt));
  const tabs=[{value:'all',label:'All',count:all.length},{value:'them',label:'Waiting on them',count:them.length},{value:'me',label:'Waiting on me',count:mine.length},{value:'needs',label:'Needs contact',count:needs.length},{value:'sources',label:'Sources',count:data.sources.length}];
  return `${header('Shadchanim',`${all.length} people in your network`,{add:true})}${searchBox('Search name, phone or city…')}${segment(tabs,v,'shadchanim')}<div class="warm-stack">${arr.map((p,i)=>personRow(p,{selected:i===0})).join('')||empty('No shadchanim in this view','Nothing needs your attention here right now.')}</div>`;
};

sourceScreenEmbedded=function(total,them,mine,needs){
  const tabs=[{value:'all',label:'All',count:total},{value:'them',label:'Waiting on them',count:them},{value:'me',label:'Waiting on me',count:mine},{value:'needs',label:'Needs contact',count:needs},{value:'sources',label:'Sources',count:data.sources.length}];
  const rows=data.sources.map(src=>{const st=sourceStats(src);return `<button class="warm-source-row" data-source="${src.id}"><div class="warm-activity-icon ${src.kind==='event'?'peach':'sky'}">${icon(src.kind==='event'?'calendar':'list')}</div><div class="warm-source-main"><div><strong>${esc(src.name)}</strong><time>${esc(fmtDate(src.createdAt))}</time></div><p>${st.total} total · ${st.contacted} contacted · ${st.replied} replied${st.follow?` · ${st.follow} follow-up`:''}</p></div><div class="warm-chevron">›</div></button>`;}).join('');
  return `${header('Shadchanim',`${total} people in your network`,{add:true})}${searchBox('Search sources…')}${segment(tabs,'sources','shadchanim')}<div class="warm-section-title"><h2>Sources</h2><button data-act="add-source">Add source</button></div><div class="warm-stack">${rows||empty('No sources yet','Lists, events and referrals stay here without duplicating people.','add-source')}</div>`;
};

shidduchimScreen=function(){
  const v=ui.screenView.shidduchim,active=data.shidduchim.filter(s=>s.status==='active'),ended=data.shidduchim.filter(s=>s.status==='ended'),ideas=data.ideas.filter(i=>i.status==='open');
  const tabs=[{value:'active',label:'Active',count:active.length},{value:'ideas',label:'Ideas',count:ideas.length},{value:'ended',label:'Ended',count:ended.length}];
  let rows='';if(v==='ideas')rows=ideas.map(i=>{const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);return `<button class="warm-match-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} ↔ ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>Suggested by ${esc(sug?.name||'you')}</p><span class="warm-pill blue">Waiting on me</span></div><div class="warm-chevron">›</div></button>`;}).join('');else rows=(v==='active'?active:ended).map(s=>{const r=getCurrentRound(s),waiting=s.status==='active'&&openForShidduch(s.id,'them').length;return `<button class="warm-match-row" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong><time>Round ${r?.number||1}</time></div><p>${esc(r?.stage||s.status)}</p><span class="warm-pill ${waiting?'amber':s.status==='ended'?'muted':'sage'}">${waiting?'Waiting on them':s.status==='ended'?'Ended':'Active'}</span></div><div class="warm-chevron">›</div></button>`;}).join('');
  return `${header('Shidduchim','Actual pairings and ideas',{add:true})}${searchBox('Search a pair…')}${segment(tabs,v,'shidduchim')}<div class="warm-stack">${rows||empty(v==='ideas'?'No open ideas':`No ${v} shidduchim`,v==='ideas'?'An idea is a suggested pair that has not started yet.':v==='active'?'When an idea becomes real, it will appear here.':'Ended shidduchim keep their full history.','add-idea')}</div>`;
};

function warmMetric(ic,tone,label,value){return `<div class="warm-metric ${tone}"><span class="warm-metric-icon">${icon(ic)}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong></div></div>`;}
function warmContactButtons(p){return `<div class="warm-contact-row"><button class="warm-contact phone" data-contact="call" data-person-id="${p.id}"><span>${icon('phone')}</span><small>Call</small></button><button class="warm-contact email" data-contact="email" data-person-id="${p.id}"><span>${icon('mail')}</span><small>Email</small></button><button class="warm-contact message" data-contact="wa" data-person-id="${p.id}"><span>${icon('message')}</span><small>WhatsApp</small></button><button class="warm-contact sms" data-contact="sms" data-person-id="${p.id}"><span>${icon('message')}</span><small>SMS</small></button><button class="warm-contact wait" data-contact="wait" data-person-id="${p.id}"><span>${icon('hourglass')}</span><small>Waiting</small></button></div>`;}
function warmPersonTabs(p,active){const base=p.types?.includes('Shadchan')?[['details','Details'],['conversation','History'],['shidduchim','Shidduchim'],['files','Files']]:[['profile','Profile'],['conversation','History'],['shidduchim','Shidduchim'],['files','Files']];return `<div class="warm-tabs">${base.map(([v,l])=>`<button class="warm-tab ${active===v?'active':''}" data-detail-tab="${v}">${l}</button>`).join('')}</div>`;}
personTabs=warmPersonTabs;

function warmTimeline(entries){if(!entries.length)return empty('No history yet','Calls, messages, notes and profiles will appear here automatically.');return `<div class="warm-history">${entries.map(e=>{const [ic,tone]=warmActivityIcon(e.type);const title=e.type==='message'?(e.direction==='in'?(person(e.fromPersonId)?.name||'Message'):'Message sent'):e.type==='call'?'Call':e.type==='profile'?'Profile':e.type==='date'?'Date':e.type==='source'?'Source':e.type==='referral'?'Referral':'Note';return `<button class="warm-history-row" data-entry="${e.id}"><div class="warm-activity-icon ${tone}">${icon(ic)}</div><div class="warm-history-main"><div><strong>${esc(title)}</strong><time>${esc(fmtTime(e.at))}</time></div><p>${esc(e.text||'')}</p>${linkedAbout(e)?`<span>${esc(linkedAbout(e))}${e.result?` · ${esc(e.result)}`:''}</span>`:''}</div><div class="warm-chevron">›</div></button>`;}).join('')}</div>`;}

timelineHtml=warmTimeline;

personDetail=function(pid){
  const p=person(pid);if(!p)return recentScreen();
  const isShad=p.types?.includes('Shadchan'),them=openForPerson(pid,'them'),mine=openForPerson(pid,'me'),shids=shidduchimForPerson(pid),active=shids.filter(s=>s.status==='active'),lc=lastContact(pid);
  const defaultTab=isShad?'details':'profile';if(!['details','profile','conversation','shidduchim','files'].includes(ui.detailTab))ui.detailTab=defaultTab;
  const type=isShad?'Shadchan':p.types?.includes('Girl')?'Girl':p.types?.includes('Guy')?'Guy':'Person';
  let content='';
  if(ui.detailTab==='conversation')content=`<div class="warm-section-title"><h2>History</h2><button data-act="add-person-note" data-person-id="${p.id}">Add note</button></div>${warmTimeline(entriesForPerson(pid))}`;
  else if(ui.detailTab==='shidduchim'){const ideas=ideasForPerson(pid);const rows=[...ideas.map(i=>`<button class="warm-match-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>Idea · ${esc(person(i.guyId)?.name)} ↔ ${esc(person(i.girlId)?.name)}</strong></div><p>${esc(i.status)}</p></div><div class="warm-chevron">›</div></button>`),...shids.map(s=>`<button class="warm-match-row" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong></div><p>${esc(getCurrentRound(s)?.stage||s.status)}</p></div><div class="warm-chevron">›</div></button>`)].join('');content=`<div class="warm-section-title"><h2>Ideas and shidduchim</h2></div><div class="warm-stack">${rows||empty('Nothing linked yet','Ideas and shidduchim involving this person will stay together here.')}</div>`;}
  else if(ui.detailTab==='files')content=empty('No files yet','Profiles, PDFs and recordings will live here without mixing with private history.');
  else if(ui.detailTab==='profile')content=`<div class="warm-profile-card"><h3>Profile${p.profileVersion?` · v${p.profileVersion}`:''}</h3><p>${esc(p.profileText||'No profile text saved yet.')}</p></div><div class="warm-info-card"><div><span>Age</span><strong>${esc(p.age||'—')}</strong><button data-act="edit-person">Edit</button></div><div><span>City</span><strong>${esc(p.city||'—')}</strong></div><div><span>Occupation</span><strong>${esc(p.occupation||'—')}</strong></div></div>`;
  else content=`<div class="warm-info-card"><div><span>Waiting on them</span><strong>${esc(them.map(x=>x.label).join(', ')||'Nothing')}</strong></div><div><span>Waiting on me</span><strong>${esc(mine.map(x=>x.label).join(', ')||'Nothing')}</strong></div>${isShad?`<div><span>My profile</span><strong>Has v3 · v4 ready</strong><button data-act="log-profile" data-person-id="${p.id}">Send v4</button></div>`:''}<div><span>Last contact</span><strong>${esc(lc?`${fmtDay(lc)} · ${fmtTime(lc)}`:'Never')}</strong></div><div><span>How I know ${isShad?'her':'them'}</span><strong>${esc(sourceNamesForPerson(p.id))}</strong></div></div>`;

  return `<div class="warm-detail-page"><div class="warm-detail-glow"></div>${warmWordmark()}<div class="warm-detail-title"><button class="warm-back" data-act="back">${icon('back')}</button><div class="warm-detail-name"><h1>${esc(p.name)}</h1><div>${esc(p.city||'No city')} · ${esc(type)}</div><span>${esc(type)}</span></div><button class="warm-more" data-act="detail-menu">⋯</button></div><div class="warm-person-hero"><div class="warm-person-big ${avatarTone(p)}">${esc(initials(p.name))}</div><div class="warm-person-hero-copy"><strong>${esc(ageText(p)||p.city||type)}</strong><small>${isShad?'Relationship and shidduch contact':'Profile and history'}</small></div></div><div class="warm-metric-grid">${warmMetric('phone','sage','Last contact',lc?fmtDay(lc):'Never')}${warmMetric('hourglass','amber','Waiting on them',String(them.length))}${warmMetric('shad','blue','Active shidduchim',String(active.length))}</div>${warmContactButtons(p)}${warmPersonTabs(p,ui.detailTab)}<div class="warm-detail-content">${content}</div></div>`;
};

sourceNamesForPerson=function(pid){const srcs=data.sources.filter(s=>s.peopleIds?.includes(pid));if(!srcs.length)return'No source recorded';const first=srcs.slice(0,2).map(s=>s.name).join(' · ');return srcs.length>2?`${first} · ${srcs.length-2} more`:first;};

settingsSheet=function(){
  const s=data.settings;
  openSheet(`<h2>Settings</h2><p class="lead">Appearance changes only how the app looks. It never changes your people, history or shidduchim.</p><div class="appearance-picker"><button class="appearance-choice ${String(s.appearance||'1')==='1'?'active':''}" data-setting="appearance" data-value="1"><span class="appearance-preview ap1"><i></i><i></i><i></i></span><b>Appearance 1</b><small>Warm Modern · approved rendering</small></button><button class="appearance-choice ${String(s.appearance)==='2'?'active':''}" data-setting="appearance" data-value="2"><span class="appearance-preview ap2"><i></i><i></i><i></i></span><b>Appearance 2</b><small>Airy Modern</small></button><button class="appearance-choice ${String(s.appearance)==='3'?'active':''}" data-setting="appearance" data-value="3"><span class="appearance-preview ap3"><i></i><i></i><i></i></span><b>Appearance 3</b><small>Quiet Modern</small></button></div><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Mode</b><span>Same data, different focus</span></div><div class="option-group">${['single','shadchan'].map(v=>`<button class="option ${s.mode===v?'active':''}" data-setting="mode" data-value="${v}">${v==='single'?'Single':'Shadchan'}</button>`).join('')}</div></div><div class="setting-row"><div class="setting-copy"><b>Theme</b><span>Color palette</span></div><div class="option-group">${['warm','blue','sage','dark'].map(v=>`<button class="option ${s.theme===v?'active':''}" data-setting="theme" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div><div class="setting-row"><div class="setting-copy"><b>Density</b><span>How much fits on screen</span></div><div class="option-group">${['comfortable','compact'].map(v=>`<button class="option ${s.density===v?'active':''}" data-setting="density" data-value="${v}">${v==='comfortable'?'Comfortable':'Compact'}</button>`).join('')}</div></div><div class="setting-row"><div class="setting-copy"><b>Icons and avatars</b><span>Size only</span></div><div class="option-group">${['small','medium','large'].map(v=>`<button class="option ${s.iconSize===v?'active':''}" data-setting="iconSize" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div></div><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Backup</b><span>Export all local data as JSON</span></div><button class="option" data-act="export-backup">Export</button></div><div class="setting-row"><div class="setting-copy"><b>Restore</b><span>Import a ZivugMatch backup</span></div><button class="option" data-act="import-backup">Import</button><input id="backupFile" type="file" accept="application/json" class="hidden"></div></div><button class="primary-btn full" data-act="close-sheet">Done</button><div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">v0.12.0</div>`);
};
