// Functional + data-state baseline. Usage: node functional.cjs <baseURL> <outDir>
// PASS/FAIL = guarantees that must hold before AND after cleanup.
// KNOWN = current v58 behaviour that is a known bug; recorded so a later, approved fix can be proven.
const L = require('./lib.cjs');
const { states, personPath, shidduchPath, nav, seg, tab } = require('./states.cjs');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2];
const OUT = process.argv[3];
const FIX = n => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', n + '.json'), 'utf8'));
const RECORDS = ['people', 'entries', 'sources', 'ideas', 'shidduchim', 'rounds', 'dates', 'openItems', 'profileVersions', 'files', 'folders'];
const results = [];
let browser;

function record(id, title, status, details) { results.push({ id, title, status, details }); console.log(`${status.padEnd(5)} ${id} ${title}`); }
async function fresh({ mode = 'single', skin = 'classic', settings = {}, fixture = 'demo', width = 'phone', mutate } = {}) {
  const { ctx, page } = await L.newPage(browser, BASE, L.WIDTHS[width]);
  const fx = typeof fixture === 'string' ? FIX(fixture) : fixture;
  Object.assign(fx.settings, { mode, skin }, settings);
  if (mutate) mutate(fx);
  await L.idbWrite(page, fx);
  await L.openApp(page);
  return { ctx, page, seeded: fx };
}
async function run(page, steps) { for (const [op, arg] of steps) { if (op === 'tap') await L.tap(page, arg); else if (op === 'close') await L.closeSheets(page); } }
function diff(a, b) {
  const out = { records: [], settings: [], meta: [] };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'settings' || k === 'meta') { for (const s of new Set([...Object.keys(a[k] || {}), ...Object.keys(b[k] || {})])) if (JSON.stringify(a[k]?.[s]) !== JSON.stringify(b[k]?.[s])) out[k].push(s); }
    else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.records.push(k);
  }
  return out;
}
const ids = st => Object.fromEntries(RECORDS.map(k => [k, (st[k] || []).map(x => x.id)]));
const sameIds = (a, b) => JSON.stringify(ids(a)) === JSON.stringify(ids(b));
const domList = (page, sel, attr) => page.$$eval(sel, (els, attr) => els.map(e => attr ? e.getAttribute(attr) : e.textContent.trim()), attr);
async function setting(page, key, value) {
  if (!(await page.$('#overlay [data-setting]'))) await L.tap(page, '[data-act="settings"]');
  const before = (await page.evaluate(() => window.__idbWrites.length));
  await L.tap(page, `#overlay [data-setting="${key}"][data-value="${value}"]`);
  for (let i = 0; i < 40 && (await page.evaluate(() => window.__idbWrites.length)) === before; i++) await page.waitForTimeout(25);
  await L.settle(page);
}
const sortedEntries = (st, pid) => [...st.entries].filter(e => !pid || e.personIds?.includes(pid)).sort((a, b) => new Date(b.at) - new Date(a.at)).map(e => e.id);

