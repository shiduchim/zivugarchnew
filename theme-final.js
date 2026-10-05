'use strict';

// Final skin selector: only themes that make a clearly noticeable visual change.
const FINAL_SKINS=[
  ['classic','Classic','Warm Modern · calm default','◇'],
  ['game','Game','Playful · colorful · lively','★'],
  ['dark','Dark','Comfortable dark interface','●'],
  ['glass','Frosted Glass','Transparent Windows-style glass','◌'],
  ['contrast','High Contrast','Black, white and strong focus','◐'],
  ['neon','Neon','Electric purple and cyan','✦'],
  ['ocean','Ocean','Deep blue and turquoise','≈'],
  ['sunset','Sunset','Coral, orange and violet','☀']
];
const FINAL_SKIN_IDS=new Set(FINAL_SKINS.map(x=>x[0]));

skinCards=function(){return FINAL_SKINS.map(([v,l,d,m])=>skinChoice(v,l,d,m)).join('');};

const applySettingsBeforeFinalSkins=applySettings;
applySettings=function(){
  if(data?.settings && !FINAL_SKIN_IDS.has(data.settings.skin||'classic')) data.settings.skin='classic';
  applySettingsBeforeFinalSkins();
  const skin=data?.settings?.skin||'classic';
  document.documentElement.dataset.skin=skin;
  const colors={
    classic:'#f6f0e7',game:'#f5f3ff',dark:'#15191f',glass:'#7096c8',contrast:'#ffffff',
    neon:'#120d26',ocean:'#06364a',sunset:'#6d294f'
  };
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colors[skin]||colors.classic);
};

// Keep the existing settings screen, but it now renders only FINAL_SKINS via skinCards().
if(data){applySettings();render();}
