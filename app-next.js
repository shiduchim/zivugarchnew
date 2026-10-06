'use strict';

// UX refinement layer: clearer next steps, simpler Recent, universal Add, and many skins.
// Data architecture is unchanged.

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

    <div class="settings-heading">Style</div>
    <p class="skin-help">Same app, different personality. Navigation stays in the same place in every skin.</p>
    <div class="skin-picker skin-picker-many">${skinCards()}</div>

    <div class="settings-heading">Spacing</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Layout feel</b><span>Choose how roomy the screens feel</span></div><div class="option-group">${[['1','Standard'],['2','Roomy'],['3','Compact']].map(([v,l])=>`<button class="option ${String(s.appearance||'1')===v?'active':''}" data-setting="appearance" data-value="${v}">${l}</button>`).join('')}</div></div>
    </div>

    <div class="settings-heading">Use</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Mode</b><span>Single = for yourself. Shadchan = matching others.</span></div><div class="option-group">${['single','shadchan'].map(v=>`<button class="option ${s.mode===v?'active':''}" data-setting="mode" data-value="${v}">${v==='single'?'Single':'Shadchan'}</button>`).join('')}</div></div>
    </div>

    <div class="settings-heading">Data</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Backup</b><span>Export all local data</span></div><button class="option" data-act="export-backup">Export</button></div>
      <div class="setting-row"><div class="setting-copy"><b>Restore</b><span>Import a ZivugMatch backup</span></div><button class="option" data-act="import-backup">Import</button><input id="backupFile" type="file" accept="application/json" class="hidden" /></div>
      <div class="setting-row"><div class="setting-copy"><b>${data.meta.demo?'Start fresh':'Load demo data'}</b><span>${data.meta.demo?'Remove the made-up examples':'Replace current data with made-up examples'}</span></div><button class="option" data-act="toggle-demo">${data.meta.demo?'Clear demo':'Load demo'}</button></div>${earlierDataRows()}${openAttention().length?`<div class="setting-row"><div class="setting-copy"><b>Needs a look</b><span>${openAttention().length} thing${openAttention().length===1?'':'s'} the app would not decide by itself</span></div><button class="option" data-act="needs-look">Check</button></div>`:''}
    </div>
    <button class="primary-btn full" data-act="close-sheet">Done</button>
    <div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">ZivugMatch ${APP_VERSION_LABEL}</div>
  `);
}

// Data that can come back: the newest safety copy, and the data from before the v1.0 upgrade.
function earlierDataRows(){
  const loose=safetyCopies.find(x=>!x.pinned),pinned=safetyCopies.find(x=>x.pinned);
  const row=(c,title,text)=>`<div class="setting-row"><div class="setting-copy"><b>${title}</b><span>${esc(text)}</span></div><button class="option" data-act="undo-safety" data-copy-id="${esc(c.id)}">Restore</button></div>`;
  return (loose?row(loose,'Earlier data',`Kept before ${loose.reason} · ${fmtDate(loose.at)} ${fmtTime(loose.at)}`):'')+(pinned?row(pinned,`Before ${APP_VERSION_LABEL}`,`Your data as it was before the update · ${fmtDate(pinned.at)}`):'');
}

function personRow(p,{selected=false,context=''}={}){
  const lc=lastContact(p.id),line=context||ageText(p)||p.city||p.types?.join(', ')||'';
  return `<button class="warm-person-row ${selected?'selected':''}" data-person="${p.id}"><div class="warm-avatar ${avatarTone(p)}">${esc(initials(p.name))}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(p.name)}</strong><time>${esc(fmtDay(lc))}</time></div><div class="warm-person-line">${esc(line)}</div><div class="warm-person-status human-status">${esc(statusSentenceForPerson(p))}</div></div><div class="warm-chevron">›</div></button>`;
}

function nextTargetAttrs(x){
  if(x.about?.type==='shidduch'&&shidduch(x.about.id))return `data-shidduch="${shidduch(x.about.id).id}"`;
  return `data-person="${x.personId}"`;
}

function activityFeed(entries){
  const groups={};for(const e of entries){const k=dayKey(e.at);(groups[k]??=[]).push(e);}
  return Object.entries(groups).map(([day,arr])=>`<section class="warm-day"><div class="warm-day-label">${esc(day)}</div><div class="warm-feed">${arr.map(activityRow).join('')}</div></section>`).join('')||empty('Nothing here yet','Calls, messages, notes and profiles will appear here automatically.','add-activity');
}

function currentAdd(){universalAddSheet();}