const checks = {
  async F01_open_screens_no_write() {
    const det = {};
    let ok = true;
    for (const mode of ['single', 'shadchan']) {
      const { ctx, page, seeded } = await fresh({ mode });
      const before = JSON.stringify(await L.idbRead(page));
      let writes = 0, visited = 0;
      for (const st of states(mode)) { await L.openApp(page); await run(page, st.steps); writes += (await page.evaluate(() => window.__idbWrites.length)); visited++; }
      const after = JSON.stringify(await L.idbRead(page));
      det[mode] = { visited, writes, storedUnchanged: before === after };
      ok = ok && writes === 0 && before === after;
      await ctx.close();
    }
    record('F01', 'Opening every screen, sub-tab, page and sheet writes nothing', ok ? 'PASS' : 'FAIL', det);
  },

  async F02_mode_switch_no_data_change() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const s0 = await L.idbRead(page);
    const counts = async () => { const c = {}; for (const t of ['shadchanim', 'shidduchim']) { await L.tap(page, `button[data-screen="${t}"]`); c[t] = await domList(page, `[data-seg-scope="${t}"] small`); } await L.tap(page, 'button[data-screen="recent"]'); return c; };
    const c0 = await counts();
    await setting(page, 'mode', 'shadchan'); const s1 = await L.idbRead(page); await L.closeSheets(page);
    const c1 = await counts();
    await setting(page, 'mode', 'single'); const s2 = await L.idbRead(page); await L.closeSheets(page);
    await L.openApp(page); const s3 = await L.idbRead(page);
    const d1 = diff(s0, s1), d2 = diff(s0, s2), d3 = diff(s2, s3);
    const ok = !d1.records.length && JSON.stringify(d1.settings) === '["mode"]' && d1.meta.every(k => k === 'updatedAt') && !d2.records.length && !d2.settings.length && JSON.stringify(c0) === JSON.stringify(c1) && !d3.records.length && !d3.settings.length && !d3.meta.length && sameIds(s0, s3);
    record('F02', 'Switching Single ↔ Shadchan changes only settings.mode (records, IDs and counts unchanged; survives reload)', ok ? 'PASS' : 'FAIL', { toShadchan: d1, backToSingle: d2, reload: d3, countsSingle: c0, countsShadchan: c1 });
    await ctx.close();
  },

  async F03_presentation_no_data_change() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    const steps = [...L.SKINS.slice(1).map(s => ['skin', s]), ['skin', 'classic'], ['appearance', '2'], ['appearance', '3'], ['appearance', '1'], ['density', 'compact'], ['density', 'comfortable'], ['iconSize', 'small'], ['iconSize', 'large'], ['iconSize', 'medium'], ['layout', 'phone'], ['layout', 'web'], ['layout', 'auto'], ['summaryCards', 'false'], ['summaryCards', 'true']];
    const bad = [];
    let prev = s0;
    for (const [k, v] of steps) {
      await setting(page, k, v);
      const cur = await L.idbRead(page);
      const d = diff(prev, cur);
      const expectKeys = JSON.stringify(prev.settings[k]) === JSON.stringify(k === 'summaryCards' ? v === 'true' : v) ? [] : [k];
      if (d.records.length || JSON.stringify(d.settings) !== JSON.stringify(expectKeys) || d.meta.some(m => m !== 'updatedAt')) bad.push({ k, v, d });
      prev = cur;
    }
    await L.closeSheets(page); await L.openApp(page);
    const end = await L.idbRead(page); const dEnd = diff(s0, end);
    const ok = !bad.length && !dEnd.records.length && !dEnd.settings.length && sameIds(s0, end);
    record('F03', `Changing skin (all 11), layout feel, size, icons, layout and summary cards changes only that setting (${steps.length} changes)`, ok ? 'PASS' : 'FAIL', { bad, endVsStart: dEnd });
    await ctx.close();
  },

  async F04_recent_and_history_same_ledger() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const st = await L.idbRead(page);
    const det = { ledger: st.entries.length, uniqueIds: new Set(st.entries.map(e => e.id)).size };
    const recent = await domList(page, '#app [data-entry]', 'data-entry');
    det.recentMatchesLedger = JSON.stringify(recent) === JSON.stringify(sortedEntries(st));
    const people = [...new Set(st.entries.flatMap(e => e.personIds || []))];
    det.people = {};
    let ok = det.recentMatchesLedger && det.uniqueIds === det.ledger;
    for (const pid of people) {
      await L.openApp(page);
      const p = st.people.find(x => x.id === pid);
      const steps = pid === 'p_me' ? [nav('guys')] : pid === 'p_leah' ? personPath('p_leah', 'single') : [nav('shadchanim'), seg('shadchanim', 'all'), ['tap', `[data-person="${pid}"]`]];
      await run(page, steps); await L.tap(page, 'button[data-detail-tab="conversation"]');
      const hist = await domList(page, '#app [data-entry]', 'data-entry');
      const exp = sortedEntries(st, pid);
      const same = JSON.stringify(hist) === JSON.stringify(exp) && hist.every(id => recent.includes(id));
      det.people[p.name] = same ? `${hist.length} ✓` : { hist, exp };
      ok = ok && same;
    }
    // Write once: one note added from Miriam's page appears once in the ledger, once in Recent and once in her History.
    await L.openApp(page);
    await run(page, [...personPath('p_miriam', 'single'), tab('conversation')]);
    await L.tap(page, '[data-act="add-person-note"]');
    await page.selectOption('#aType', 'note'); await page.fill('#aText', 'Made-up golden note');
    await L.tap(page, '#overlay [data-act="save-activity"]');
    const st2 = await L.idbRead(page);
    const added = st2.entries.filter(e => !st.entries.some(o => o.id === e.id));
    const hist2 = await domList(page, '#app [data-entry]', 'data-entry');
    await L.tap(page, 'button[data-screen="recent"]');
    const recent2 = await domList(page, '#app [data-entry]', 'data-entry');
    const nid = added[0]?.id;
    det.addNote = { added: added.length, inRecent: recent2.filter(x => x === nid).length, inHistory: hist2.filter(x => x === nid).length };
    ok = ok && added.length === 1 && det.addNote.inRecent === 1 && det.addNote.inHistory === 1 && sameIds(st, { ...st2, entries: st2.entries.filter(e => e.id !== nid) });
    record('F04', 'Recent and every person History show the same ledger entries (by ID); a new note is written once and shows in both', ok ? 'PASS' : 'FAIL', det);
    await ctx.close();
  },

  async F05_shidduch_no_duplicate() {
    const det = {}; let ok = true;
    const pairCount = (st, g, gl) => st.shidduchim.filter(s => s.guyId === g && s.girlId === gl).length;
    const roundsOf = (st, sid) => st.rounds.filter(r => r.shidduchId === sid).map(r => `#${r.number}:${r.status}`);
    // (a) open offer for a pair that already has an active shidduch
    {
      const { ctx, page } = await fresh({ mode: 'single' }); const s0 = await L.idbRead(page);
      await run(page, [nav('shidduchim'), seg('shidduchim', 'ideas'), ['tap', '[data-idea="idea_me_leah"]'], ['tap', '#overlay [data-act="idea-yes"]']]);
      const s1 = await L.idbRead(page);
      det.a_existingActivePair = { shidduchimBefore: s0.shidduchim.length, after: s1.shidduchim.length, pairRecords: pairCount(s1, 'p_me', 'p_leah'), rounds: roundsOf(s1, 'sh_me_leah') };
      ok = ok && pairCount(s1, 'p_me', 'p_leah') === 1 && s1.shidduchim.length === 3 && s0.shidduchim.every(s => s1.shidduchim.some(x => x.id === s.id));
      await ctx.close();
    }
    // (b) a new offer for David – Noa (active) made through the Add sheet, then Interested
    // (c) Ari – Rina (ended) suggested again, then Interested → must reopen the same record as Round 2
    for (const [key, g, gl, by, sid] of [['b_newOfferActivePair', 'p_david', 'p_noa', 'p_rivka', 'sh_david_noa'], ['c_endedPairSuggestedAgain', 'p_ari', 'p_rina', 'p_batya', 'sh_ari_rina']]) {
      const { ctx, page } = await fresh({ mode: 'shadchan' }); const s0 = await L.idbRead(page);
      await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#qaIdea');
      await page.selectOption('#iGuy', g); await page.selectOption('#iGirl', gl); await page.selectOption('#iBy', by);
      await L.tap(page, '#overlay [data-act="save-idea"]');
      const s1 = await L.idbRead(page); const newIdea = s1.ideas.find(i => !s0.ideas.some(o => o.id === i.id));
      await L.tap(page, `[data-idea="${newIdea.id}"]`); await L.tap(page, '#overlay [data-act="idea-yes"]');
      const s2 = await L.idbRead(page);
      const sh = s2.shidduchim.find(s => s.id === sid);
      det[key] = { pairRecords: pairCount(s2, g, gl), sameRecordId: !!sh, status: sh?.status, rounds: roundsOf(s2, sid), leftoverEndedFields: sh ? Object.keys(sh).filter(k => /^end/.test(k)) : [] };
      ok = ok && pairCount(s2, g, gl) === 1 && !!sh && s0.shidduchim.every(s => s2.shidduchim.some(x => x.id === s.id));
      if (key.startsWith('c')) ok = ok && sh.status === 'active' && s2.rounds.some(r => r.shidduchId === sid && r.number === 2);
      await ctx.close();
    }
    const twoActive = ['a_existingActivePair', 'b_newOfferActivePair'].every(k => det[k].rounds.filter(r => r.endsWith(':active')).length === 2);
    record('K9', 'Interested on a pair whose round is still active opens Round 2 while Round 1 stays active', twoActive ? 'KNOWN' : 'CHANGED', { a: det.a_existingActivePair.rounds, b: det.b_newOfferActivePair.rounds });
    record('F05', 'One permanent shidduch per pair: Interested never creates a second record; an ended pair suggested again reopens the same record as Round 2', ok ? 'PASS' : 'FAIL', det);
  },

  async F06_ids_unchanged_and_reload() {
    const { ctx, page, seeded } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    for (const st of states('shadchan')) { await L.openApp(page); await run(page, st.steps); }
    await L.openApp(page);
    await setting(page, 'mode', 'single'); await setting(page, 'skin', 'dark'); await setting(page, 'skin', 'classic'); await setting(page, 'mode', 'shadchan'); await L.closeSheets(page);
    await L.openApp(page); await L.openApp(page);
    const s1 = await L.idbRead(page);
    const seedIdsMatch = sameIds(seeded, s0);
    const recordsUnchanged = RECORDS.every(k => JSON.stringify(s0[k]) === JSON.stringify(s1[k]));
    // Add a person through the UI, then reload twice: the record and every ID must come back identical.
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#qaGuy');
    await page.fill('#fName', 'Golden Test Person'); await page.fill('#fCity', 'Haifa'); await page.fill('#fPhone', '050-000-0000');
    await L.tap(page, '#overlay [data-act="save-person"]');
    const s2 = await L.idbRead(page);
    const added = s2.people.find(p => p.name === 'Golden Test Person');
    await L.openApp(page); const s3 = await L.idbRead(page);
    await L.tap(page, 'button[data-screen="guys"]');
    const listed = (await domList(page, '#app [data-person]', 'data-person')).includes(added?.id);
    const ok = seedIdsMatch && recordsUnchanged && sameIds(s0, s1) && !!added && JSON.stringify(s2) === JSON.stringify(s3) && listed && ids(s0).people.every(i => ids(s3).people.includes(i));
    record('F06', 'All permanent IDs unchanged after browsing, mode/skin switches and reloads; a saved person survives reload with the same ID', ok ? 'PASS' : 'FAIL', { seedIdsMatch, recordsUnchanged, idCounts: Object.fromEntries(Object.entries(ids(s1)).map(([k, v]) => [k, v.length])), addedId: added?.id, identicalAfterReload: JSON.stringify(s2) === JSON.stringify(s3), listedInGuys: listed });
    await ctx.close();
  },

  async F07_recent_filter() {
    const { ctx, page } = await fresh({ mode: 'single' }); const st = await L.idbRead(page);
    const todo0 = await page.$$eval('.zm-todo-card', e => e.length);
    await L.tap(page, '[data-act="filters"]'); await L.tap(page, '[data-recent-filter="call"]'); await L.closeSheets(page);
    const calls = await domList(page, '#app [data-entry]', 'data-entry');
    const expCalls = sortedEntries(st).filter(id => st.entries.find(e => e.id === id).type === 'call');
    await L.tap(page, '[data-act="filters"]'); await L.tap(page, '[data-recent-sort="oldest"]'); await L.closeSheets(page);
    const oldest = await domList(page, '#app [data-entry]', 'data-entry');
    const todo1 = await page.$$eval('.zm-todo-card', e => e.length);
    const hear = await page.$$eval('.zm-hear-back-row', e => e.length);
    const writes = await page.evaluate(() => window.__idbWrites.length);
    const ok = JSON.stringify(calls) === JSON.stringify(expCalls) && JSON.stringify(oldest) === JSON.stringify([...expCalls].reverse()) && todo0 === todo1 && hear === 1 && writes === 0;
    record('F07', 'Recent filter (Calls) and sort (Oldest) change only History; to-do and To hear back stay; nothing is written', ok ? 'PASS' : 'FAIL', { calls, oldest, todo: [todo0, todo1], hearBack: hear, writes });
    await ctx.close();
  },

  async F08_nav_and_single_mode() {
    const det = {}; let ok = true;
    for (const mode of ['single', 'shadchan']) {
      const { ctx, page } = await fresh({ mode });
      const screens = await domList(page, 'nav [data-screen]', 'data-screen');
      const labels = await page.$$eval('nav [data-screen]', els => els.map(e => e.textContent.trim()));
      await L.tap(page, 'button[data-screen="guys"]');
      const opened = { detailName: await page.$eval('#app', a => a.querySelector('.zm-profile-identity h1')?.textContent || null), profileTabActive: !!(await page.$('[data-detail-tab="profile"].active')), personRows: (await domList(page, '#app [data-person]', 'data-person')).length };
      det[mode] = { screens, labels, guysTap: opened };
      const expLabels = ['Recent', mode === 'single' ? 'My profile' : 'Guys', 'Shadchanim', 'Girls', 'Shidduchim'];
      ok = ok && JSON.stringify(screens) === '["recent","guys","shadchanim","girls","shidduchim"]' && JSON.stringify(labels) === JSON.stringify(expLabels);
      ok = ok && (mode === 'single' ? opened.detailName === 'Me' && opened.profileTabActive : opened.detailName === null && opened.personRows === 3);
      if (mode === 'single') { await L.tap(page, '[data-act="back"]'); det.single.afterBackFromMyProfile = await domList(page, '#app [data-person]', 'data-person'); }
      // Girls
      await L.tap(page, 'button[data-screen="girls"]');
      det[mode].girls = { rows: await domList(page, '#app [data-person]', 'data-person'), tabs: await domList(page, '[data-seg-scope="girls"]', 'data-seg'), subtitle: await page.$eval('.warm-title-copy p', e => e.textContent).catch(() => null) };
      ok = ok && (mode === 'single' ? JSON.stringify(det[mode].girls.rows) === '["p_leah"]' && det[mode].girls.tabs.length === 0 : det[mode].girls.rows.length === 4 && det[mode].girls.tabs.length === 2);
      await ctx.close();
    }
    record('F08', 'Nav order Recent · Guys · Shadchanim · Girls · Shidduchim; Single mode: Guys = My profile (opens own profile), Girls = only profiles applicable to me', ok ? 'PASS' : 'FAIL', det);
  },

  async F09_wording_and_layout_rules() {
    const det = {}; let ok = true;
    const { ctx, page } = await fresh({ mode: 'single' });
    det.recentSections = await domList(page, '#app h2');
    det.recentHasCurrentShidduchim = /current shidduch|active shidduch/i.test(await page.$eval('#app', a => a.textContent));
    ok = ok && JSON.stringify(det.recentSections) === '["My to-do list","To hear back","History"]' && !det.recentHasCurrentShidduchim;
    det.gear = {};
    for (const t of ['recent', 'guys', 'shadchanim', 'girls', 'shidduchim']) { await L.tap(page, `button[data-screen="${t}"]`); det.gear[t] = (await page.$$('#app [data-act="settings"]')).length; }
    ok = ok && det.gear.recent === 1 && ['guys', 'shadchanim', 'girls', 'shidduchim'].every(t => det.gear[t] === 0);
    await L.tap(page, 'button[data-screen="shadchanim"]');
    det.shadchanimTabs = await domList(page, '[data-seg-scope="shadchanim"] span');
    ok = ok && JSON.stringify(det.shadchanimTabs) === '["All","To hear back","My to-do","Time to contact","Sources"]';
    await L.tap(page, 'button[data-screen="shidduchim"]');
    det.shidduchimTabs = await domList(page, '[data-seg-scope="shidduchim"] span');
    ok = ok && JSON.stringify(det.shidduchimTabs) === '["Offers","In Progress","Ended"]';
    await L.tap(page, 'button[data-seg-scope="shidduchim"][data-seg="active"]');
    det.stageInProgress = await page.$$eval('[data-shidduch]', els => els.map(e => e.dataset.shidduch + ': ' + (e.querySelector('.zm-stage-floating')?.textContent || '')));
    await L.tap(page, 'button[data-seg-scope="shidduchim"][data-seg="ended"]');
    det.stageEnded = await page.$$eval('[data-shidduch]', els => els.map(e => e.dataset.shidduch + ': ' + (e.querySelector('.zm-stage-floating')?.textContent || '')));
    det.stageSegments = await page.$$eval('.zm-stage-seg', els => els.slice(0, 11).map(e => e.title));
    ok = ok && det.stageInProgress.includes('sh_me_leah: References') && JSON.stringify(det.stageSegments) === JSON.stringify(['Profile sent', 'References', 'Date 1', 'Date 2', 'Date 3', 'Date 4', 'Date 5', 'Date 6', 'Date 7', 'Date 8', 'Marriage']);
    // Profiles: no empty status boxes; What's next? wording; contact order and icons.
    await L.openApp(page); await run(page, personPath('p_dina', 'single'));
    det.dina = { boxes: (await page.$$('.zm-person-open-box')).length, metricGrid: (await page.$$('.warm-metric-grid')).length, statusText: await page.$eval('.zm-person-status-area', e => e.textContent.replace(/\s+/g, ' ').trim()) };
    await L.openApp(page); await run(page, personPath('p_miriam', 'single'));
    det.miriam = { boxes: await domList(page, '.zm-person-open-box b'), contacts: await domList(page, '.warm-contact-row [data-contact]', 'data-contact'), contactLabels: await domList(page, '.warm-contact-row small') };
    det.setTurnAnywhere = /Set turn/.test(await page.content());
    ok = ok && det.dina.boxes === 0 && det.dina.metricGrid === 0 && !/My turn|Their turn|Nothing|\b0\b/.test(det.dina.statusText) && det.miriam.boxes.length === 2 && JSON.stringify(det.miriam.contacts) === '["call","email","wa","sms","wait"]' && JSON.stringify(det.miriam.contactLabels) === JSON.stringify(['Call', 'Email', 'WhatsApp', 'SMS', "What's next?"]) && !det.setTurnAnywhere;
    const { whatsapp: expWa, sms: expSms } = FIX('icons-v58');
    det.icons = await page.evaluate(([wa, sms]) => { const norm = s => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); g.innerHTML = s; return g.innerHTML; };
      return { whatsapp: document.querySelector('.warm-contact.message svg').innerHTML === norm(wa), sms: document.querySelector('.warm-contact.sms svg').innerHTML === norm(sms) }; }, [expWa, expSms]);
    ok = ok && det.icons.whatsapp && det.icons.sms;
    await L.tap(page, '.warm-contact.wait'); det.whatsNextSheetTitle = await page.$eval('#overlay h2', e => e.textContent);
    ok = ok && det.whatsNextSheetTitle === "What's next?";
    record('F09', "v58 UX rules: Recent sections, gear only on Recent, Shadchanim/Shidduchim tab wording, stage bar + Thinking rule, no empty status boxes, What's next?, contact order, WhatsApp/SMS icons", ok ? 'PASS' : 'FAIL', det);
    await ctx.close();
    // Recent without "to hear back" items shows no To hear back section.
    const f2 = await fresh({ mode: 'single', mutate: fx => fx.openItems.forEach(x => { if (x.direction === 'them') x.status = 'closed'; }) });
    const secs = await domList(f2.page, '#app h2');
    record('F09b', 'Recent hides "To hear back" when there are no such items', JSON.stringify(secs) === '["My to-do list","History"]' ? 'PASS' : 'FAIL', { sections: secs });
    await f2.ctx.close();
  },

  async F10_sticky_headers() {
    const det = {}; let ok = true; const kids = {};
    L.mkdirp(path.join(OUT, 'sticky'));
    for (const width of ['phone', 'desktop']) for (const skin of L.SKINS) {
      const { ctx, page } = await fresh({ mode: 'shadchan', skin, width, fixture: 'demo-long' });
      await run(page, [...personPath('p_miriam', 'shadchan'), tab('conversation')]);
      const m = () => page.evaluate(() => { const b = document.querySelector('.zm-profile-identity'); const r = b.getBoundingClientRect(); const a = b.querySelector('.zm-profile-avatar').getBoundingClientRect();
        return { cls: [...b.classList].filter(c => c !== 'zm-profile-identity').join(' '), top: Math.round(r.top), h: Math.round(r.height * 10) / 10, avatar: Math.round(a.width), scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }; });
      const atTop = await m();
      await page.evaluate(() => window.scrollTo(0, 700)); await L.settle(page); await L.frames(page, 3);
      const scrolled = await m();
      fs.writeFileSync(path.join(OUT, 'sticky', `profile_${skin}_${width}.png`), await page.screenshot({ animations: 'disabled', caret: 'hide' }));
      await page.evaluate(() => window.scrollTo(0, 0)); await L.settle(page); await L.frames(page, 3);
      const back = await m();
      await L.openApp(page); await run(page, [nav('shadchanim'), seg('shadchanim', 'all')]);
      await page.evaluate(() => window.scrollTo(0, 1500)); await L.settle(page); await L.frames(page, 3);
      const shad = await page.evaluate(() => { const h = document.querySelector('.zm-shadchan-sticky-head'); const r = h.getBoundingClientRect(); return { cls: h.className, top: Math.round(r.top) }; });
      fs.writeFileSync(path.join(OUT, 'sticky', `shadchanim_${skin}_${width}.png`), await page.screenshot({ animations: 'disabled', caret: 'hide' }));
      const good = /zm-fixed/.test(scrolled.cls) && scrolled.top === 0 && scrolled.h === atTop.h && scrolled.avatar === atTop.avatar && !/zm-fixed/.test(back.cls) && back.top === atTop.top && /is-stuck/.test(shad.cls) && shad.top <= 0;
      det[`${skin}/${width}`] = good ? `✓ h=${atTop.h} avatar=${atTop.avatar}` : { atTop, scrolled, back, shad };
      if (skin === 'kids') kids[width] = { good, atTopHeight: atTop.h, pinnedHeight: scrolled.h, shadchanimHeadSticks: /is-stuck/.test(shad.cls) };
      else ok = ok && good;
      await ctx.close();
    }
    record('F10', 'Profile header is compact from the start, pins at top on scroll without resizing (10 skins × 2 widths); Shadchanim header sticks', ok ? 'PASS' : 'FAIL', det);
    record('K8', 'Cartoon skin: profile header is not compact (≈314 px tall at top, squeezed column, empty block) and shrinks when pinned', Object.values(kids).every(k => !k.good) ? 'KNOWN' : 'CHANGED', kids);
  },

  // ---------- SAFETY requirements for step B. Expected to FAIL on v58 and PASS after the approved fix. ----------
  async S1_render_error_keeps_real_data() {
    const { ctx, page } = await fresh({ mode: 'shadchan', mutate: fx => { delete fx.openItems; fx.people.push({ id: 'p_golden_real', name: 'Golden Real Person', types: ['Shadchan'], createdAt: '2026-10-01T09:00:00.000Z' }); } });
    const s0 = await L.idbRead(page);
    const text = await page.$eval('#app', a => a.textContent);
    const demoShown = /Local storage unavailable/.test(await page.$eval('#toast', e => e.textContent));
    let exported = null;
    const btn = await page.$('#app [data-act="export-backup"]');
    if (btn) { const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.querySelector('#app [data-act="export-backup"]').click())]); exported = fs.readFileSync(await dl.path(), 'utf8').includes('Golden Real Person'); }
    // Any way to reach a save must not replace the stored real data.
    if (await page.$('[data-act="settings"]')) await setting(page, 'density', 'compact');
    const s1 = await L.idbRead(page);
    const kept = s1.people.some(p => p.id === 'p_golden_real') && JSON.stringify(s0.people) === JSON.stringify(s1.people);
    const ok = kept && !demoShown && exported === true;
    record('S1', 'A display error on real data never swaps in demo data; real data stays stored and can be exported', ok ? 'PASS' : 'FAIL', { realDataKept: kept, demoShown, exportButton: !!btn, exportContainsRealData: exported, screen: text.trim().slice(0, 80) });
    await ctx.close();
  },
  async S2_storage_failure_never_overwrites() {
    const { ctx, page } = await L.newPage(browser, BASE, L.WIDTHS.phone);
    const fx = FIX('demo'); fx.people.push({ id: 'p_golden_real', name: 'Golden Real Person', types: ['Shadchan'], createdAt: '2026-10-01T09:00:00.000Z' });
    await L.idbWrite(page, fx);
    // The first IndexedDB open on the app page fails once (a transient storage error); later opens work.
    await page.addInitScript(() => { if (!location.pathname.endsWith('/index.html')) return; const orig = indexedDB.open.bind(indexedDB); let first = true;
      indexedDB.open = function (...a) { if (first) { first = false; const req = {}; setTimeout(() => { req.error = new DOMException('simulated', 'UnknownError'); req.onerror && req.onerror({}); }, 0); return req; } return orig(...a); }; });
    await L.openApp(page);
    await setting(page, 'density', 'compact'); await L.closeSheets(page);
    await page.waitForTimeout(150);
    const s1 = await L.idbRead(page);
    const kept = s1.people.some(p => p.id === 'p_golden_real');
    record('S2', 'If storage fails once at startup, the temporary demo data is never saved over the real data', kept ? 'PASS' : 'FAIL', { realDataKept: kept, storedPeople: s1.people.length, toast: await page.$eval('#toast', e => e.textContent) });
    await ctx.close();
  },

  // ---------- KNOWN v58 bugs: recorded, not "passing". Step B is expected to change K1–K4 on purpose. ----------
  async K1_demo_toggle_wipes_real_data() {
    const { ctx, page } = await fresh({ mode: 'shadchan', mutate: fx => { fx.meta.demo = false; fx.people.push({ id: 'p_golden_real', name: 'Golden Real Person', types: ['Shadchan'], createdAt: '2026-10-01T09:00:00.000Z' }); } });
    const label = await (async () => { await L.tap(page, '[data-act="settings"]'); return page.$eval('#overlay [data-act="toggle-demo"]', e => e.textContent); })();
    await L.tap(page, '#overlay [data-act="toggle-demo"]');
    const st = await L.idbRead(page);
    const lost = !st.people.some(p => p.id === 'p_golden_real');
    record('K1', `Settings "${label}" replaces all real data with no confirm and no undo`, lost ? 'KNOWN' : 'CHANGED', { realPersonStillThere: !lost, peopleAfter: st.people.length, demoFlag: st.meta.demo });
    await ctx.close();
  },
  async K2_render_error_swaps_in_demo() {
    const { ctx, page } = await fresh({ mode: 'shadchan', mutate: fx => { delete fx.openItems; fx.people.push({ id: 'p_golden_real', name: 'Golden Real Person', types: ['Shadchan'], createdAt: '2026-10-01T09:00:00.000Z' }); } });
    const toast = await page.$eval('#toast', e => e.textContent);
    const shownReal = (await page.content()).includes('Golden Real Person');
    const s1 = await L.idbRead(page);
    if (await page.$('[data-act="settings"]')) await setting(page, 'density', 'compact');
    const s2 = await L.idbRead(page);
    const lost = !s2.people.some(p => p.id === 'p_golden_real');
    record('K2', 'If the first render throws (e.g. a backup without openItems), the app silently shows demo data; the next save overwrites the real data', lost ? 'KNOWN' : 'CHANGED', { toast, realShown: shownReal, storedStillRealBeforeSave: s1.people.some(p => p.id === 'p_golden_real'), realLostAfterOneSettingTap: lost, pageErrors: page.__errors.slice(0, 3) });
    await ctx.close();
  },
  async K3_restore_keeps_no_copy() {
    const { ctx, page } = await fresh({ mode: 'shadchan', mutate: fx => fx.people.push({ id: 'p_golden_real', name: 'Golden Real Person', types: ['Shadchan'], createdAt: '2026-10-01T09:00:00.000Z' }) });
    const backup = FIX('demo'); backup.people = backup.people.slice(0, 5);
    await L.tap(page, '[data-act="settings"]');
    await page.setInputFiles('#backupFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await L.settle(page); await page.waitForTimeout(200);
    const st = await L.idbRead(page);
    const keys = await page.evaluate(() => new Promise(r => { const q = indexedDB.open('ZivugMatchDB', 1); q.onsuccess = () => { const k = q.result.transaction('kv').objectStore('kv').getAllKeys(); k.onsuccess = () => r(k.result); }; }));
    const lost = !st.people.some(p => p.id === 'p_golden_real');
    record('K3', 'Restore replaces everything and keeps no recoverable copy of the previous data', lost && keys.length === 1 ? 'KNOWN' : 'CHANGED', { peopleAfter: st.people.length, storedKeys: keys });
    await ctx.close();
  },
  async K4_missing_createdAt_crashes_list() {
    const { ctx, page } = await fresh({ mode: 'shadchan', mutate: fx => fx.people.splice(1, 0, { id: 'p_golden_nodate', name: 'Golden No Date', types: ['Guy'] }) });
    const n = page.__errors.length;
    await L.tap(page, 'button[data-screen="guys"]');
    const errs = page.__errors.slice(n);
    const showsGuys = (await domList(page, '#app h1')).includes('Guys');
    record('K4', 'A person without createdAt (and no contact) crashes the Guys list sort', errs.some(e => /localeCompare/.test(e)) ? 'KNOWN' : 'CHANGED', { errors: errs.slice(0, 2), guysScreenShown: showsGuys });
    await ctx.close();
  },
  async K5_double_tap_interested() {
    const { ctx, page } = await fresh({ mode: 'shadchan' }); const s0 = await L.idbRead(page);
    await run(page, [nav('shidduchim'), seg('shidduchim', 'ideas'), ['tap', '[data-idea="idea_moshe_tamar"]']]);
    await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="idea-yes"]'); b.click(); b.click(); }); await L.settle(page); await page.waitForTimeout(200);
    const st = await L.idbRead(page); const sh = st.shidduchim.filter(s => s.guyId === 'p_moshe' && s.girlId === 'p_tamar');
    const rounds = st.rounds.filter(r => sh.some(s => s.id === r.shidduchId)).map(r => `#${r.number}:${r.status}`);
    record('K5', 'Double tap on Interested opens two active rounds (no status guard)', rounds.length > 1 ? 'KNOWN' : 'CHANGED', { records: sh.length, rounds });
    await ctx.close();
  },
  async K6_contact_tap_logs_contact() {
    const { ctx, page } = await fresh({ mode: 'single' }); const s0 = await L.idbRead(page);
    await run(page, personPath('p_dina', 'single')); await L.tap(page, '.warm-contact.message');
    const st = await L.idbRead(page); const added = st.entries.filter(e => !s0.entries.some(o => o.id === e.id));
    record('K6', 'Tapping WhatsApp on a person with no phone still logs an outgoing contact ("WhatsApp opened.")', added.length ? 'KNOWN' : 'CHANGED', { added: added.map(e => `${e.type}/${e.direction}: ${e.text}`), toast: await page.$eval('#toast', e => e.textContent) });
    await ctx.close();
  },
  async K7_visual_quirks() {
    const { ctx, page } = await fresh({ mode: 'single' });
    await run(page, personPath('p_miriam', 'single'));
    const fake = await page.$eval('#app', a => a.textContent.includes('Has v3 · v4 ready'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await L.openApp(page); await run(page, shidduchPath('sh_david_noa', false));
    await L.tap(page, '[data-act="detail-menu"]'); const menuOpened = !!(await page.$('#overlay .sheet'));
    await L.closeSheets(page);
    // Stale "back to shidduch": open a name from the shidduch, leave by the bottom nav, open another person, press Back.
    await L.tap(page, '[data-zm-person="p_david"]'); await L.tap(page, 'button[data-screen="recent"]');
    await L.tap(page, '.zm-todo-card'); await L.tap(page, '[data-act="back"]');
    const landedOn = await page.$eval('#app', a => a.querySelector('.zm-pair-title') ? 'shidduch page (stale)' : a.querySelector('h1')?.textContent);
    record('K7', 'Visual/navigation quirks', 'KNOWN', { fakeProfileVersionRow: fake, profileHorizontalOverflowPx: overflow, shidduchMoreButtonOpensSomething: menuOpened, backAfterLeavingShidduch: landedOn });
    await ctx.close();
  },
};

(async () => {
  L.mkdirp(OUT);
  browser = await L.launch();
  const only = process.argv[4];
  for (const [name, fn] of Object.entries(checks)) {
    if (only && !name.startsWith(only)) continue;
    try { await fn(); } catch (e) { record(name.split('_')[0], name, 'ERROR', e.message.split('\n').slice(0, 3).join(' ')); }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'functional.json'), JSON.stringify(results, null, 1));
})();
