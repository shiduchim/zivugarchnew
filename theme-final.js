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

// Cartoon changes only the visual treatment of navigation. The tabs and labels stay the same as every other theme.
const navBeforeFinalSkins=nav;
nav=function(){
  if((data?.settings?.skin||'classic')!=='kids') return navBeforeFinalSkins();
  const items=[
    ['recent','🏠','Recent'],
    ['guys','👦','Guys'],
    ['shadchanim','🤝','Shadchanim'],
    ['girls','👧','Girls'],
    ['shidduchim','💚','Shidduchim']
  ];
  return `<nav class="warm-bottom-nav cartoon-nav">${items.map(([screen,emoji,label])=>`<button class="warm-nav ${ui.screen===screen?'active':''}" data-screen="${screen}"><span class="warm-nav-icon cartoon-emoji">${emoji}</span><span>${label}</span></button>`).join('')}</nav>`;
};

function topOverviewHtml(){
  const c=counts();
  return `<div class="warm-summary-grid top-overview">${summaryCard('blue',c.me,'Waiting on me','show-wait-me')}${summaryCard('amber',c.them,'Waiting on them','show-wait-them')}${summaryCard('sage',c.active,'Active shidduchim','show-active')}</div>`;
}

// Every skin uses exactly the same Recent fields and layout.
// Themes may change colors, shapes and icons only; they do not change the content structure.
recentScreen=function(){
  const overview=topOverviewHtml();
  const c=counts();
  let entries=[...data.entries].sort((a,b)=>new Date(b.at)-new Date(a.at));
  if(ui.search){
    const q=ui.search.toLowerCase();
    entries=entries.filter(e=>(e.text+' '+linkedAbout(e)+' '+(e.personIds||[]).map(pid=>person(pid)?.name).join(' ')).toLowerCase().includes(q));
  }

  return `${header('Recent',c.me?`${c.me} thing${c.me===1?'':'s'} need you`:'You are caught up',{add:true})}${overview}${searchBox('Find anyone or anything…')}<div class="warm-section-title earlier-title"><h2>Earlier</h2><button data-act="add-activity">Add note</button></div>${activityFeed(entries)}`;
};

// Keep the existing settings screen, but it now renders only FINAL_SKINS via skinCards().
if(data){applySettings();render();}
