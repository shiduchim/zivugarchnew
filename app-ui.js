'use strict';

// UI polish layer. Keeps the approved architecture/data model unchanged.
// Appearance 1 is the approved Warm Modern rendering direction.

const baseDefaultSettingsV10 = defaultSettings;
defaultSettings = function(){
  return {...baseDefaultSettingsV10(), appearance:'1'};
};

const baseApplySettingsV10 = applySettings;
applySettings = function(){
  baseApplySettingsV10();
  const s=data?.settings||defaultSettings();
  document.documentElement.dataset.appearance=s.appearance||'1';
};

header = function(title,sub,{add=false,back=false,filter=false}={}){
  return `<header class="screen-head"><div class="head-main">${back?'':`<div class="app-mark"><div class="wordmark">Zivug<span>Match</span></div><div class="bh">ב״ה</div></div>`}<div class="screen-title-row">${back?`<button class="back-btn" data-act="back">${icon('back')}</button>`:''}<h1 class="screen-title">${esc(title)}</h1></div>${sub?`<div class="screen-sub">${esc(sub)}</div>`:''}</div><div class="head-actions">${add?`<button class="add-text-btn" data-act="add-current" aria-label="Add">Add</button>`:''}${filter?`<button class="icon-btn" data-act="filters" aria-label="Filters">${icon('filter')}</button>`:''}<button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear')}</button></div></header>`;
};

sourceNamesForPerson = function(pid){
  const srcs=data.sources.filter(s=>s.peopleIds?.includes(pid));
  if(!srcs.length)return 'No source recorded';
  const first=srcs.slice(0,2).map(s=>s.name).join(' · ');
  return srcs.length>2?`${first} · ${srcs.length-2} more`:first;
};

personTabs = function(p,active){
  const base=p.types?.includes('Shadchan')?[['details','Details'],['conversation','History'],['shidduchim','Shidduchim'],['files','Files']]:[['profile','Profile'],['conversation','History'],['shidduchim','Shidduchim'],['files','Files']];
  return `<div class="tabbar">${base.map(([v,l])=>`<button class="tab-btn ${active===v?'active':''}" data-detail-tab="${v}">${l}</button>`).join('')}</div>`;
};

function metricTile(iconName,tone,label,value){
  return `<div class="metric-card ${tone}"><div class="metric-icon">${icon(iconName)}</div><div class="metric-copy"><span>${esc(label)}</span><strong>${esc(value)}</strong></div></div>`;
}

function activityRowsPretty(entries){
  if(!entries.length)return empty('No history yet','Calls, messages, notes and profiles will appear here automatically.');
  return `<div class="conversation-list">${entries.map(e=>{
    const [ic,tone]=activityIcon(e.type);
    const title=e.type==='message'?(e.direction==='in'?(person(e.fromPersonId)?.name||'Message'):(e.direction==='out'?'Message sent':'Message')):e.type==='call'?'Call':e.type==='profile'?'Profile':e.type==='date'?'Date':e.type==='source'?'Source':e.type==='referral'?'Referral':'Note';
    return `<button class="conversation-row" data-entry="${e.id}"><div class="conversation-icon ${tone}">${icon(ic)}</div><div class="conversation-main"><div class="conversation-top"><strong>${esc(title)}</strong><time>${esc(fmtTime(e.at))}</time></div><div class="conversation-text">${esc(e.text||'')}</div>${linkedAbout(e)?`<div class="conversation-about">${esc(linkedAbout(e))}${e.result?` · ${esc(e.result)}`:''}</div>`:''}</div><div class="conversation-chevron">›</div></button>`;
  }).join('')}</div>`;
}

function relatedShidduchimPretty(pid){
  const list=shidduchimForPerson(pid).slice(0,3);
  if(!list.length)return '';
  return `<div class="section-head related-head"><h2>Related shidduchim</h2><button data-detail-tab="shidduchim">See all</button></div><div class="related-card">${list.map(s=>{const r=getCurrentRound(s);return `<button class="related-row" data-shidduch="${s.id}"><div class="related-avatar">${esc(initials(person(s.guyId)?.name))}${esc(initials(person(s.girlId)?.name))}</div><div><strong>${esc(shidduchTitle(s))}</strong><span>${esc(r?.stage||s.status)}</span></div><div class="conversation-chevron">›</div></button>`;}).join('')}</div>`;
}

