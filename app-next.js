'use strict';

// UX refinement layer: clearer next steps, simpler Recent, universal Add, and many skins.
// Data architecture is unchanged.

const ZM_SKINS=[
  ['classic','Classic','Warm Modern · calm default','◇'],
  ['game','Game','Playful · colorful · lively','★'],
  ['easy','Big & Easy','Kids-simple · large · obvious','☀'],
  ['dark','Dark','Comfortable low-light UI','●'],
  ['contrast','High Contrast','Strongest separation','◐'],
  ['boys','Boys','Cool blue and teal','◆'],
  ['girls','Girls','Rose and lilac','♥'],
  ['jerusalem','Jerusalem Stone','Limestone · honey · olive','▱'],
  ['macaron','Macaron','Soft color by section','●'],
  ['notebook','Paper Notebook','Paper · ink · highlighter','▤'],
  ['luxury','Quiet Luxury','Ivory · charcoal · champagne','◇'],
  ['clean','Clean','Simple Apple-like minimal','○'],
  ['glass','Frosted Glass','Airy translucent layers','◌'],
  ['whitecity','White City','Bauhaus · crisp · geometric','□'],
  ['startup','Startup Nation','Fast · tech · keyboard-friendly','⌁'],
  ['mono','Monochrome','Focused greyscale','◧'],
  ['retro','Retro Desktop','Old Windows-style fun','▣'],
  ['hearth','Hearth','Cozy lamp-light warmth','⌂'],
  ['ledger','Ledger','Professional · compact · dependable','▥'],
  ['sticker','Sticker Pop','Bold · youthful · outlined','✦'],
  ['shabbos','Shabbos Table','Burgundy · cream · brass','✧'],
  ['kinneret','Kinneret','Lake blue · sand · reed','≈'],
  ['midnight','Midnight Library','Warm dark · parchment · amber','☾'],
  ['daynight','Day & Night','Color shifts gently by time','◒']
];

function skinCards(){return ZM_SKINS.map(([v,l,d,m])=>skinChoice(v,l,d,m)).join('');}

const previousApplySettingsNext=applySettings;
applySettings=function(){
  previousApplySettingsNext();
  const skin=data?.settings?.skin||'classic';
  document.documentElement.dataset.skin=skin;
  const colors={classic:'#f6f0e7',game:'#f5f3ff',easy:'#fffaf0',dark:'#15191f',contrast:'#ffffff',boys:'#eef7fb',girls:'#fbf2f6',jerusalem:'#f3eadc',macaron:'#fbf7fb',notebook:'#fbf7ec',luxury:'#faf7f2',clean:'#f2f2f7',glass:'#f4f6fb',whitecity:'#f6f6f4',startup:'#f6f7f9',mono:'#f2f2f2',retro:'#008080',hearth:'#f1e6d8',ledger:'#faf6ea',sticker:'#fffaf0',shabbos:'#f7f0e4',kinneret:'#f3ead8',midnight:'#14201c',daynight:'#f7f3ea'};
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colors[skin]||'#f6f0e7');
};

