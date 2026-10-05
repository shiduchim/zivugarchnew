'use strict';

// Direct profile links from a shidduch detail.
// The pair avatars and the person-specific answer/feedback labels open that person's profile.
// Back returns to the same shidduch tab instead of dropping the user at the main list.
const shidduchDetailBeforeProfileLinks=shidduchDetail;
shidduchDetail=function(sid){
  let html=shidduchDetailBeforeProfileLinks(sid);
  const s=shidduch(sid);if(!s)return html;
  const g=person(s.guyId),gl=person(s.girlId);

  if(g&&gl){
    const oldPair=`<div class="pair-people"><div class="person-avatar">${esc(initials(g.name))}</div><div class="person-avatar">${esc(initials(gl.name))}</div></div>`;
    const newPair=`<div class="pair-people"><button type="button" class="person-avatar zm-profile-link guy" data-zm-person="${esc(g.id)}" aria-label="Open ${esc(g.name)} profile" title="Open ${esc(g.name)} profile">${esc(initials(g.name))}</button><button type="button" class="person-avatar zm-profile-link girl" data-zm-person="${esc(gl.id)}" aria-label="Open ${esc(gl.name)} profile" title="Open ${esc(gl.name)} profile">${esc(initials(gl.name))}</button></div>`;
    html=html.replace(oldPair,newPair);
  }

  const linkLabel=(label,p)=>{
    if(!p)return;
    const from=`<span>${esc(label)}</span><strong>`;
    const to=`<button type="button" class="zm-person-text-link" data-zm-person="${esc(p.id)}" aria-label="Open ${esc(p.name)} profile">${esc(label)}</button><strong>`;
    html=html.split(from).join(to);
  };

  if(g){
    linkLabel(g.isMe?'My answer':`${g.name}'s answer`,g);
    linkLabel(g.isMe?'My feedback':`${g.name}'s feedback`,g);
  }
  if(gl){
    linkLabel(`${gl.name}'s answer`,gl);
    linkLabel(`${gl.name}'s feedback`,gl);
  }
  return html;
};

let zmReturnToShidduch=null;
document.addEventListener('click',function(e){
  const profileLink=e.target.closest('[data-zm-person]');
  if(profileLink){
    e.preventDefault();
    e.stopPropagation();
    const pid=profileLink.dataset.zmPerson;
    if(!person(pid))return;
    if(ui.detail?.type==='shidduch'){
      zmReturnToShidduch={detail:{...ui.detail},detailTab:ui.detailTab};
    }
    const p=person(pid);
    ui.detail={type:'person',id:pid};
    ui.detailTab=p?.types?.includes('Shadchan')?'details':'profile';
    render();
    window.scrollTo(0,0);
    return;
  }

  const back=e.target.closest('button[data-act="back"]');
  if(back&&ui.detail?.type==='person'&&zmReturnToShidduch){
    e.preventDefault();
    e.stopPropagation();
    ui.detail=zmReturnToShidduch.detail;
    ui.detailTab=zmReturnToShidduch.detailTab;
    zmReturnToShidduch=null;
    render();
    window.scrollTo(0,0);
  }
},true);

if(data)render();
