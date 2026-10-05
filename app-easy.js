'use strict';

// Simple-view + personalization layer. No data model changes.

const baseDefaultSettingsEasy = defaultSettings;
defaultSettings = function(){
  return {...baseDefaultSettingsEasy(), layout:'auto', skin:'classic'};
};

const baseApplySettingsEasy = applySettings;
applySettings = function(){
  baseApplySettingsEasy();
  const s=data?.settings||defaultSettings();
  const skin=s.skin||'classic';
  document.documentElement.dataset.layout=s.layout||'auto';
  document.documentElement.dataset.skin=skin;
  // Skin owns the color family so an old saved theme cannot fight with it.
  document.documentElement.dataset.theme=skin==='dark'?'dark':'warm';
  const themeColor=skin==='dark'?'#15191f':skin==='contrast'?'#ffffff':skin==='boys'?'#eef7fb':skin==='girls'?'#fbf2f6':skin==='game'?'#f5f3ff':'#f6f0e7';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themeColor);
};

function skinChoice(value,label,desc,mark){
  const active=(data.settings.skin||'classic')===value?'active':'';
  return `<button class="skin-choice ${active}" data-setting="skin" data-value="${value}"><span class="skin-swatch ${value}">${mark}</span><span><b>${label}</b><small>${desc}</small></span></button>`;
}

settingsSheet = function(){
  const s=data.settings;
  const layout=s.layout||'auto';
  openSheet(`
    <h2>Settings</h2>
    <p class="lead">Make ZivugMatch feel comfortable to you. These choices change only how the app looks — never your people, history or shidduchim.</p>

    <div class="settings-heading">View</div>
    <div class="sheet-section">
      <div class="setting-copy" style="padding:2px 0 8px"><b>Screen layout</b><span>Switch between responsive, phone-size and desktop.</span></div>
      <div class="layout-choice-row">
        <button class="layout-choice ${layout==='auto'?'active':''}" data-setting="layout" data-value="auto">Auto<small>Best for this screen</small></button>
        <button class="layout-choice ${layout==='phone'?'active':''}" data-setting="layout" data-value="phone">Phone<small>Phone-size layout</small></button>
        <button class="layout-choice ${layout==='web'?'active':''}" data-setting="layout" data-value="web">Web<small>Desktop layout</small></button>
      </div>
    </div>

    <div class="settings-heading">Skin</div>
    <div class="skin-picker">
      ${skinChoice('classic','Classic','The Warm Modern design','◇')}
      ${skinChoice('game','Game','Playful, colorful and lively','★')}
      ${skinChoice('dark','Dark','Comfortable for low light','●')}
      ${skinChoice('contrast','High Contrast','Strong edges and easiest separation','◐')}
      ${skinChoice('boys','Boys','Cool blue and teal','◆')}
      ${skinChoice('girls','Girls','Rose and lilac','♥')}
    </div>

    <div class="settings-heading">Appearance</div>
    <div class="appearance-picker">
      <button class="appearance-choice ${String(s.appearance||'1')==='1'?'active':''}" data-setting="appearance" data-value="1"><span class="appearance-preview ap1"><i></i><i></i><i></i></span><b>Appearance 1</b><small>Warm Modern · the main layout</small></button>
      <button class="appearance-choice ${String(s.appearance)==='2'?'active':''}" data-setting="appearance" data-value="2"><span class="appearance-preview ap2"><i></i><i></i><i></i></span><b>Appearance 2</b><small>Airy Modern · brighter and more spacious</small></button>
      <button class="appearance-choice ${String(s.appearance)==='3'?'active':''}" data-setting="appearance" data-value="3"><span class="appearance-preview ap3"><i></i><i></i><i></i></span><b>Appearance 3</b><small>Quiet Modern · flatter and more compact</small></button>
    </div>

    <div class="sheet-section">
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
    <div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">v0.15.0</div>
  `);
};