settingsSheet=function(){
  const s=data.settings,layout=s.layout||'auto';
  openSheet(`
    <h2>Settings</h2>
    <p class="lead">Make ZivugMatch feel comfortable to you. These choices change how it looks, never your people or history.</p>

    <div class="settings-heading">View</div>
    <div class="sheet-section">
      <div class="setting-copy" style="padding:2px 0 8px"><b>Screen layout</b><span>Responsive, phone-size or desktop.</span></div>
      <div class="layout-choice-row">
        <button class="layout-choice ${layout==='auto'?'active':''}" data-setting="layout" data-value="auto">Auto<small>Best for this screen</small></button>
        <button class="layout-choice ${layout==='phone'?'active':''}" data-setting="layout" data-value="phone">Phone<small>Phone-size layout</small></button>
        <button class="layout-choice ${layout==='web'?'active':''}" data-setting="layout" data-value="web">Web<small>Desktop layout</small></button>
      </div>
    </div>

    <div class="settings-heading">Skin</div>
    <p class="skin-help">Same app, different personality. Navigation stays in the same place in every skin.</p>
    <div class="skin-picker skin-picker-many">${skinCards()}</div>

    <div class="settings-heading">Spacing</div>
    <div class="sheet-section">
      <div class="setting-row"><div class="setting-copy"><b>Layout feel</b><span>Choose how roomy the screens feel</span></div><div class="option-group">${[['1','Standard'],['2','Roomy'],['3','Compact']].map(([v,l])=>`<button class="option ${String(s.appearance||'1')===v?'active':''}" data-setting="appearance" data-value="${v}">${l}</button>`).join('')}</div></div>
      <div class="setting-row"><div class="setting-copy"><b>Size</b><span>Comfortable is easiest to read</span></div><div class="option-group">${['comfortable','compact'].map(v=>`<button class="option ${s.density===v?'active':''}" data-setting="density" data-value="${v}">${v==='comfortable'?'Comfortable':'Compact'}</button>`).join('')}</div></div>
      <div class="setting-row"><div class="setting-copy"><b>Icons and initials</b><span>Touch target size</span></div><div class="option-group">${['small','medium','large'].map(v=>`<button class="option ${s.iconSize===v?'active':''}" data-setting="iconSize" data-value="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
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
      <div class="setting-row"><div class="setting-copy"><b>${data.meta.demo?'Start fresh':'Load demo data'}</b><span>${data.meta.demo?'Remove the made-up examples':'Replace current data with made-up examples'}</span></div><button class="option" data-act="toggle-demo">${data.meta.demo?'Clear demo':'Load demo'}</button></div>${safetyCopies.length?`<div class="setting-row"><div class="setting-copy"><b>Earlier data</b><span>Kept before ${esc(safetyCopies[0].reason)} · ${esc(fmtDate(safetyCopies[0].at))} ${esc(fmtTime(safetyCopies[0].at))}</span></div><button class="option" data-act="undo-safety" data-copy-id="${esc(safetyCopies[0].id)}">Restore</button></div>`:''}
    </div>
    <button class="primary-btn full" data-act="close-sheet">Done</button>
    <div style="text-align:center;color:var(--text-3);font-size:9px;margin-top:12px">v0.17.0</div>
  `);
};

function statusSentenceForPerson(p){
  const mine=openForPerson(p.id,'me'),them=openForPerson(p.id,'them');
  if(mine.length)return `${mine[0].label} · Needs you`;
  if(them.length)return `${them[0].label} · Waiting on ${p.name.split(' ')[0]}`;
  const active=shidduchimForPerson(p.id).find(s=>s.status==='active');
  if(active){const r=getCurrentRound(active);return r?.stage||'Active shidduch';}
  if(needsContactPerson(p))return 'Ready for a quick hello';
  const lc=lastContact(p.id);return lc?`Last contact ${fmtDay(lc).toLowerCase()}`:'No contact yet';
}

personRow=function(p,{selected=false,context=''}={}){
  const lc=lastContact(p.id),line=context||ageText(p)||p.city||p.types?.join(', ')||'';
  return `<button class="warm-person-row ${selected?'selected':''}" data-person="${p.id}"><div class="warm-avatar ${avatarTone(p)}">${esc(initials(p.name))}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(p.name)}</strong><time>${esc(fmtDay(lc))}</time></div><div class="warm-person-line">${esc(line)}</div><div class="warm-person-status human-status">${esc(statusSentenceForPerson(p))}</div></div><div class="warm-chevron">›</div></button>`;
};

function nextTargetAttrs(x){
  if(x.aboutType==='shidduch'&&shidduch(x.aboutId))return `data-shidduch="${x.aboutId}"`;
  return `data-person="${x.personId}"`;
}
function nextCard(x){
  const p=person(x.personId),age=Math.max(0,Math.floor((Date.now()-new Date(x.createdAt).getTime())/86400000));
  return `<button class="next-card" ${nextTargetAttrs(x)}><div class="next-avatar ${avatarTone(p||{name:'?'})}">${esc(initials(p?.name||'?'))}</div><div class="next-copy"><strong>${esc(p?.name||'Someone')}</strong><span>${esc(x.label||'Follow up')}</span><small>${age===0?'Today':`${age} day${age===1?'':'s'} waiting`}</small></div><div class="next-action">Open</div></button>`;
}

function activityFeed(entries){
  const groups={};for(const e of entries){const k=dayKey(e.at);(groups[k]??=[]).push(e);}
  return Object.entries(groups).map(([day,arr])=>`<section class="warm-day"><div class="warm-day-label">${esc(day)}</div><div class="warm-feed">${arr.map(activityRow).join('')}</div></section>`).join('')||empty('Nothing here yet','Calls, messages, notes and profiles will appear here automatically.','add-activity');
}

function improvedRecent(){
  const mine=data.openItems.filter(x=>x.status==='open'&&x.direction==='me').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const them=data.openItems.filter(x=>x.status==='open'&&x.direction==='them').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  let entries=[...data.entries].sort((a,b)=>new Date(b.at)-new Date(a.at));
  if(ui.search){const q=ui.search.toLowerCase();entries=entries.filter(e=>(e.text+' '+linkedAbout(e)+' '+(e.personIds||[]).map(pid=>person(pid)?.name).join(' ')).toLowerCase().includes(q));}
  const top=mine.slice(0,3),more=Math.max(0,mine.length-top.length);
  const needs=top.length?`<div class="next-list">${top.map(nextCard).join('')}</div>${more?`<button class="see-all-next" data-act="show-wait-me">See all ${mine.length}</button>`:''}`:`<div class="all-clear">${icon('check')}<div><strong>Nothing needs you right now</strong><span>You are caught up.</span></div></div>`;
  const waiting=them.length?`<button class="waiting-summary" data-act="show-wait-them"><span class="waiting-icon">${icon('hourglass')}</span><span><strong>${them.length} waiting on others</strong><small>Oldest has been waiting ${Math.max(0,Math.floor((Date.now()-new Date(them[0].createdAt).getTime())/86400000))} days</small></span><b>View</b></button>`:`<div class="waiting-summary quiet"><span class="waiting-icon">${icon('check')}</span><span><strong>Nothing waiting on others</strong><small>No open replies right now</small></span></div>`;
  return `${header('Recent',mine.length?`${mine.length} thing${mine.length===1?'':'s'} need you`:'You are caught up',{add:true})}${searchBox('Find anyone or anything…')}<div class="focus-title"><h2>Needs you</h2><span>${mine.length}</span></div>${needs}<div class="focus-title"><h2>Waiting on others</h2><span>${them.length}</span></div>${waiting}<div class="warm-section-title earlier-title"><h2>Earlier</h2><button data-act="add-activity">Add note</button></div>${activityFeed(entries)}`;
}

function easyRecent(){
  const mine=data.openItems.filter(x=>x.status==='open'&&x.direction==='me').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const reply=mine.filter(x=>/reply|feedback|answer/i.test(x.label||'')).length;
  const profile=mine.filter(x=>/profile/i.test(x.label||'')).length;
  const call=Math.max(0,mine.length-reply-profile);
  const tasks=mine.slice(0,4);
  return `${header('Today','Your simple shidduch mission',{add:true})}<div class="kid-mission"><div><strong>Today’s mission</strong><span>${mine.length?'Finish the important things first':'You are all caught up'}</span></div><b>${mine.length} to do</b><i><em style="width:${mine.length?Math.max(18,100-(mine.length*16)):100}%"></em></i></div><div class="kid-action-grid"><button data-act="show-wait-me"><span>💬</span><strong>Reply</strong><small>${reply||'None waiting'}</small></button><button data-screen="shadchanim"><span>☎️</span><strong>Call</strong><small>${call?`${call} to do`:'Quick contact'}</small></button><button data-screen="recent"><span>📄</span><strong>Profile</strong><small>${profile?`${profile} to do`:'Profiles'}</small></button></div><div class="focus-title kid-next-title"><h2>Next steps</h2><span>${mine.length}</span></div>${tasks.length?`<div class="next-list kid-next">${tasks.map(nextCard).join('')}</div>`:`<div class="all-clear">${icon('check')}<div><strong>Nothing needs you today</strong><span>Enjoy the clear list.</span></div></div>`}`;
}

recentScreen=function(){return (data.settings.skin==='easy')?easyRecent():improvedRecent();};

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

function universalAddSheet(){
  openSheet(`<h2>Add</h2><p class="lead">What happened? Choose one simple starting point.</p><div class="quick-add-grid"><button id="qaIdea"><span>♡</span><b>Idea</b><small>Someone suggested a match</small></button><button id="qaGuy"><span>G</span><b>Guy</b><small>Add a person</small></button><button id="qaShad"><span>S</span><b>Shadchan</b><small>Add to your network</small></button><button id="qaGirl"><span>G</span><b>Girl</b><small>Add a person</small></button><button id="qaNote"><span>✎</span><b>Note or call</b><small>Log what just happened</small></button></div><button class="ghost-btn full" data-act="close-sheet">Cancel</button>`);
  const go=(sel,fn)=>document.querySelector(sel)?.addEventListener('click',()=>{closeSheet();fn();});
  go('#qaIdea',()=>addIdeaSheet());go('#qaGuy',()=>addPersonSheet('Guy'));go('#qaShad',()=>addPersonSheet('Shadchan'));go('#qaGirl',()=>addPersonSheet('Girl'));go('#qaNote',()=>addActivitySheet());
}
currentAdd=function(){universalAddSheet();};

// Repaint once this late-loaded UX layer has replaced the earlier rendering functions.
if(data){applySettings();render();}
