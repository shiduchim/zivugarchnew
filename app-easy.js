'use strict';

// Simple-view layer: lets the same app be viewed as responsive Web or Phone.
// No data model changes.

const baseDefaultSettingsEasy = defaultSettings;
defaultSettings = function(){
  return {...baseDefaultSettingsEasy(), layout:'auto'};
};

const baseApplySettingsEasy = applySettings;
applySettings = function(){
  baseApplySettingsEasy();
  const s=data?.settings||defaultSettings();
  document.documentElement.dataset.layout=s.layout||'auto';
};

settingsSheet = function(){
  const s=data.settings;
  const layout=s.layout||'auto';
  openSheet(`
    <h2>Settings</h2>
    <p class="lead">Keep the app simple. These choices only change what you see — never your people, history or shidduchim.</p>

    <div class="settings-heading">View</div>
    <div class="sheet-section">
      <div class="setting-copy" style="padding:2px 0 8px"><b>Screen layout</b><span>Switch between the normal responsive view and a phone-size view.</span></div>
      <div class="layout-choice-row">
        <button class="layout-choice ${layout==='auto'?'active':''}" data-setting="layout" data-value="auto">Auto<small>Best for this screen</small></button>
        <button class="layout-choice ${layout==='phone'?'active':''}" data-setting="layout" data-value="phone">Phone<small>Phone-size layout</small></button>
        <button class="layout-choice ${layout==='web'?'active':''}" data-setting="layout" data-value="web">Web<small>Desktop layout</small></button>
      </div>
    </div>

    <div class="settings-heading">Look</div>
    <div class="appearance-picker">
      <button class="appearance-choice ${String(s.appearance||'1')==='1'?'active':''}" data-setting="appearance" data-value="1"><span class="appearance-preview ap1"><i></i><i></i><i></i></span><b>Appearance 1</b><small>Warm Modern · the main design</small></button>
      <button class="appearance-choice ${String(s.appearance)==='2'?'active':''}" data-setting="appearance" data-value="2"><span class="appearance-preview ap2"><i></i><i></i><i></i></span><b>Appearance 2</b><small>Airy Modern · brighter and more spacious</small></button>
      <button class="appearance-choice ${String(s.appearance)==='3'?'active':''}" data-setting="appearance" data-value="3"><span class="appearance-preview ap3"><i></i><i></i><i></i></span><b>Appearance 3</b><small>Quiet Modern · flatter and more compact</small></button>
    </div>

    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Theme</b><span>Color palette</span></div><div class="option-group">${['warm','blue','sage','dark'].map(v=>`<button class="option ${s.theme===v?'active':''}" data-setting="theme" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
      <div class="setting-row"><div class="setting-copy"><b>Size</b><span>Comfortable is easiest to read</span></div><div class="option-group">${['comfortable','compact'].map(v=>`<button class="option ${s.density===v?'active':''}" data-setting="density" data-value="${v}">${v==='comfortable'?'Comfortable':'Compact'}</button>`).join('')}</div></div>
      <div class="setting-row"><div class="setting-copy"><b>Icons and initials</b><span>Make touch targets easier to see</span></div><div class="option-group">${['small','medium','large'].map(v=>`<button class="option ${s.iconSize===v?'active':''}" data-setting="iconSize" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
      <div class="setting-row"><div class="setting-copy"><b>Summary cards</b><span>Quick attention items on Recent</span></div><div class="option-group"><button class="option ${s.summaryCards?'active':''}" data-setting="summaryCards" data-value="true">Show</button><button class="option ${!s.summaryCards?'active':''}" data-setting="summaryCards" data-value="false">Hide</button></div></div>
    </div>

    <div class="settings-heading">Use</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Mode</b><span>Same data, different focus</span></div><div class="option-group">${['single','shadchan'].map(v=>`<button class="option ${s.mode===v?'active':''}" data-setting="mode" data-value="${v}">${v==='single'?'Single':'Shadchan'}</button>`).join('')}</div></div>
    </div>

    <div class="settings-heading">Data</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Backup</b><span>Export all local data</span></div><button class="option" data-act="export-backup">Export</button></div>
      <div class="setting-row"><div class="setting-copy"><b>Restore</b><span>Import a ZivugMatch backup</span></div><button class="option" data-act="import-backup">Import</button><input id="backupFile" type="file" accept="application/json" class="hidden" /></div>
      <div class="setting-row"><div class="setting-copy"><b>${data.meta.demo?'Start fresh':'Load demo data'}</b><span>${data.meta.demo?'Remove the made-up examples':'Replace current data with made-up examples'}</span></div><button class="option" data-act="toggle-demo">${data.meta.demo?'Clear demo':'Load demo'}</button></div>
    </div>

    <button class="primary-btn full" data-act="close-sheet">Done</button>
    <div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">v0.14.0</div>
  `);
};
