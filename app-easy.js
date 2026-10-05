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

