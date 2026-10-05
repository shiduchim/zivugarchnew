'use strict';

// v53 final UX polish: clearer single mode, distinct contact icons,
// current workflow wording, and compact sticky Shadchanim header.

// SMS icon chosen from the approved icon sheet: rectangular message bubble with two lines (option 2).
ICONS.sms='<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 9h8M8 13h6"/>';

function warmContactButtons(p){
  return `<div class="warm-contact-row">
    <button class="warm-contact phone" data-contact="call" data-person-id="${p.id}"><span>${icon('phone')}</span><small>Call</small></button>
    <button class="warm-contact email" data-contact="email" data-person-id="${p.id}"><span>${icon('mail')}</span><small>Email</small></button>
    <button class="warm-contact message" data-contact="wa" data-person-id="${p.id}"><span>${icon('whatsapp')}</span><small>WhatsApp</small></button>
    <button class="warm-contact sms" data-contact="sms" data-person-id="${p.id}"><span>${icon('sms')}</span><small>SMS</small></button>
    <button class="warm-contact wait zm-whats-next" data-contact="wait" data-person-id="${p.id}"><span>${icon('check')}</span><small>What's next?</small></button>
  </div>`;
}

// Keep the new workflow language everywhere, including Shadchanim filters.
const zmSegmentBeforeV53=segment;
segment=function(items,active,scope){
  const mapped=items.map(x=>({...x,label:
    (x.label==='My turn'||x.label==='Waiting on me')?'My to-do':
    (x.label==='Their turn'||x.label==='Waiting on them')?'To hear back':
    x.label==='Needs contact'?'Time to contact':x.label
  }));
  return zmSegmentBeforeV53(mapped,active,scope);
};

// Bottom navigation in Single mode:
// Guys becomes My profile and opens the user's profile directly.
function nav(){
  const single=data?.settings?.mode==='single';
  const items=[
    ['recent','recent','Recent','🏠'],
    ['guys','guy',single?'My profile':'Guys',single?'👤':'👦'],
    ['shadchanim','shad','Shadchanim','🤝'],
    ['girls','girl','Girls','👧'],
    ['shidduchim','heart','Shidduchim','💚']
  ];
  if((data?.settings?.skin||'classic')==='kids'){
    return `<nav class="warm-bottom-nav cartoon-nav">${items.map(([screen,ic,label,emoji])=>`<button class="warm-nav ${ui.screen===screen?'active':''}" data-screen="${screen}"><span class="warm-nav-icon cartoon-emoji">${emoji}</span><span>${label}</span></button>`).join('')}</nav>`;
  }
  return `<nav class="warm-bottom-nav">${items.map(([screen,ic,label])=>`<button class="warm-nav ${ui.screen===screen?'active':''}" data-screen="${screen}"><span class="warm-nav-icon">${icon(ic)}</span><span>${label}</span></button>`).join('')}</nav>`;
}

// Intercept My profile before the older general navigation handler.
document.addEventListener('click',function(e){
  const b=e.target.closest('button[data-screen="guys"]');
  if(!b||data?.settings?.mode!=='single')return;
  const self=me();
  if(!self)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  ui.screen='guys';
  ui.detail={type:'person',id:self.id};
  ui.detailTab='profile';
  ui.search='';
  render();
  window.scrollTo({top:0,behavior:'smooth'});
},true);

function zmGirlAppliesToMe(p){
  const self=me();
  if(!self)return false;
  const pairIdea=data.ideas.some(i=>i.status==='open'&&((i.guyId===self.id&&i.girlId===p.id)||(i.girlId===self.id&&i.guyId===p.id)));
  const activeMatch=data.shidduchim.some(s=>s.status==='active'&&((s.guyId===self.id&&s.girlId===p.id)||(s.girlId===self.id&&s.guyId===p.id)));
  return pairIdea||activeMatch;
}

// In Single mode, Girls is deliberately one focused list: only profiles applicable to me.
const zmPeopleScreenBeforeV53=peopleScreen;
peopleScreen=function(type){
  if(type!=='Girl'||data?.settings?.mode!=='single')return zmPeopleScreenBeforeV53(type);
  let arr=byType('Girl').filter(p=>!p.isMe&&zmGirlAppliesToMe(p));
  const q=ui.search.trim().toLowerCase();
  if(q)arr=arr.filter(p=>(`${p.name} ${p.city||''} ${p.occupation||''} ${p.phone||''}`).toLowerCase().includes(q));
  arr=arr.sort(byRecentContact);
  return `${header('Girls','Profiles applicable to you',{add:true})}${searchBox('Search girls…')}<div class="warm-stack">${arr.map(p=>personRow(p)).join('')||empty('No applicable profiles yet','Profiles connected to an open offer or current shidduch with you will appear here.','add-current')}</div>`;
};

// Compact profile identity for Guy, Girl and Shadchan profiles.
// Avoid duplicate city/type text: one concise line, then occupation only if present.
function zmProfileIdentity(p){
  const type=p.types?.includes('Shadchan')?'Shadchan':p.types?.includes('Girl')?'Girl':p.types?.includes('Guy')?'Guy':'Person';
  const meta=[type,p.age,p.city].filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
  return `<div class="zm-profile-sticky-sentinel" aria-hidden="true"></div>
    <div class="zm-profile-identity">
      <button class="warm-back zm-profile-back" data-act="back" aria-label="Back">${icon('back')}</button>
      <div class="warm-person-big ${avatarTone(p)} zm-profile-avatar">${esc(initials(p.name))}</div>
      <div class="zm-profile-copy">
        <h1>${esc(p.name)}</h1>
        <div class="zm-profile-meta">${esc(meta.join(' · '))}</div>
        ${p.occupation?`<div class="zm-profile-occupation">${esc(p.occupation)}</div>`:''}
      </div>
      <button class="warm-more zm-profile-more" data-act="detail-menu" aria-label="More">⋯</button>
    </div>`;
}

// Freeze the Shadchanim page title/actions while the long directory scrolls.
// It collapses after it reaches the top so it does not consume unnecessary space.
const zmShadchanScreenBeforeV53=shadchanScreen;
shadchanScreen=function(){
  let html=zmShadchanScreenBeforeV53();
  if(!html.includes('zm-shadchan-sticky-head')){
    html=html.replace(/(<header class="warm-header">[\s\S]*?<\/header>)/,
      '<div class="zm-shadchan-sticky-sentinel" aria-hidden="true"></div><div class="zm-shadchan-sticky-head">$1</div>');
  }
  return html;
};

// Extend the existing sticky sync so Shadchanim main header and all person profiles behave consistently.
const zmSyncProfileStickyBeforeV53=zmSyncProfileSticky;
zmSyncProfileSticky=function(){
  zmSyncProfileStickyBeforeV53();
  const head=document.querySelector('.zm-shadchan-sticky-head');
  const marker=document.querySelector('.zm-shadchan-sticky-sentinel');
  if(head&&marker)head.classList.toggle('is-stuck',marker.getBoundingClientRect().top<0);
};

if(data)render();