const basePersonDetailV10 = personDetail;
personDetail = function(pid){
  const p=person(pid);
  if(!p)return recentScreen();
  const isShad=p.types?.includes('Shadchan');
  if(!isShad)return basePersonDetailV10(pid);

  const them=openForPerson(pid,'them'),mine=openForPerson(pid,'me');
  const shids=shidduchimForPerson(pid),active=shids.filter(s=>s.status==='active');
  if(!['details','conversation','shidduchim','files'].includes(ui.detailTab))ui.detailTab='details';
  const lc=lastContact(pid);
  const city=p.city||'No city';
  let content='';

  if(ui.detailTab==='conversation'){
    content=`<div class="conversation-day">Today</div>${activityRowsPretty(entriesForPerson(pid))}${relatedShidduchimPretty(pid)}`;
  }else if(ui.detailTab==='shidduchim'){
    const ideas=ideasForPerson(pid);
    content=`<div class="section-head"><h2>Ideas and shidduchim</h2></div>${(ideas.length||shids.length)?`<div class="list-card">${ideas.map(i=>`<button class="list-row" data-idea="${i.id}"><div class="avatar heart">♡</div><div class="row-main"><div class="row-name">Idea · ${esc(person(i.guyId)?.name)} ↔ ${esc(person(i.girlId)?.name)}</div><div class="row-line">${esc(i.status)}</div></div><div class="row-end">›</div></button>`).join('')}${shids.map(s=>`<button class="list-row" data-shidduch="${s.id}"><div class="avatar heart">♥</div><div class="row-main"><div class="row-name">${esc(shidduchTitle(s))}</div><div class="row-line">${esc(getCurrentRound(s)?.stage||s.status)}</div></div><div class="row-end">›</div></button>`).join('')}</div>`:empty('Nothing linked yet','Ideas and shidduchim involving this shadchan will stay together here.')}`;
  }else if(ui.detailTab==='files'){
    content=empty('No files yet','Profiles, PDFs and recordings will live here without mixing with private history.');
  }else{
    content=`<div class="info-card elegant-info"><div class="info-row"><div class="info-label">Waiting on them</div><div class="info-value">${esc(them.map(x=>x.label).join(', ')||'Nothing')}</div><span></span></div><div class="info-row"><div class="info-label">Waiting on me</div><div class="info-value">${esc(mine.map(x=>x.label).join(', ')||'Nothing')}</div><span></span></div><div class="info-row"><div class="info-label">My profile</div><div class="info-value">Has v3 · v4 ready</div><button class="info-action" data-act="log-profile" data-person-id="${p.id}">Send v4</button></div><div class="info-row"><div class="info-label">Last contact</div><div class="info-value">${esc(lc?`${fmtDay(lc)} · ${fmtTime(lc)}`:'Never')}</div><span></span></div><div class="info-row"><div class="info-label">How I know her</div><div class="info-value">${esc(sourceNamesForPerson(p.id))}</div><span></span></div></div>`;
  }

  return `<div class="mock-detail-shell">
    <div class="mock-wordmark"><span>Zivug</span><b>Match</b><em>ב״ה</em></div>
    <div class="mock-title-row"><button class="back-btn" data-act="back">${icon('back')}</button><div class="mock-title-copy"><h1>${esc(p.name)}</h1><span class="type-chip">Shadchan</span></div><button class="more-btn" data-act="detail-menu">⋯</button></div>
    <div class="mock-city">${esc(city)}</div>
    <div class="metric-grid">${metricTile('phone','sage','Last contact',lc?fmtDay(lc):'Never')}${metricTile('hourglass','peach','Waiting on them',String(them.length))}${metricTile('shad','blue','Active shidduchim',String(active.length))}</div>
    ${contactButtons(p)}
    ${personTabs(p,ui.detailTab)}
    <div class="mock-content">${content}</div>
  </div>`;
};

settingsSheet = function(){
  const s=data.settings;
  openSheet(`<h2>Settings</h2><p class="lead">Appearance changes only how the app looks. It never changes people, history or shidduchim.</p>
  <div class="appearance-picker">
    <button class="appearance-choice ${String(s.appearance||'1')==='1'?'active':''}" data-setting="appearance" data-value="1"><span class="appearance-preview ap1"><i></i><i></i><i></i></span><b>Appearance 1</b><small>Warm Modern · closest to the approved rendering</small></button>
    <button class="appearance-choice ${String(s.appearance)==='2'?'active':''}" data-setting="appearance" data-value="2"><span class="appearance-preview ap2"><i></i><i></i><i></i></span><b>Appearance 2</b><small>Airy Modern · brighter and more spacious</small></button>
    <button class="appearance-choice ${String(s.appearance)==='3'?'active':''}" data-setting="appearance" data-value="3"><span class="appearance-preview ap3"><i></i><i></i><i></i></span><b>Appearance 3</b><small>Quiet Modern · flatter and more compact</small></button>
  </div>
  <div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Mode</b><span>Same data, different focus</span></div><div class="option-group">${['single','shadchan'].map(v=>`<button class="option ${s.mode===v?'active':''}" data-setting="mode" data-value="${v}">${v==='single'?'Single':'Shadchan'}</button>`).join('')}</div></div>
  <div class="setting-row"><div class="setting-copy"><b>Theme</b><span>Color palette</span></div><div class="option-group">${['warm','blue','sage','dark'].map(v=>`<button class="option ${s.theme===v?'active':''}" data-setting="theme" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
  <div class="setting-row"><div class="setting-copy"><b>Density</b><span>How much fits on screen</span></div><div class="option-group">${['comfortable','compact'].map(v=>`<button class="option ${s.density===v?'active':''}" data-setting="density" data-value="${v}">${v==='comfortable'?'Comfortable':'Compact'}</button>`).join('')}</div></div>
  <div class="setting-row"><div class="setting-copy"><b>Icons and avatars</b><span>Size only</span></div><div class="option-group">${['small','medium','large'].map(v=>`<button class="option ${s.iconSize===v?'active':''}" data-setting="iconSize" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
  <div class="setting-row"><div class="setting-copy"><b>Summary cards</b><span>On Recent</span></div><div class="option-group"><button class="option ${s.summaryCards?'active':''}" data-setting="summaryCards" data-value="true">Show</button><button class="option ${!s.summaryCards?'active':''}" data-setting="summaryCards" data-value="false">Hide</button></div></div></div>
  <div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Backup</b><span>Export all local data as JSON</span></div><button class="option" data-act="export-backup">Export</button></div><div class="setting-row"><div class="setting-copy"><b>Restore</b><span>Import a ZivugMatch backup</span></div><button class="option" data-act="import-backup">Import</button><input id="backupFile" type="file" accept="application/json" class="hidden" /></div></div>
  <div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>${data.meta.demo?'Start fresh':'Load demo data'}</b><span>${data.meta.demo?'Remove the made-up examples':'Replace current data with made-up examples'}</span></div><button class="option" data-act="toggle-demo">${data.meta.demo?'Clear demo':'Load demo'}</button></div></div>
  <button class="primary-btn full" data-act="close-sheet">Done</button><div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">v0.11.0</div>`);
};
