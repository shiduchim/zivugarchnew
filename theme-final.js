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
['contrast','High Contrast','Crisp accessible · system light or dark','◐'],
['neon','Neon','Bright electric · cyan · violet · magenta','✦'],
['ocean','Ocean','Deep blue and turquoise','≈'],
['sunset','Sunset','Coral, orange and violet','☀']
];
const FINAL_SKIN_IDS=new Set(FINAL_SKINS.map(x=>x[0]));
function skinCards(){return FINAL_SKINS.map(([v,l,d,m])=>skinChoice(v,l,d,m)).join('');}

// Settings are applied in one place, as attributes on <html> that the CSS reads.
// data-skin is the single appearance system. Legacy theme values may remain in saved
// data for backwards compatibility, but they never style the app (no data-theme).
// A retired skin saved by an older version falls back to Classic.
const SKIN_BAR_COLORS={
classic:'#f6f0e7',game:'#f5f3ff',dark:'#15191f',glass:'#6c8fc7',boys:'#082f49',girls:'#65244f',kids:'#fff4b8',
contrast:'#0B1735',neon:'#f4f7ff',ocean:'#06364a',sunset:'#6d294f'
};
function applySettings(){
if(data?.settings && !FINAL_SKIN_IDS.has(data.settings.skin||'classic')) data.settings.skin='classic';
const s=data?.settings||defaultSettings(),root=document.documentElement,skin=s.skin||'classic';
root.removeAttribute('data-theme');
root.dataset.density=s.density||'comfortable';
root.dataset.iconSize=s.iconSize||'medium';
root.dataset.appearance=s.appearance||'1';
root.dataset.layout=s.layout||'auto';
root.dataset.skin=skin;
document.querySelector('meta[name="theme-color"]')?.setAttribute('content',SKIN_BAR_COLORS[skin]||SKIN_BAR_COLORS.classic);
}
