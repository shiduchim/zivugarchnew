'use strict';

// Links: lasting facts between two people ("Rachel is Leah's mother", "Chana is a reference for
// David"). Both sides stay normal, permanent Person records; a reference is a Person with the Reference
// role, so there is no separate contacts list and no extra tab. Parents and friends have no role of
// their own: they are reached through these links and through search.

const LINK_KINDS=[['reference','Reference'],['mother','Mother'],['father','Father'],['sibling','Sibling'],['friend','Friend'],['contact','Contact'],['shadchan','Shadchan']];
function linkWord(kind){return LINK_KINDS.find(([k])=>k===kind)?.[1]||'Linked';}
// What a linked person is called on the other person's page: "Mother", "Reference".
function linkRoleOf(kind){return kind==='shadchan'?['Shadchan']:kind==='reference'?['Reference']:[];}

// On a single's page: the people around them, each opening their own record.
function linksCard(p){
  const out=linksOf(p.id),inn=linkedTo(p.id);
  const single=p.types?.includes('Guy')||p.types?.includes('Girl');
  if(!single&&!out.length&&!inn.length)return '';
  const row=(other,label,l)=>other?`<div class="link-person"><button class="link-open" data-person="${esc(other.id)}"><b>${esc(other.name)}</b><span>${esc(label)}${other.phone?` · ${esc(other.phone)}`:''}</span></button><button class="option quiet" data-act="remove-link" data-link-id="${esc(l.id)}">Remove</button></div>`:'';
  const rows=[...out.map(l=>row(person(l.aId),linkWord(l.kind),l)),...inn.map(l=>row(person(l.bId),`${linkWord(l.kind)} of ${clarityFirstName(person(l.bId))}`,l))].join('');
  return `<div class="warm-info-card links-card"><div class="links-head"><span>References and family</span>${single?`<button data-act="add-link" data-person-id="${esc(p.id)}">Add</button>`:''}</div>${rows||'<p class="links-empty">Nobody added yet.</p>'}</div>`;
}

let addLinkFlow=null;
function addLinkSheet(pid){
  const p=person(pid);if(!p)return;
  addLinkFlow={personId:p.id};
  openSheet(`<h2>Add for ${esc(clarityFirstName(p))}</h2><p class="lead">A reference, a parent or someone to contact about ${esc(clarityFirstName(p))}. If they are already here, the app uses the same record.</p><div class="form-grid"><div class="field"><label>Who are they?</label><select id="kKind">${LINK_KINDS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><div class="field"><label>Name</label><input id="kName"></div><div class="field"><label>Phone</label><input id="kPhone" type="tel"></div><div class="field"><label>City <span style="font-weight:400">(optional)</span></label><input id="kCity"></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-link">Save</button></div>`);
}
function saveLink(){
  const f=addLinkFlow;if(!f)return;
  const name=document.getElementById('kName')?.value.trim();if(!name){showToast('Enter a name');return;}
  const kind=document.getElementById('kKind')?.value||'reference',phone=document.getElementById('kPhone')?.value.trim()||'',city=document.getElementById('kCity')?.value.trim()||'';
  addLinkFlow=null;
  matchThenUse({name,phone,city,types:linkRoleOf(kind),referrerId:f.personId},async(pid)=>{
    const p=person(f.personId),other=person(pid);
    if(samePerson(pid,p.id)){closeSheet();showToast('That is the same person');return;}
    if(!linksOf(p.id).some(l=>samePerson(l.aId,pid)&&l.kind===kind)){
      const e=addEntry({type:'status',personIds:[p.id,pid],about:[{type:'person',id:p.id},{type:'person',id:pid}],text:`${other.name}: ${linkWord(kind).toLowerCase()} for ${p.name}.`});
      const l={id:id('link'),aId:pid,bId:p.id,kind,createdAt:e.at,entryId:e.id};
      data.links.push(l);e.changes.push({kind:'link-added',linkId:l.id});
    }
    await save();closeSheet();ui.detail={type:'person',id:p.id};render();showToast('Saved');
  });
}
// Removing a link is a direct edit; Undo puts it back.
async function removeLink(lid){const l=data.links.find(x=>x.id===lid);if(!l||l.removedAt)return;l.removedAt=iso();await save();render();showActionToast('Removed',{act:'restore-link',linkId:l.id});}
async function restoreLink(lid){const l=data.links.find(x=>x.id===lid);if(!l?.removedAt)return;delete l.removedAt;await save();render();showToast('Back again');}

// On a shidduch's People tab: each side's references and family, from their links.
function shidduchReferencesHtml(s){
  const side=pid=>linksOf(pid).map(l=>({l,p:person(l.aId)})).filter(x=>x.p);
  const rows=[...side(s.guyId).map(x=>({...x,of:person(s.guyId)})),...side(s.girlId).map(x=>({...x,of:person(s.girlId)}))];
  if(!rows.length)return '';
  return `<div class="zm-role-section"><div class="zm-clean-heading">References and family</div><div class="warm-stack">${rows.map(x=>zmRoleRow(x.p,`${linkWord(x.l.kind)} · ${clarityFirstName(x.of)}`)).join('')}</div></div>`;
}
