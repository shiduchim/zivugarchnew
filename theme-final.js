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
skinCards=function(){return FINAL_SKINS.map(([v,l,d,m])=>skinChoice(v,l,d,m)).join('');};

// data-skin is the single appearance system. Legacy theme values may remain in saved
// data for backwards compatibility, but they are deliberately prevented from styling the app.
const applySettingsBeforeFinalSkins=applySettings;
applySettings=function(){
if(data?.settings && !FINAL_SKIN_IDS.has(data.settings.skin||'classic')) data.settings.skin='classic';
applySettingsBeforeFinalSkins();
document.documentElement.removeAttribute('data-theme');
const skin=data?.settings?.skin||'classic';
document.documentElement.dataset.skin=skin;
const colors={
classic:'#f6f0e7',game:'#f5f3ff',dark:'#15191f',glass:'#6c8fc7',boys:'#082f49',girls:'#65244f',kids:'#fff4b8',
contrast:'#0B1735',neon:'#f4f7ff',ocean:'#06364a',sunset:'#6d294f'
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

// Plain-language status labels: short enough for a child to understand at a glance.
ICONS.bell='<path d="M18 8a6 6 0 0 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9"/><path d="M10 21h4"/>';
function finalOverviewCard(cls,val,label,act,ic){
return `<button class="warm-summary ${cls}" data-act="${act}"><span class="warm-summary-icon">${icon(ic)}</span><span class="warm-summary-copy"><small>${esc(label)}</small><strong>${esc(val)}</strong></span></button>`;
}
function topOverviewHtml(){
const c=counts();
return `<div class="warm-summary-grid top-overview">${finalOverviewCard('blue',c.me,'My turn','show-wait-me','bell')}${finalOverviewCard('amber',c.them,'Their turn','show-wait-them','hourglass')}${finalOverviewCard('sage',c.active,'Current shidduchim','show-active','heart')}</div>`;
}

// Use the same simple turn language in filters wherever the old waiting labels appear.
const segmentBeforePlainWords=segment;
segment=function(items,active,scope){
const mapped=items.map(x=>({...x,label:x.label==='Waiting on me'?'My turn':x.label==='Waiting on them'?'Their turn':x.label}));
return segmentBeforePlainWords(mapped,active,scope);
};

// "Active now" sounded like online presence. This section means shadchanim you are currently working with.
const shadchanScreenBeforePlainWords=shadchanScreen;
shadchanScreen=function(){
return shadchanScreenBeforePlainWords().replace('<h2>Active now</h2>','<h2>Working with</h2>');
};

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
return `${header('Recent',c.me?`${c.me} thing${c.me===1?'':'s'} need you`:'You are caught up',{add:true})}${overview}${searchBox('Find anyone or anything…')}<div class="warm-section-title earlier-title"><h2>History</h2><button data-act="add-activity">Add note</button></div>${activityFeed(entries)}`;
};

// Neon section identity. The DOM marker wins; otherwise resolve the actual detail record,
// then fall back to the active navigation tab. Other skins never keep data-section on <html>.
(function neonSectionHook(){
const root=document.documentElement,app=document.getElementById('app');
const SECTIONS=new Set(['recent','guys','shadchanim','girls','shidduchim']);
let queued=false;
function detailSection(){
if(ui?.detail?.type==='shidduch') return 'shidduchim';
if(ui?.detail?.type==='person'){
const p=person(ui.detail.id);
if(p?.types?.includes('Shadchan')) return 'shadchanim';
if(p?.types?.includes('Girl')) return 'girls';
if(p?.types?.includes('Guy')) return 'guys';
}
return '';
}
function currentSection(){
const marked=app?.querySelector('[data-section]');
if(marked&&SECTIONS.has(marked.dataset.section)) return marked.dataset.section;
const detail=detailSection();
if(SECTIONS.has(detail)) return detail;
const tab=app?.querySelector('.warm-nav.active')?.dataset.screen;
return SECTIONS.has(tab)?tab:'recent';
}
function sync(){
queued=false;
const warmDetail=app?.querySelector('.warm-detail-page');
const legacyDetail=app?.querySelector('.detail-shell');
if(root.dataset.skin!=='neon'){
root.removeAttribute('data-section');
if(warmDetail) warmDetail.removeAttribute('data-section');
if(legacyDetail) legacyDetail.removeAttribute('data-section');
return;
}
const s=currentSection();
if(root.dataset.section!==s) root.dataset.section=s;
if(warmDetail&&SECTIONS.has(s)&&warmDetail.dataset.section!==s) warmDetail.dataset.section=s;
if(legacyDetail&&ui?.detail?.type==='shidduch'&&legacyDetail.dataset.section!=='shidduchim') legacyDetail.dataset.section='shidduchim';
}
function queue(){if(!queued){queued=true;requestAnimationFrame(sync);}}
if(app) new MutationObserver(queue).observe(app,{childList:true,subtree:true});
queue();
})();

// Retire the old warm/blue/sage/dark Theme picker. Skin is now the only appearance choice.
const settingsSheetBeforeSkinOnly=settingsSheet;
settingsSheet=function(){
settingsSheetBeforeSkinOnly();
const legacyThemeControl=overlay.querySelector('[data-setting="theme"]');
legacyThemeControl?.closest('.setting-row')?.remove();
};

if(data){applySettings();render();}
