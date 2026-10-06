// Every state is reached from a fresh app load by tapping visible controls only
// (data-* attributes in the rendered markup), so the same paths work after internal cleanup.
const nav = s => ['tap', `button[data-screen="${s}"]`];
const seg = (scope, v) => ['tap', `button[data-seg-scope="${scope}"][data-seg="${v}"]`];
const tab = t => ['tap', `button[data-detail-tab="${t}"]`];
const tap = s => ['tap', s];
const close = ['close'];

function personPath(pid, mode) {
  if (pid === 'p_miriam' || pid === 'p_dina') return [nav('shadchanim'), seg('shadchanim', 'all'), tap(`[data-person="${pid}"]`)];
  if (pid === 'p_leah') return [nav('girls'), tap(`[data-person="p_leah"]`)];
  if (pid === 'p_david') return mode === 'shadchan'
    ? [nav('guys'), tap('[data-person="p_david"]')]
    : [nav('shidduchim'), seg('shidduchim', 'active'), tap('[data-shidduch="sh_david_noa"]'), tab('people'), tap('[data-person="p_david"]')];
  if (pid === 'p_me') return mode === 'single'
    ? [nav('guys')]
    : [nav('shidduchim'), seg('shidduchim', 'active'), tap('[data-shidduch="sh_me_leah"]'), tab('people'), tap('[data-person="p_me"]')];
  throw new Error(pid);
}
const shidduchPath = (sid, ended) => [nav('shidduchim'), seg('shidduchim', ended ? 'ended' : 'active'), tap(`[data-shidduch="${sid}"]`)];

function states(mode) {
  const S = [];
  const add = (id, steps) => S.push({ id, steps });
  // Tabs and sub-tabs
  add('tab-recent', []);
  if (mode === 'single') {
    add('tab-guys-myprofile', [nav('guys')]);
    add('tab-guys-list-after-back', [nav('guys'), tap('[data-act="back"]')]);
    add('tab-girls-single', [nav('girls')]);
  } else {
    add('tab-guys', [nav('guys')]);
    add('tab-guys-all', [nav('guys'), seg('guys', 'all')]);
    add('tab-guys-recent', [nav('guys'), seg('guys', 'recent')]);
    add('tab-girls', [nav('girls')]);
    add('tab-girls-all', [nav('girls'), seg('girls', 'all')]);
    add('tab-girls-recent', [nav('girls'), seg('girls', 'recent')]);
  }
  for (const v of ['all', 'them', 'me', 'needs', 'sources']) add(`tab-shadchanim-${v}`, [nav('shadchanim'), seg('shadchanim', v)]);
  add('tab-shidduchim', [nav('shidduchim')]);
  for (const [v, n] of [['ideas', 'offers'], ['active', 'inprogress'], ['ended', 'ended']]) add(`tab-shidduchim-${n}`, [nav('shidduchim'), seg('shidduchim', v)]);
  // Person and shadchan profiles, every tab
  for (const t of ['details', 'conversation', 'shidduchim', 'files']) add(`shadchan-miriam-${t}`, [...personPath('p_miriam', mode), tab(t)]);
  add('shadchan-dina-details', [...personPath('p_dina', mode), tab('details')]);
  for (const pid of ['p_leah', 'p_david']) for (const t of ['profile', 'conversation', 'shidduchim', 'files']) add(`person-${pid.slice(2)}-${t}`, [...personPath(pid, mode), tab(t)]);
  add('person-me-profile', [...personPath('p_me', mode), tab('profile')]);
  // Shidduch pages, every tab
  for (const [sid, ended] of [['sh_me_leah', false], ['sh_david_noa', false], ['sh_ari_rina', true]])
    for (const t of ['overview', 'dates', 'history', 'people']) add(`shidduch-${sid.slice(3)}-${t}`, [...shidduchPath(sid, ended), tab(t)]);
  // Source and entry pages
  add('source-rivka10', [nav('shadchanim'), seg('shadchanim', 'sources'), tap('[data-source="src_rivka10"]')]);
  add('source-event', [nav('shadchanim'), seg('shadchanim', 'sources'), tap('[data-source="src_event"]')]);
  add('entry-e1', [tap('[data-entry="e1"]')]);
  // Sheets and dialogs
  add('sheet-settings', [tap('[data-act="settings"]')]);
  add('sheet-add', [tap('[data-act="add-current"]')]);
  for (const [id, b] of [['guy', '#qaGuy'], ['girl', '#qaGirl'], ['shadchan', '#qaShad'], ['offer', '#qaIdea'], ['note', '#qaNote']]) add(`sheet-add-${id}`, [tap('[data-act="add-current"]'), tap(b)]);
  add('sheet-add-activity', [tap('button[data-act="add-activity"]')]);
  add('sheet-recent-filter', [tap('[data-act="filters"]')]);
  add('recent-filter-calls', [tap('[data-act="filters"]'), tap('[data-recent-filter="call"]'), close]);
  add('recent-sort-oldest', [tap('[data-act="filters"]'), tap('[data-recent-sort="oldest"]'), close]);
  add('sheet-shadchanim-filter', [nav('shadchanim'), tap('[data-act="filters"]')]);
  add('sheet-dormant', [nav('shadchanim'), tap('[data-act="filters"]'), tap('#overlay [data-act="show-dormant"]')]);
  add('sheet-girls-filter', [nav('girls'), tap('[data-act="filters"]')]);
  add('sheet-offer', [nav('shidduchim'), seg('shidduchim', 'ideas'), tap('[data-idea="idea_moshe_tamar"]')]);
  add('sheet-whats-next', [...personPath('p_miriam', mode), tap('.warm-contact.wait')]);
  add('sheet-person-menu', [...personPath('p_miriam', mode), tap('[data-act="detail-menu"]')]);
  add('sheet-edit-person', [...personPath('p_miriam', mode), tap('[data-act="detail-menu"]'), tap('#overlay [data-act="edit-person"]')]);
  add('sheet-end-shidduch', [...shidduchPath('sh_david_noa', false), tap('[data-act="end-shidduch"]')]);
  add('sheet-add-source', [nav('shadchanim'), seg('shadchanim', 'sources'), tap('[data-act="add-source"]')]);
  return S;
}

module.exports = { states, personPath, shidduchPath, nav, seg, tab };
