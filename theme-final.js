'use strict';

// Keep only skins that make an unmistakable visual change.
const FINAL_SKINS=[
  ['classic','Classic','Warm Modern · calm default','◇'],
  ['game','Game','Playful · colorful · lively','★'],
  ['dark','Dark','Comfortable dark interface','●'],
  ['glass','Frosted Glass','Real transparent blurred glass','◌'],
  ['boys','Boys','Bold navy · cyan · teal','◆'],
  ['girls','Girls','Bold plum · rose · lilac','♥'],
  ['kids','Cartoon','Big colorful cards · cartoon icons','☀'],
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
    classic:'#f6f0e7',game:'#f5f3ff',dark:'#15191f',glass:'#6c8fc7',boys:'#082f49',girls:'#65244f',kids:'#fff4b8',
    contrast:'#ffffff',neon:'#120d26',ocean:'#06364a',sunset:'#6d294f'
  };
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colors[skin]||colors.classic);
};

// Cartoon mode keeps the same navigation order, but uses obvious cartoon-style symbols.
const navBeforeFinalSkins=nav;
nav=function(){
  if((data?.settings?.skin||'classic')!=='kids') return navBeforeFinalSkins();
  const items=[
    ['recent','🏠','Today'],
    ['guys','👦','Guys'],
    ['shadchanim','🤝','Shadchanim'],
    ['girls','👧','Girls'],
    ['shidduchim','💚','Shidduchim']
  ];
  return `<nav class="warm-bottom-nav cartoon-nav">${items.map(([screen,emoji,label])=>`<button class="warm-nav ${ui.screen===screen?'active':''}" data-screen="${screen}"><span class="warm-nav-icon cartoon-emoji">${emoji}</span><span>${label}</span></button>`).join('')}</nav>`;
};

// Cartoon gets the extra-simple Today screen; all other skins use the improved Recent screen.
recentScreen=function(){return (data.settings.skin==='kids')?easyRecent():improvedRecent();};

// Keep the existing settings screen, but it now renders only FINAL_SKINS via skinCards().
if(data){applySettings();render();}
