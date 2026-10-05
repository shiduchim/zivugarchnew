'use strict';

// UX refinement layer: clearer next steps, simpler Recent, universal Add, and many skins.
// Data architecture is unchanged.

const previousApplySettingsNext=applySettings;
applySettings=function(){
  previousApplySettingsNext();
  const skin=data?.settings?.skin||'classic';
  document.documentElement.dataset.skin=skin;
  const colors={classic:'#f6f0e7',game:'#f5f3ff',easy:'#fffaf0',dark:'#15191f',contrast:'#ffffff',boys:'#eef7fb',girls:'#fbf2f6',jerusalem:'#f3eadc',macaron:'#fbf7fb',notebook:'#fbf7ec',luxury:'#faf7f2',clean:'#f2f2f7',glass:'#f4f6fb',whitecity:'#f6f6f4',startup:'#f6f7f9',mono:'#f2f2f2',retro:'#008080',hearth:'#f1e6d8',ledger:'#faf6ea',sticker:'#fffaf0',shabbos:'#f7f0e4',kinneret:'#f3ead8',midnight:'#14201c',daynight:'#f7f3ea'};
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colors[skin]||'#f6f0e7');
};

function settingsSheet(){
  const s=data.settings,layout=s.layout||'auto';
  openSheet(`
    <h2>Settings</h2>
    <p class="lead">Make ZivugMatch feel comfortable to you. These choices change how it looks, never your people or history.</p>

    <div class="settings-heading">View</div>
    <div class="sheet-section">
      <div class="setting-copy" style="padding:2px 0 8px"><b>Screen layout</b><span>Best for this screen, or always phone-size.</span></div>
      <div class="layout-choice-row">
        <button class="layout-choice ${layout==='auto'||layout==='web'?'active':''}" data-setting="layout" data-value="auto">Auto<small>Best for this screen</small></button>
        <button class="layout-choice ${layout==='phone'?'active':''}" data-setting="layout" data-value="phone">Phone<small>Phone-size layout</small></button>
      </div>
    </div>

    <div class="settings-heading">Skin</div>
    <p class="skin-help">Same app, different personality. Navigation stays in the same place in every skin.</p>
    <div class="skin-picker skin-picker-many">${skinCards()}</div>

    <div class="settings-heading">Spacing</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Layout feel</b><span>Choose how roomy the screens feel</span></div><div class="option-group">${[['1','Standard'],['2','Roomy'],['3','Compact']].map(([v,l])=>`<button class="option ${String(s.appearance||'1')===v?'active':''}" data-setting="appearance" data-value="${v}">${l}</button>`).join('')}</div></div>
    </div>

    <div class="settings-heading">Use</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Mode</b><span>Same data, different focus</span></div><div class="option-group">${['single','shadchan'].map(v=>`<button class="option ${s.mode===v?'active':''}" data-setting="mode" data-value="${v}">${v==='single'?'Single':'Shadchan'}</button>`).join('')}</div></div>
    </div>

    <div class="settings-heading">Data</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Backup</b><span>Export all local data</span></div><button class="option" data-act="export-backup">Export</button></div>
      <div class="setting-row"><div class="setting-copy"><b>Restore</b><span>Import a ZivugMatch backup</span></div><button class="option" data-act="import-backup">Import</button><input id="backupFile" type="file" accept="application/json" class="hidden" /></div>
      <div class="setting-row"><div class="setting-copy"><b>${data.meta.demo?'Start fresh':'Load demo data'}</b><span>${data.meta.demo?'Remove the made-up examples':'Replace current data with made-up examples'}</span></div><button class="option" data-act="toggle-demo">${data.meta.demo?'Clear demo':'Load demo'}</button></div>${safetyCopies.length?`<div class="setting-row"><div class="setting-copy"><b>Earlier data</b><span>Kept before ${esc(safetyCopies[0].reason)} · ${esc(fmtDate(safetyCopies[0].at))} ${esc(fmtTime(safetyCopies[0].at))}</span></div><button class="option" data-act="undo-safety" data-copy-id="${esc(safetyCopies[0].id)}">Restore</button></div>`:''}
    </div>
    <button class="primary-btn full" data-act="close-sheet">Done</button>
    <div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">v0.17.0</div>
  `);
}

function personRow(p,{selected=false,context=''}={}){
  const lc=lastContact(p.id),line=context||ageText(p)||p.city||p.types?.join(', ')||'';
  return `<button class="warm-person-row ${selected?'selected':''}" data-person="${p.id}"><div class="warm-avatar ${avatarTone(p)}">${esc(initials(p.name))}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(p.name)}</strong><time>${esc(fmtDay(lc))}</time></div><div class="warm-person-line">${esc(line)}</div><div class="warm-person-status human-status">${esc(statusSentenceForPerson(p))}</div></div><div class="warm-chevron">›</div></button>`;
}

function nextTargetAttrs(x){
  if(x.aboutType==='shidduch'&&shidduch(x.aboutId))return `data-shidduch="${x.aboutId}"`;
  return `data-person="${x.personId}"`;
}

function activityFeed(entries){
  const groups={};for(const e of entries){const k=dayKey(e.at);(groups[k]??=[]).push(e);}
  return Object.entries(groups).map(([day,arr])=>`<section class="warm-day"><div class="warm-day-label">${esc(day)}</div><div class="warm-feed">${arr.map(activityRow).join('')}</div></section>`).join('')||empty('Nothing here yet','Calls, messages, notes and profiles will appear here automatically.','add-activity');
}

const previousShadchanScreenNext=shadchanScreen;
shadchanScreen=function(){
  if(ui.screenView.shadchanim!=='all'||ui.search)return previousShadchanScreenNext();
  const all=byType('Shadchan').sort(byName);
  const active=all.filter(p=>openForPerson(p.id).length||shidduchimForPerson(p.id).some(s=>s.status==='active'));
  const activeIds=new Set(active.map(p=>p.id)),rest=all.filter(p=>!activeIds.has(p.id));
  const groups={};for(const p of rest){const k=(p.name?.[0]||'#').toUpperCase();(groups[k]??=[]).push(p);}
  const them=all.filter(p=>openForPerson(p.id,'them').length),mine=all.filter(p=>openForPerson(p.id,'me').length),needs=all.filter(needsContactPerson);
  const tabs=[{value:'all',label:'All',count:all.length},{value:'them',label:'Waiting on them',count:them.length},{value:'me',label:'Waiting on me',count:mine.length},{value:'needs',label:'Needs contact',count:needs.length},{value:'sources',label:'Sources',count:data.sources.length}];
  const activeHtml=active.length?`<div class="warm-section-title shad-section"><h2>Active now</h2><span>${active.length}</span></div><div class="warm-stack">${active.slice(0,8).map(p=>personRow(p)).join('')}</div>`:'';
  const az=Object.entries(groups).map(([letter,arr])=>`<section class="alpha-group"><div class="alpha-letter">${letter}</div><div class="warm-stack">${arr.map(p=>personRow(p)).join('')}</div></section>`).join('');
  return `${header('Shadchanim',`${all.length} people in your network`,{add:true})}${searchBox('Search name, phone or city…')}${segment(tabs,'all','shadchanim')}${activeHtml}<div class="warm-section-title shad-section"><h2>Everyone A–Z</h2><span>${rest.length}</span></div>${az}`;
};

function currentAdd(){universalAddSheet();}

// Repaint once this late-loaded UX layer has replaced the earlier rendering functions.
if(data){applySettings();render();}
