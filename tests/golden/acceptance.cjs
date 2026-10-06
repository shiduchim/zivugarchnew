// Architecture acceptance tests for ZivugMatch v1.0. Usage: node acceptance.cjs <baseURL> <outDir> [onlyPrefix]
// Each test starts from a fresh browser context seeded with made-up v58 data (the way a real user's data looks
// before the upgrade), drives the app through its own screens or its action functions, and checks the stored
// records. Fixtures are never edited by a test.
const L = require('./lib.cjs');
const { personPath, shidduchPath, nav, seg, tab } = require('./states.cjs');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2];
const OUT = process.argv[3];
const ONLY = process.argv[4] || '';
const FIX = n => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', n + '.json'), 'utf8'));
const COLL = ['people', 'links', 'entries', 'sources', 'ideas', 'shidduchim', 'rounds', 'dates', 'openItems', 'profileVersions', 'files', 'folders', 'merges', 'identityDecisions', 'attention'];
const results = [];
let browser;

function record(id, title, ok, details) { const status = ok ? 'PASS' : 'FAIL'; results.push({ id, title, status, details }); console.log(`${status.padEnd(5)} ${id} ${title}`); if (!ok) console.log('      ' + JSON.stringify(details).slice(0, 600)); }
async function fresh({ fixture = 'demo', mode = 'shadchan', skin = 'classic', width = 'phone', mutate } = {}) {
  const { ctx, page } = await L.newPage(browser, BASE, L.WIDTHS[width]);
  const fx = typeof fixture === 'string' ? FIX(fixture) : fixture;
  Object.assign(fx.settings, { mode, skin });
  if (mutate) mutate(fx);
  await L.idbWrite(page, fx);
  await L.openApp(page);
  await L.openApp(page);
  return { ctx, page, seeded: fx };
}
async function run(page, steps) { for (const [op, arg] of steps) { if (op === 'tap') await L.tap(page, arg); else if (op === 'close') await L.closeSheets(page); } }
const writes = page => page.evaluate(() => window.__idbWrites.length);
const inPage = (page, fn, arg) => page.evaluate(fn, arg);
async function kv(page, key) { return page.evaluate(key => new Promise(r => { const q = indexedDB.open('ZivugMatchDB'); q.onsuccess = () => { const db = q.result; if (!db.objectStoreNames.contains('kv')) { db.close(); return r(undefined); } const g = db.transaction('kv').objectStore('kv').get(key); g.onsuccess = () => { db.close(); r(g.result); }; }; }), key); }
async function copyRecord(page, idv) { return page.evaluate(idv => new Promise(r => { const q = indexedDB.open('ZivugMatchDB'); q.onsuccess = () => { const db = q.result; if (!db.objectStoreNames.contains('copies')) { db.close(); return r(undefined); } const g = db.transaction('copies').objectStore('copies').get(idv); g.onsuccess = () => { db.close(); r(g.result); }; }; }), idv); }
const records = st => Object.fromEntries(COLL.map(c => [c, st[c] || []]));
const byId = (list, idv) => (list || []).find(x => x.id === idv);
async function download(page, selector) { const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(sel => document.querySelector(sel).click(), selector)]); return fs.readFileSync(await dl.path(), 'utf8'); }

const tests = {
  // ---- The one-time upgrade --------------------------------------------------------------------
  async M01_upgrade_keeps_a_safety_copy() {
    const { ctx, page, seeded } = await fresh({ fixture: 'v58-rich' });
    const copy = await copyRecord(page, 'copy_before_v1');
    const index = await kv(page, 'copiesIndex');
    const original = await kv(page, 'state');
    const ok = !!copy && copy.pinned === true && copy.format === 'v58' && JSON.stringify(copy.data) === JSON.stringify(seeded) && JSON.stringify(original) === JSON.stringify(seeded) && index?.some(c => c.id === 'copy_before_v1' && c.pinned);
    record('M01', 'The upgrade first keeps the untouched v58 data as a pinned "Before v1.0" copy; kv/state stays the original', ok, { copy: !!copy, pinned: copy?.pinned, sameAsSeed: copy && JSON.stringify(copy.data) === JSON.stringify(seeded), originalKept: JSON.stringify(original) === JSON.stringify(seeded) });
    await ctx.close();
  },

  async M02_upgrade_runs_once() {
    const { ctx, page } = await fresh({ fixture: 'v58-rich' });
    const s1 = await L.idbRead(page);
    await L.openApp(page); const w1 = await writes(page);
    await L.openApp(page); const w2 = await writes(page);
    const s2 = await L.idbRead(page);
    // Running the upgrade function again on upgraded data changes nothing.
    const passThrough = await inPage(page, () => { const once = JSON.stringify(records2(data)); function records2(d) { return Object.fromEntries(COLLECTIONS.map(c => [c, d[c]])); } return JSON.stringify(records2(migrateV58(data).data)) === once; });
    // Restoring "Before v1.0" upgrades the original again: the same records, nothing doubled.
    await inPage(page, () => restoreSafetyCopy('copy_before_v1'));
    await L.settle(page); await page.waitForTimeout(200);
    const s3 = await L.idbRead(page);
    const same = COLL.every(c => JSON.stringify((s3[c] || []).map(x => x.id)) === JSON.stringify((s1[c] || []).map(x => x.id)));
    const ok = w1 === 0 && w2 === 0 && JSON.stringify(records(s1)) === JSON.stringify(records(s2)) && passThrough && same;
    record('M02', 'The upgrade runs once: later starts write nothing; re-running it or restoring "Before v1.0" never duplicates a record', ok, { writesAfterUpgrade: [w1, w2], unchanged: JSON.stringify(records(s1)) === JSON.stringify(records(s2)), passThrough, sameIdsAfterRestore: same });
    await ctx.close();
  },

  async M03_failed_upgrade_is_recoverable() {
    const { ctx, page } = await L.newPage(browser, BASE, L.WIDTHS.phone);
    const fx = FIX('v58-rich'); fx.settings.mode = 'shadchan';
    await L.idbWrite(page, fx);
    const fault = async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()) + "\n;migrateV58=function(){throw new Error('simulated upgrade failure')};" }); };
    await ctx.route(/migrate\.js/, fault);
    await L.openApp(page);
    const screen = await page.$eval('#app', a => a.textContent);
    const st = await L.idbRead(page);
    const exported = await download(page, '#app [data-act="export-original"]');
    const noCopy = !(await copyRecord(page, 'copy_before_v1'));
    await ctx.unroute(/migrate\.js/, fault);
    await L.openApp(page);
    const after = await L.idbRead(page);
    const ok = /could not be updated/.test(screen) && JSON.stringify(st) === JSON.stringify(fx) && JSON.parse(exported).people.length === fx.people.length && noCopy && after.schema === 2 && after.people.length === fx.people.length;
    record('M03', 'A failed upgrade writes nothing, offers the original data as a file, and succeeds on the next try', ok, { screen: screen.trim().slice(0, 60), storedStillV58: JSON.stringify(st) === JSON.stringify(fx), exportedPeople: JSON.parse(exported).people.length, noHalfCopy: noCopy, afterRetry: after.schema });
    await ctx.close();
  },

  async M04_v58_data_survives() {
    const { ctx, page, seeded } = await fresh({ fixture: 'v58-rich' });
    const st = await L.idbRead(page);
    const det = {};
    const listMap = { people: 'people', entries: 'entries', sources: 'sources', ideas: 'ideas', shidduchim: 'shidduchim', rounds: 'rounds', dates: 'dates', openItems: 'openItems' };
    det.idsKept = Object.entries(listMap).every(([v58, v1]) => seeded[v58].every(r => byId(st[v1], r.id)));
    det.wordsKept = seeded.entries.every(e => byId(st.entries, e.id).text === e.text) && seeded.people.every(p => byId(st.people, p.id).name === p.name) && seeded.openItems.every(x => byId(st.openItems, x.id).label === x.label);
    const pv = st.profileVersions;
    det.profileText = seeded.people.filter(p => String(p.profileText || '').trim()).every(p => pv.some(v => v.personId === p.id && v.text === p.profileText && v.number === Math.max(1, Number(p.profileVersion) || 1)));
    det.olderSendKeepsNumber = byId(st.entries, 'e_rich_v3').profileVersionNumber === 3 && !byId(st.entries, 'e_rich_v3').profileVersionId;
    det.sendLinkedToFrozenVersion = byId(st.entries, 'e3').profileVersionId === 'pv_p_me_4';
    det.noInventedDate = byId(st.entries, 'e_rich_nodate').at === null && byId(st.people, 'p_rich_nodate').createdAt === null;
    det.ideaInterested = byId(st.ideas, 'idea_rich_conv').status === 'interested' && byId(st.ideas, 'idea_rich_conv').shidduchId === 'sh_rich_a';
    det.roundMadeForShidduchWithout = st.rounds.some(r => r.shidduchId === 'sh_rich_b' && r.createdByUpgrade && r.status === 'active');
    det.endedAsShown = byId(st.rounds, 'round_rich_a1').status === 'ended' && byId(st.rounds, 'round_rich_a1').endedStageIndex === 3;
    det.datesKept = byId(st.dates, 'date_rich_a2').base.status === 'cancelled' && byId(st.dates, 'date_rich_a1').base.guy === 'Positive';
    det.sourceLines = byId(st.sources, 'src_rich').lines.map(l => l.personId).join(',') === 'p_rich_heb1,p_does_not_exist';
    det.unknownFieldKept = JSON.stringify(st.meta.legacy?.customStuff) === JSON.stringify(seeded.customStuff);
    det.nothingDeleted = Object.values(listMap).every(c => st[c].length >= seeded[c].length);
    const ok = Object.values(det).every(Boolean);
    record('M04', 'Old v58 data survives the upgrade: every id, word and date is kept, profiles become frozen versions, nothing is invented or deleted', ok, det);
    await ctx.close();
  },

  async M05_ambiguous_data_is_kept_for_a_look() {
    const { ctx, page } = await fresh({ fixture: 'v58-rich' });
    const st = await L.idbRead(page);
    const pair = st.attention.find(a => a.kind === 'duplicate-pair');
    const ppl = st.attention.find(a => a.kind === 'possible-same-person');
    const ok = pair && pair.ids.sort().join() === 'sh_rich_a,sh_rich_b' && ppl && ppl.ids.sort().join() === 'p_rich_heb1,p_rich_heb2'
      && !st.people.some(p => p.mergedIntoId) && !st.shidduchim.some(s => s.mergedIntoId) && byId(st.shidduchim, 'sh_rich_a') && byId(st.shidduchim, 'sh_rich_b');
    record('M05', 'The upgrade never merges uncertain people or pairs: they are kept apart and listed for a look', !!ok, { pair: pair?.ids, people: ppl?.ids });
    await ctx.close();
  },

  // ---- Identity ------------------------------------------------------------------------------------
  async I01_one_person_from_several_ways_in() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    const addPerson = async (name, phone, extra = {}) => {
      await L.tap(page, 'button[data-screen="recent"]');
      await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#qaShad');
      await page.fill('#fName', name); await page.fill('#fPhone', phone); if (extra.city) await page.fill('#fCity', extra.city);
      await L.tap(page, '#overlay [data-act="save-person"]');
    };
    // The same phone, written another way, arrives twice more (an event, a list): "already here" each time.
    await addPerson('Miriam Cohen', '+972 50-555-0101');
    const asked1 = await page.$eval('#overlay h2', e => e.textContent).catch(() => '');
    await L.tap(page, '#overlay [data-act="identity-same"]');
    await addPerson('M. Cohen', '0505550101');
    const asked2 = await page.$eval('#overlay h2', e => e.textContent).catch(() => '');
    await L.tap(page, '#overlay [data-act="identity-same"]');
    const s1 = await L.idbRead(page);
    const miriams = s1.people.filter(p => /cohen/i.test(p.name || '') && !p.mergedIntoId && p.types.includes('Shadchan'));
    const ok = /already here/.test(asked1) && /already here/.test(asked2) && s1.people.length === s0.people.length && miriams.length === 1 && miriams[0].id === 'p_miriam';
    record('I01', 'The same human arriving again (other spelling, other phone format) stays one Person record', ok, { asked1, asked2, peopleBefore: s0.people.length, after: s1.people.length });
    await ctx.close();
  },

  async I02_match_levels_including_hebrew() {
    const { ctx, page } = await fresh({ fixture: 'v58-rich', mode: 'shadchan' });
    const r = await inPage(page, () => {
      const ids = m => ({ exact: m.exact.map(p => p.id), likely: m.likely.map(p => p.id), similar: m.similar.map(p => p.id) });
      return {
        phone: ids(findPersonMatches({ name: 'Somebody', phone: '+972-50-555-0101' })),
        email: ids(findPersonMatches({ name: 'Somebody', email: ' MIRIAM@example.com ' })),
        likelyCity: ids(findPersonMatches({ name: 'Cohen, Miriam', city: 'jerusalem' })),
        nameOnly: ids(findPersonMatches({ name: 'Miriam Cohen' })),
        hebrewTitle: ids(findPersonMatches({ name: 'ר׳ משה כהן', city: 'ירושלים' })),
        crossScript: ids(findPersonMatches({ name: 'מרים כהן' })),
        tokens: nameTokens('הרב  משֶׁה כֹּהֵן'),
        unrelated: ids(findPersonMatches({ name: 'Rina Cohen', city: 'Haifa' })),
      };
    });
    const ok = r.phone.exact.includes('p_miriam') && r.email.exact.includes('p_miriam') && r.likelyCity.likely.includes('p_miriam') && !r.nameOnly.likely.length && r.nameOnly.similar.includes('p_miriam')
      && r.hebrewTitle.likely.includes('p_rich_heb1') && r.hebrewTitle.likely.includes('p_rich_heb2') && r.crossScript.similar.includes('p_miriam') && JSON.stringify(r.tokens) === JSON.stringify(['משה', 'כהנ']) && !r.unrelated.exact.length && !r.unrelated.likely.length;
    record('I02', 'Duplicate check: exact (phone/email in any format), likely (same name and city), similar (name only, Hebrew titles and points ignored, across scripts)', ok, r);
    await ctx.close();
  },

  async I03_not_the_same_is_remembered() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#qaShad');
    await page.fill('#fName', 'Miriam Katz'); await page.fill('#fPhone', '050-555-0101');
    await L.tap(page, '#overlay [data-act="save-person"]');
    await L.tap(page, '#overlay [data-act="identity-different"]');
    const st = await L.idbRead(page);
    const katz = st.people.find(p => p.name === 'Miriam Katz');
    const decided = st.identityDecisions.some(d => d.kind === 'not-same' && d.ids.includes(katz?.id) && d.ids.includes('p_miriam'));
    await L.openApp(page);
    await inPage(page, idv => { ui.detail = { type: 'person', id: idv }; ui.detailTab = 'details'; render(); }, katz.id);
    const hint = await page.$('.identity-hint');
    const again = await inPage(page, idv => findPersonMatches({ name: 'x', phone: '050-555-0101' }, { excludeId: idv }).exact.map(p => p.id), katz.id);
    const ok = !!katz && decided && !hint && !again.includes('p_miriam');
    record('I03', '"Not the same person" creates a separate record and is remembered: no hint, no question again', ok, { created: !!katz, decided, hintShown: !!hint, askedAgain: again });
    await ctx.close();
  },

  async I04_safe_merge_and_undo() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    // A duplicate Miriam with her own history, an open item, a place on a list and a shidduch role.
    const dupId = await inPage(page, async () => {
      const p = { id: 'p_dup_miriam', name: 'Miriam C.', types: ['Shadchan', 'Reference'], city: '', phone: '', email: '', occupation: 'Teacher', createdAt: iso(), folderIds: [] };
      data.people.push(p); rememberNotSame('p_dup_miriam', 'p_none');
      addEntry({ type: 'note', personIds: [p.id], about: [{ type: 'person', id: p.id }], text: 'Dup note before the merge.' });
      addOpenItem({ direction: 'them', personId: p.id, about: { type: 'person', id: p.id }, label: 'Dup item' });
      data.sources.find(s => s.id === 'src_event').lines.push({ id: 'line_dup', personId: p.id, text: 'Miriam C.' });
      data.rounds.find(r => r.id === 'round_david_noa_1').shadchanIds.push(p.id);
      await save(); return p.id;
    });
    const s0 = await L.idbRead(page);
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_miriam' }; render(); });
    await L.tap(page, '[data-act="detail-menu"]'); await L.tap(page, '#overlay [data-act="merge-sheet"]');
    await page.selectOption('#mergeOther', dupId); await L.tap(page, '#overlay [data-act="merge-chosen"]'); await L.tap(page, '#overlay [data-act="merge-confirm"]');
    const s1 = await L.idbRead(page);
    const view = await inPage(page, () => ({ history: entriesForPerson('p_miriam').map(e => e.text), items: openForPerson('p_miriam').map(x => x.label), listed: byType('Shadchan').some(p => p.id === 'p_dup_miriam'), source: sourcePeopleIds(source('src_event')), shidduchim: shidduchimForPerson('p_miriam').map(s => s.id), types: person('p_miriam').types, occupation: person('p_miriam').occupation }));
    const untouched = ['entries', 'openItems', 'sources', 'rounds'].every(c => s0[c].every(r => { const n = s1[c].find(x => x.id === r.id); return n && JSON.stringify(n) === JSON.stringify(r); }));
    const merged = s1.people.find(p => p.id === dupId)?.mergedIntoId === 'p_miriam' && s1.merges.length === 1;
    const viewOk = view.history.includes('Dup note before the merge.') && view.items.includes('Dup item') && !view.listed && view.source.filter(x => x === 'p_miriam').length === 1 && view.shidduchim.includes('sh_david_noa') && view.types.includes('Reference') && view.occupation === 'Teacher';
    // Work after the merge, then undo: the duplicate comes back whole, the new work stays with Miriam.
    await inPage(page, async () => { addEntry({ type: 'note', personIds: ['p_miriam'], about: [{ type: 'person', id: 'p_miriam' }], text: 'Note after the merge.' }); await save(); });
    const mergeId = s1.merges[0].id;
    await inPage(page, async idv => { await confirmUndoMerge(idv); }, mergeId);
    const s2 = await L.idbRead(page);
    const after = await inPage(page, () => ({ miriam: entriesForPerson('p_miriam').map(e => e.text), dup: entriesForPerson('p_dup_miriam').map(e => e.text), dupListed: byType('Shadchan').some(p => p.id === 'p_dup_miriam'), types: person('p_miriam').types, occupation: person('p_miriam').occupation || '' }));
    const undoOk = !s2.people.find(p => p.id === dupId).mergedIntoId && after.dup.includes('Dup note before the merge.') && after.miriam.includes('Note after the merge.') && !after.miriam.includes('Dup note before the merge.') && after.dupListed && !after.types.includes('Reference') && after.occupation === '' && s2.entries.length === s0.entries.length + 3;
    record('I04', 'Safe merge: one record shows both histories, items, lists and shidduchim with no record rewritten; Undo separates them and keeps work done after the merge', untouched && merged && viewOk && undoOk, { untouched, merged, view, after, entries: [s0.entries.length, s2.entries.length] });
    await ctx.close();
  },

  async I05_pair_sides_cannot_merge() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const r = await inPage(page, () => mergePeople('p_david', 'p_noa'));
    const st = await L.idbRead(page);
    record('I05', 'The guy and the girl of one shidduch can never be merged into one person', !!r.error && !st.people.some(p => p.mergedIntoId), { error: r.error });
    await ctx.close();
  },

  // ---- One ledger, open items --------------------------------------------------------------------
  async L01_ledger_written_once_shown_everywhere() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    // Leah's answer on Me – Leah, given on the shidduch page, heard through Miriam.
    await run(page, [...shidduchPath('sh_me_leah'), tab('overview')]);
    await L.tap(page, '[data-act="set-answer"][data-side="girl"]');
    await L.tap(page, '#overlay [data-answer-value="yes"]');
    await page.selectOption('#answerFrom', 'p_miriam');
    await L.tap(page, '#overlay [data-act="save-answer"]');
    const s1 = await L.idbRead(page);
    const added = s1.entries.filter(e => !s0.entries.some(x => x.id === e.id));
    const eid = added[0]?.id;
    const shown = await inPage(page, eid => {
      const out = {}; const count = () => document.querySelectorAll(`#app [data-entry="${eid}"]`).length;
      const show = (k, screen, detail, t) => { ui.screen = screen; ui.detail = detail; ui.detailTab = t || ''; render(); out[k] = count(); };
      show('recent', 'recent', null); show('leah', 'girls', { type: 'person', id: 'p_leah' }, 'conversation'); show('miriam', 'shadchanim', { type: 'person', id: 'p_miriam' }, 'conversation'); show('shidduch', 'shidduchim', { type: 'shidduch', id: 'sh_me_leah' }, 'history');
      ui.detail = null; ui.screen = 'recent'; render(); return out;
    }, eid);
    const answer = await inPage(page, () => roundAnswer(currentRound(shidduch('sh_me_leah')), 'girl'));
    const ok = added.length === 1 && Object.values(shown).every(n => n === 1) && answer === 'yes' && JSON.stringify(s1.rounds) === JSON.stringify(s0.rounds);
    record('L01', 'One moment is written once (one entry, one id) and shows once in Recent, both people\'s History and the shidduch\'s History; the round record is not rewritten', ok, { added: added.length, shown, answer });
    await ctx.close();
  },

  async L02_exact_item_closes() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await run(page, personPath('p_miriam', 'shadchan'));
    // Not needed: exactly that item closes, with an entry saying so.
    await L.tap(page, '.warm-contact.wait');
    await L.tap(page, '#overlay [data-act="item-not-needed"][data-item-id="oi2"]');
    const s1 = await L.idbRead(page);
    const oi2 = byId(s1.openItems, 'oi2');
    const notNeeded = oi2.status === 'closed' && oi2.closeKind === 'not-needed' && !!byId(s1.entries, oi2.closedByEntryId) && byId(s1.openItems, 'oi1').status === 'open';
    // Check in now: the item stays open; the message goes to the history.
    await L.tap(page, '.warm-contact.wait');
    await L.tap(page, '#overlay [data-act="item-check-in"][data-item-id="oi1"]');
    await L.settle(page);
    const s2 = await L.idbRead(page);
    const checkIn = byId(s2.openItems, 'oi1').status === 'open' && s2.entries.some(e => (e.changes || []).some(c => c.kind === 'item-checked-in' && c.itemId === 'oi1'));
    // A new to-do, then a call: the app names Miriam's open items and only the ticked one closes, by the call.
    await L.openApp(page); await run(page, personPath('p_miriam', 'shadchan'));
    await L.tap(page, '.warm-contact.wait');
    await page.selectOption('#wDirection', 'me'); await page.fill('#wLabel', 'Send two names');
    await L.tap(page, '#overlay [data-act="save-waiting"]');
    await L.tap(page, '[data-contact="call"]'); await L.settle(page);
    const listed = await page.$$eval('#overlay input[name="afterItem"]', els => els.map(e => e.value));
    await page.check('#overlay input[name="afterItem"][value="oi1"]');
    await L.tap(page, '#overlay [data-act="after-contact-save"]');
    const s3 = await L.idbRead(page);
    const call = s3.entries.find(e => e.type === 'call' && !s2.entries.some(x => x.id === e.id));
    const oi1 = byId(s3.openItems, 'oi1'), todo = s3.openItems.find(x => x.label === 'Send two names');
    const afterCall = listed.includes('oi1') && listed.includes(todo?.id) && oi1.status === 'closed' && oi1.closedByEntryId === call?.id && todo?.status === 'open';
    record('L02', 'Open items: Not needed and Heard back close exactly the chosen item; Check in now keeps it open; after a call the app names the open items and only the ticked one closes, linked to that call', notNeeded && checkIn && afterCall, { notNeeded, checkIn, listed, afterCall });
    await ctx.close();
  },

  async L03_delete_is_only_for_plain_entries_and_reversible() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const ids = await inPage(page, async () => { const n = addEntry({ type: 'note', personIds: ['p_rivka'], about: [{ type: 'person', id: 'p_rivka' }], text: 'Plain note to delete.' }); await save(); return { note: n.id, changing: data.entries.find(e => (e.changes || []).some(c => !['profile-sent', 'item-checked-in'].includes(c.kind)))?.id }; });
    await inPage(page, idv => { ui.detail = { type: 'entry', id: idv }; render(); }, ids.changing);
    const changingHasDelete = !!(await page.$('#app [data-act="delete-entry"]'));
    await inPage(page, idv => { ui.detail = { type: 'entry', id: idv }; render(); }, ids.note);
    await L.tap(page, '#app [data-act="delete-entry"]');
    const s1 = await L.idbRead(page);
    const hidden = await inPage(page, idv => !entriesForPerson('p_rivka').some(e => e.id === idv), ids.note);
    await page.evaluate(() => document.querySelector('#toast [data-act="restore-entry"]').click()); await L.settle(page); await page.waitForTimeout(200);
    const s2 = await L.idbRead(page);
    const ok = !changingHasDelete && !!byId(s1.entries, ids.note)?.deletedAt && hidden && !byId(s2.entries, ids.note).deletedAt && byId(s2.entries, ids.note).text === 'Plain note to delete.';
    record('L03', 'A plain activity can be deleted (kept, hidden) and restored with Undo; an activity that changed a record cannot be deleted', ok, { changingHasDelete, softDeleted: !!byId(s1.entries, ids.note)?.deletedAt, hidden, restored: !byId(s2.entries, ids.note).deletedAt });
    await ctx.close();
  },

  // ---- Offers ------------------------------------------------------------------------------------
  async O01_not_applicable_makes_no_shidduch() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const s0 = await L.idbRead(page);
    // Miriam offers Tamar for me.
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay [data-add="offer"]');
    await page.selectOption('#iGuy', 'p_me'); await page.selectOption('#iGirl', 'p_tamar'); await page.selectOption('#iBy', 'p_miriam');
    await L.tap(page, '#overlay [data-act="save-idea"]');
    const s1 = await L.idbRead(page);
    const offer = s1.ideas.find(i => !s0.ideas.some(x => x.id === i.id));
    const answerItem = s1.openItems.find(x => x.about?.type === 'idea' && x.about.id === offer?.id);
    await inPage(page, idv => ideaSheet(idv), offer.id);
    await L.tap(page, '#overlay [data-act="idea-no"]');
    await page.fill('#ideaReason', 'PRIVATE-REASON-123');
    await L.tap(page, '#overlay [data-act="idea-no-save"]');
    const s2 = await L.idbRead(page);
    const o = byId(s2.ideas, offer.id), item = byId(s2.openItems, answerItem?.id);
    const noShidduch = s2.shidduchim.length === s0.shidduchim.length && s2.rounds.length === s0.rounds.length;
    const reasonPrivate = o.privateReason === 'PRIVATE-REASON-123' && !s2.entries.some(e => JSON.stringify(e).includes('PRIVATE-REASON-123'));
    const stillOwed = item?.status === 'open' && item.direction === 'me' && /Tell Miriam/.test(item.label) && item.personId === 'p_miriam';
    const ok = o.status === 'not-applicable' && noShidduch && reasonPrivate && stillOwed;
    record('O01', 'Not applicable closes the offer, keeps the reason privately on the offer only, creates no shidduch or round, and leaves "Tell Miriam" open on the right person', ok, { status: o.status, noShidduch, reasonPrivate, item: item && { label: item.label, status: item.status, personId: item.personId } });
    await ctx.close();
  },

  async O02_interested_once() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    await inPage(page, () => ideaSheet('idea_moshe_tamar'));
    await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="idea-yes"]'); b.click(); b.click(); b.click(); });
    await L.settle(page); await page.waitForTimeout(300); await L.closeSheets(page);
    const s1 = await L.idbRead(page);
    const newSh = s1.shidduchim.filter(s => !s0.shidduchim.some(x => x.id === s.id)), newR = s1.rounds.filter(r => !s0.rounds.some(x => x.id === r.id));
    const newE = s1.entries.filter(e => !s0.entries.some(x => x.id === e.id));
    const otherSide = s1.openItems.filter(x => x.kind === 'other-side' && x.about?.id === newSh[0]?.id);
    // The same pair offered again while its round is in progress: the round continues, nothing new is made.
    await inPage(page, async () => { data.ideas.push({ id: 'idea_again', guyId: 'p_moshe', girlId: 'p_tamar', suggestedByPersonId: 'p_dina', createdAt: iso(), status: 'open' }); await save(); });
    await inPage(page, () => ideaSheet('idea_again')); await L.tap(page, '#overlay [data-act="idea-yes"]'); await L.closeSheets(page);
    const s2 = await L.idbRead(page);
    const r = s2.rounds.find(x => x.id === newR[0]?.id);
    const ok = newSh.length === 1 && newR.length === 1 && newR[0].number === 1 && newE.length === 1 && byId(s1.ideas, 'idea_moshe_tamar').status === 'interested' && otherSide.length === 1 && otherSide[0].personId === 'p_rivka'
      && s2.shidduchim.length === s1.shidduchim.length && s2.rounds.length === s1.rounds.length && r.status === 'active' && r.shadchanIds.includes('p_dina') && byId(s2.ideas, 'idea_again').shidduchId === newSh[0].id;
    record('O02', 'Interested (even tapped 3 times) makes one shidduch, Round 1 and one entry, and asks Rivka for the other side; the same pair offered again continues that round', ok, { shidduchim: newSh.length, rounds: newR.length, entries: newE.length, otherSide: otherSide.map(x => x.personId), secondOffer: { shidduchim: s2.shidduchim.length - s1.shidduchim.length, rounds: s2.rounds.length - s1.rounds.length, shadchanIds: r?.shadchanIds } });
    await ctx.close();
  },

  async O03_round_two_keeps_round_one() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay [data-add="offer"]');
    await page.selectOption('#iGuy', 'p_ari'); await page.selectOption('#iGirl', 'p_rina'); await page.selectOption('#iBy', 'p_dina');
    await L.tap(page, '#overlay [data-act="save-idea"]');
    const s1 = await L.idbRead(page);
    const offer = s1.ideas.find(i => !s0.ideas.some(x => x.id === i.id));
    await inPage(page, idv => ideaSheet(idv), offer.id);
    const again = await page.$eval('#overlay', o => o.querySelector('.offer-again')?.textContent || '');
    await L.tap(page, '#overlay [data-act="idea-yes"]'); await L.closeSheets(page);
    const s2 = await L.idbRead(page);
    const r2 = s2.rounds.find(r => !s0.rounds.some(x => x.id === r.id));
    const r1Same = JSON.stringify(byId(s2.rounds, 'round_ari_rina_1')) === JSON.stringify(byId(s0.rounds, 'round_ari_rina_1'));
    await run(page, [...shidduchPath('sh_ari_rina'), tab('history')]);
    const folded = await page.$$eval('#app .earlier-round', els => els.map(e => e.textContent));
    const ok = /Round 1/.test(again) && s2.shidduchim.length === s0.shidduchim.length && r2?.shidduchId === 'sh_ari_rina' && r2.number === 2 && r2.status === 'active' && r1Same && folded.length === 1 && /Round 1/.test(folded[0]);
    record('O03', 'An ended pair offered again shows "Suggested again"; Interested opens Round 2 on the same shidduch, Round 1 stays exactly as it was and is folded below', ok, { again, round2: r2 && { shidduchId: r2.shidduchId, number: r2.number, status: r2.status }, r1Same, folded });
    await ctx.close();
  },

  async O04_link_earlier_is_privacy_safe() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const ids = await inPage(page, async () => {
      const at = '2026-09-01T10:00:00.000Z';
      const mine = addEntry({ at, type: 'message', channel: 'WhatsApp', direction: 'out', fromPersonId: 'p_me', toPersonId: 'p_leah', about: [{ type: 'person', id: 'p_leah' }], text: 'Me and Leah, my own.' });
      const viaMiriam = addEntry({ at, type: 'message', direction: 'in', fromPersonId: 'p_miriam', toPersonId: 'p_me', about: [{ type: 'person', id: 'p_leah' }], text: 'Miriam about Leah, for me.' });
      const david = addEntry({ at, type: 'call', direction: 'in', fromPersonId: 'p_rivka', toPersonId: 'p_me', about: [{ type: 'person', id: 'p_david' }], text: 'Rivka about David.' });
      const otherSingle = addEntry({ at, type: 'note', personIds: ['p_david', 'p_noa'], about: [{ type: 'person', id: 'p_david' }], text: 'David and Noa.' });
      const priv = addEntry({ at, type: 'note', personIds: ['p_david'], about: [{ type: 'person', id: 'p_david' }], text: 'Private about David.', private: true });
      data.ideas.push({ id: 'idea_david_leah', guyId: 'p_david', girlId: 'p_leah', suggestedByPersonId: 'p_rivka', createdAt: iso(), status: 'open' });
      await save(); return { mine: mine.id, viaMiriam: viaMiriam.id, david: david.id, otherSingle: otherSingle.id, priv: priv.id };
    });
    await inPage(page, () => ideaSheet('idea_david_leah')); await L.tap(page, '#overlay [data-act="idea-yes"]'); await L.settle(page);
    const offered = await page.$$eval('#overlay input[name="linkEntry"]', els => els.map(e => e.value));
    const before = (await L.idbRead(page)).entries.find(e => e.id === ids.david);
    await page.check(`#overlay input[name="linkEntry"][value="${ids.david}"]`);
    await L.tap(page, '#overlay [data-act="link-earlier-save"]');
    const st = await L.idbRead(page);
    const sh = st.shidduchim.find(s => s.guyId === 'p_david' && s.girlId === 'p_leah'), linked = byId(st.entries, ids.david);
    const safe = offered.includes(ids.david) && ![ids.mine, ids.viaMiriam, ids.otherSingle, ids.priv].some(x => offered.includes(x));
    const linkedOk = !!sh && linked.about.some(a => a.type === 'shidduch' && a.id === sh.id) && linked.text === before.text && linked.at === before.at && linked.corrections?.length === 1;
    const pageOwn = await inPage(page, sid => entriesForShidduch(sid).map(e => e.id), sh?.id);
    record('O04', 'After Interested on David – Leah, earlier entries are offered only when safe: nothing between Me and Leah (my own shidduch), nothing private, nothing with another single; linking keeps the words and time', safe && linkedOk && !pageOwn.includes(ids.mine), { offered: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, offered.includes(v)])), linkedOk });
    await ctx.close();
  },

  // ---- Dates ----------------------------------------------------------------------------------------
  async D01_one_date_id_through_every_change() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    await run(page, [...shidduchPath('sh_david_noa'), tab('dates')]);
    await L.tap(page, '[data-act="add-date"]');
    await page.fill('#dateWhen', '2026-10-12T19:00');
    await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="save-new-date"]'); b.click(); b.click(); });
    await L.settle(page); await page.waitForTimeout(200);
    const s1 = await L.idbRead(page);
    const added = s1.dates.filter(d => !s0.dates.some(x => x.id === d.id)), did = added[0]?.id;
    await L.tap(page, `[data-date="${did}"]`); await page.fill('#dateWhen', '2026-10-14T20:30'); await L.tap(page, '#overlay [data-act="date-move"]');
    await L.tap(page, `[data-date="${did}"]`); await L.tap(page, '#overlay [data-act="date-happened"]');
    const s2 = await L.idbRead(page);
    const fbItems = s2.openItems.filter(x => x.kind === 'date-feedback' && x.about?.id === did);
    // Feedback for this date and this side closes exactly that item.
    await page.selectOption('#dateFb_guy', 'positive'); await L.tap(page, '#overlay [data-act="date-feedback"]');
    const s3 = await L.idbRead(page);
    const st = await inPage(page, idv => { const s = dateState(dateById(idv)); return { when: s.when, status: s.status, guy: s.guy, girl: s.girl }; }, did);
    const aboutDate = s3.entries.filter(e => (e.about || []).some(a => a.type === 'date' && a.id === did));
    const guyItem = fbItems.find(x => x.side === 'guy'), girlItem = fbItems.find(x => x.side === 'girl');
    const otherDatesSame = s0.dates.every(d => JSON.stringify(byId(s3.dates, d.id)) === JSON.stringify(d));
    const ok = added.length === 1 && s3.dates.length === s0.dates.length + 1 && new Date(st.when).getTime() === new Date('2026-10-14T20:30:00+03:00').getTime() && st.status === 'happened' && st.guy === 'positive' && aboutDate.length === 4
      && fbItems.length === 2 && byId(s3.openItems, guyItem.id).status === 'closed' && byId(s3.openItems, girlItem.id).status === 'open' && otherDatesSame && JSON.stringify(byId(s3.dates, did)) === JSON.stringify(byId(s1.dates, did));
    record('D01', 'A date keeps one Date ID when added (double tap), moved, marked happened and given feedback; feedback closes exactly that date\'s item for that side; other dates are untouched', ok, { added: added.length, state: st, entriesAboutDate: aboutDate.length, feedbackItems: fbItems.map(x => x.side + ':' + byId(s3.openItems, x.id).status), otherDatesSame });
    await ctx.close();
  },

  async D02_thinking_blocks_dates() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await run(page, [...shidduchPath('sh_me_leah'), tab('dates')]);
    const blocked = !(await page.$('#app [data-act="add-date"]')) && !!(await page.$('#app .zm-add-date-note'));
    await run(page, [tab('overview')]);
    await L.tap(page, '[data-act="set-answer"][data-side="girl"]'); await L.tap(page, '#overlay [data-answer-value="yes"]'); await L.tap(page, '#overlay [data-act="save-answer"]');
    await run(page, [tab('dates')]);
    const open = !!(await page.$('#app [data-act="add-date"]'));
    record('D02', 'While a side is Thinking no date can be added; once both say Yes, Add date appears', blocked && open, { blocked, open });
    await ctx.close();
  },

  // ---- Profiles and sending ------------------------------------------------------------------------
  async P01_profile_versions_are_frozen() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const s0 = await L.idbRead(page);
    const editProfile = async text => { await inPage(page, () => { ui.detail = { type: 'person', id: 'p_me' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="detail-menu"]'); await L.tap(page, '#overlay [data-act="edit-person"]'); await page.fill('#epProfile', text); await L.tap(page, '#overlay [data-act="save-edit-person"]'); };
    await editProfile('Profile text A.');
    const s1 = await L.idbRead(page);
    const vA = s1.profileVersions.find(v => !s0.profileVersions.some(x => x.id === v.id));
    // Send version A to Batya, then edit again: the send still points to A, and A never changes.
    await inPage(page, () => sendProfileSheet(me().id, 'p_batya'));
    await page.fill('#sendWords', 'Hello Batya.'); await page.dispatchEvent('#sendWords', 'input');
    const preview = await page.$eval('#sendPreview', e => e.textContent);
    await page.evaluate(() => { const b = document.querySelector('#overlay [data-send="copy"]'); b.click(); b.click(); });
    await L.settle(page); await page.waitForTimeout(200);
    await editProfile('Profile text B.');
    const s2 = await L.idbRead(page);
    const sends = s2.entries.filter(e => e.type === 'profile' && e.direction === 'out' && !s0.entries.some(x => x.id === e.id));
    const vB = s2.profileVersions.find(v => v.id !== vA?.id && !s0.profileVersions.some(x => x.id === v.id));
    const send = sends[0];
    const oldSame = s0.profileVersions.every(v => JSON.stringify(byId(s2.profileVersions, v.id)) === JSON.stringify(v)) && JSON.stringify(byId(s2.profileVersions, vA.id)) === JSON.stringify(vA);
    await inPage(page, idv => { ui.detail = { type: 'entry', id: idv }; render(); }, send?.id);
    const shownSent = await page.$eval('#app', a => a.querySelector('.entry-sent .profile-text')?.textContent || '');
    const status = await inPage(page, () => myProfileStatus('p_batya'));
    const ok = vA?.text === 'Profile text A.' && vB?.text === 'Profile text B.' && vB.number === vA.number + 1 && oldSame && sends.length === 1 && send.profileVersionId === vA.id && send.sentText === 'Hello Batya.\n\nProfile text A.' && preview === send.sentText && shownSent === send.sentText && status === `Has v${vA.number} · v${vB.number} ready`;
    record('P01', 'Each profile edit makes a new frozen version; a send (double tap = one) records the exact version and words, and still shows what was sent after later edits', ok, { versions: [vA?.number, vB?.number], oldSame, sends: sends.length, sentVersion: send?.profileVersionId === vA?.id, sentText: send?.sentText, status });
    await ctx.close();
  },

  async P02_only_chosen_parts_are_sent() {
    const { ctx, page } = await fresh({ mode: 'single' });
    await inPage(page, async () => {
      data.files.push({ id: 'file_resume', personId: 'p_me', name: 'resume.pdf', mime: 'application/pdf', createdAt: iso() }, { id: 'file_photo', personId: 'p_me', name: 'photo.jpg', mime: 'image/jpeg', createdAt: iso() });
      addEntry({ type: 'note', personIds: ['p_me', 'p_leah'], about: [{ type: 'person', id: 'p_leah' }], text: 'SECRET-NOTE-1', private: true });
      data.ideas.find(i => i.id === 'idea_me_leah').privateReason = 'SECRET-REASON-2';
      await save();
    });
    await inPage(page, () => sendProfileSheet(me().id, 'p_miriam'));
    await page.check('#overlay input[name="sendFile"][value="file_resume"]');
    await page.fill('#sendWords', 'For the Cohen idea.'); await page.dispatchEvent('#sendWords', 'input');
    const preview = await page.$eval('#sendPreview', e => e.textContent);
    await L.tap(page, '#overlay [data-send="copy"]'); await L.settle(page);
    const st = await L.idbRead(page);
    const send = st.entries.filter(e => e.type === 'profile').pop();
    const version = byId(st.profileVersions, send.profileVersionId);
    const leaked = ['SECRET-NOTE-1', 'SECRET-REASON-2'].some(s => preview.includes(s) || send.sentText.includes(s));
    const ok = JSON.stringify(send.fileIds) === JSON.stringify(['file_resume']) && send.sentText === `For the Cohen idea.\n\n${version.text}` && preview === `${send.sentText}\n\nFiles: resume.pdf` && !leaked;
    record('P02', 'A send carries only the chosen version, the ticked files and my words: no notes, private reasons or other files', ok, { fileIds: send.fileIds, leaked, preview: preview.slice(0, 120) });
    await ctx.close();
  },

  // ---- Sources and lists ---------------------------------------------------------------------------
  async S01_same_human_from_several_sources() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const addSource = async (name, kind, from, text) => {
      await run(page, [nav('shadchanim'), seg('shadchanim', 'sources')]); await L.tap(page, '[data-act="add-source"]');
      await page.fill('#sName', name); await page.selectOption('#sKind', kind); if (from) await page.selectOption('#sFrom', from); await page.fill('#sText', text);
      await L.tap(page, '#overlay [data-act="save-source"]');
      return inPage(page, () => ui.detail.id);
    };
    const listText = 'Chana Feld 050-000-7001\nYael Brill';
    const a = await addSource("Rivka's new names", 'list', 'p_rivka', listText);
    const lineA = await inPage(page, sid => source(sid).lines[0].id, a);
    await L.tap(page, `[data-act="source-line"][data-line-id="${lineA}"]`);
    const guessed = await page.$eval('#lName', e => e.value) + ' | ' + await page.$eval('#lPhone', e => e.value);
    await L.tap(page, '#overlay [data-act="save-list-person"]');
    // The same woman at an event, written another way.
    const b = await addSource('Wedding in Haifa', 'event', '', 'Chana Feld +972 50-000-7001');
    const lineB = await inPage(page, sid => source(sid).lines[0].id, b);
    await L.tap(page, `[data-act="source-line"][data-line-id="${lineB}"]`);
    await L.tap(page, '#overlay [data-act="save-list-person"]');
    const asked = !!(await page.$('#overlay [data-act="identity-same"]'));
    if (asked) await L.tap(page, '#overlay [data-act="identity-same"]');
    // And once more from a third source's Add button, by name and phone in a local format.
    const c = await addSource('Sarah’s list', 'list', '', '');
    await L.tap(page, '[data-act="source-add-person"]'); await page.fill('#lName', 'Chana Feld'); await page.fill('#lPhone', '0500007001');
    await L.tap(page, '#overlay [data-act="save-list-person"]'); if (await page.$('#overlay [data-act="identity-same"]')) await L.tap(page, '#overlay [data-act="identity-same"]');
    const st = await L.idbRead(page);
    const chanas = st.people.filter(p => p.name === 'Chana Feld' && !p.mergedIntoId);
    const srcs = [a, b, c].map(x => byId(st.sources, x));
    const sameId = chanas.length === 1 && srcs.every(s => s.lines.some(l => l.personId === chanas[0].id));
    const textsKept = srcs[0].originalText === listText && srcs[0].lines.map(l => l.text).join('\n') === listText && srcs[1].lines[0].text === 'Chana Feld +972 50-000-7001';
    const howKnown = await inPage(page, pid => sourcesForPerson(pid).map(s => s.name), chanas[0]?.id);
    const ok = sameId && asked && textsKept && howKnown.length === 3 && guessed === 'Chana Feld | 050-000-7001' && srcs[0].lines[1].personId == null;
    record('S01', 'The same human from a list, an event and another list stays one Person (asked "same person?"); every line keeps its original words; How I know her lists all three', ok, { people: chanas.length, asked, textsKept, howKnown, guessed });
    await ctx.close();
  },

  async S02_list_progress_comes_from_the_ledger() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const stats = () => inPage(page, () => sourceStats(source('src_rivka10')));
    await run(page, [nav('shadchanim'), seg('shadchanim', 'sources'), ['tap', '[data-source="src_rivka10"]']]);
    const w0 = await writes(page); const s0 = await stats(); const items0 = (await L.idbRead(page)).openItems.length;
    const renderWrites = (await writes(page)) - w0;
    // Call Sarah Deutsch from her own page: the list counts change with no action on the list.
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_s_2' }; ui.detailTab = 'details'; render(); });
    await L.tap(page, '[data-contact="call"]'); await L.settle(page); await L.closeSheets(page);
    const s1 = await stats();
    const st1 = await L.idbRead(page);
    const fu = st1.openItems.filter(x => x.kind === 'list-follow-up' && x.about?.id === 'src_rivka10');
    const quiet = await inPage(page, () => { ui.detail = null; ui.screen = 'recent'; render(); return [...document.querySelectorAll('#app .zm-todo-card strong')].map(e => e.textContent); });
    // Eight days later the one follow-up is due and shows in My to-do (and Time to contact).
    await page.clock.setFixedTime(new Date(L.FIXED_TIME.getTime() + 8 * 86400000));
    const due = await inPage(page, () => { render(); return { todo: [...document.querySelectorAll('#app .zm-todo-card strong')].map(e => e.textContent), needs: needsContactPerson(person('p_s_2')) }; });
    // She answers: replied goes up, from the ledger.
    await inPage(page, () => addActivitySheet('p_s_2')); await page.selectOption('#aType', 'message'); await page.selectOption('#aWho', 'in'); await page.fill('#aText', 'Sarah answered.');
    await L.tap(page, '#overlay [data-act="save-activity"]');
    const s2 = await stats();
    const ok = renderWrites === 0 && s1.contacted === s0.contacted + 1 && s1.notContacted === s0.notContacted - 1 && fu.length === 1 && fu[0].personId === null && !quiet.some(t => /Follow up/.test(t)) && due.todo.some(t => /Follow up on/.test(t)) && s2.replied === s1.replied + 1 && st1.openItems.length === items0 + 1;
    record('S02', 'A list updates itself: a call from the person\'s page counts as contacted, a reply as replied; one quiet follow-up for the whole list opens with the contact (not by showing the list) and shows only when due', ok, { renderWrites, before: s0, afterCall: s1, afterReply: s2, followUps: fu.length, dueTodo: due.todo });
    await ctx.close();
  },

  // ---- References and links -----------------------------------------------------------------------
  async R01_references_are_people_with_links() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    const addLink = async (kind, name, phone) => { await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="add-link"]'); await page.selectOption('#kKind', kind); await page.fill('#kName', name); await page.fill('#kPhone', phone); await L.tap(page, '#overlay [data-act="save-link"]'); };
    await addLink('mother', 'Rachel Rosen', '050-000-7002');
    // Miriam, already here, as a reference: the matching check finds her; no second record.
    await addLink('reference', 'Miriam C', '+972 50 555 0101');
    if (await page.$('#overlay [data-act="identity-same"]')) await L.tap(page, '#overlay [data-act="identity-same"]');
    const st = await L.idbRead(page);
    const rachel = st.people.find(p => p.name === 'Rachel Rosen');
    const links = st.links.filter(l => l.bId === 'p_leah');
    const miriam = byId(st.people, 'p_miriam');
    const leahCard = await page.$$eval('#app .link-open b', els => els.map(e => e.textContent));
    await inPage(page, idv => { ui.detail = { type: 'person', id: idv }; ui.detailTab = 'profile'; render(); }, rachel?.id);
    const rachelCard = await page.$$eval('#app .link-open span', els => els.map(e => e.textContent));
    await run(page, [...shidduchPath('sh_me_leah'), tab('people')]);
    const shPeople = await page.$eval('#app', a => a.textContent);
    // Remove, then Undo.
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'profile'; render(); });
    const rid = links.find(l => l.aId === rachel?.id)?.id;
    await L.tap(page, `[data-act="remove-link"][data-link-id="${rid}"]`);
    const removed = !!byId((await L.idbRead(page)).links, rid)?.removedAt;
    await page.evaluate(() => document.querySelector('#toast [data-act="restore-link"]').click()); await L.settle(page); await page.waitForTimeout(150);
    const back = !byId((await L.idbRead(page)).links, rid)?.removedAt;
    const ok = !!rachel && (rachel.types || []).length === 0 && st.people.length === s0.people.length + 1 && links.length === 2 && links.some(l => l.aId === 'p_miriam' && l.kind === 'reference') && miriam.types.includes('Reference') && miriam.types.includes('Shadchan')
      && leahCard.includes('Rachel Rosen') && leahCard.includes('Miriam Cohen') && rachelCard.some(t => /Mother of Leah/.test(t)) && /References and family/.test(shPeople) && /Rachel Rosen/.test(shPeople) && removed && back;
    record('R01', 'References and family are normal people linked to the single (no extra list or tab): shown on both pages and on the shidduch\'s People tab; someone already here is reused and gets the Reference role; removing a link has Undo', ok, { newPeople: st.people.length - s0.people.length, links: links.map(l => `${l.kind}:${l.aId}`), miriamTypes: miriam.types, leahCard, rachelCard, removed, back });
    await ctx.close();
  },

  // ---- Files ---------------------------------------------------------------------------------------
  async F01_files_are_stored_once_and_backed_up() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const bytes = Buffer.from('%PDF-1.4 made-up test file');
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'files'; render(); });
    await page.setInputFiles('#personFiles', { name: 'leah-resume.pdf', mimeType: 'application/pdf', buffer: bytes });
    await L.settle(page); await page.waitForTimeout(300);
    const st = await L.idbRead(page);
    const f = st.files.find(x => x.name === 'leah-resume.pdf');
    const blob = await page.evaluate(fid => new Promise(r => { const q = indexedDB.open('ZivugMatchDB'); q.onsuccess = () => { const g = q.result.transaction('blobs').objectStore('blobs').get(fid); g.onsuccess = async () => { const b = g.result; q.result.close(); r(b ? await b.text() : null); }; }; }), f?.id);
    const row = await page.$(`#app [data-act="open-file"][data-file-id="${f?.id}"]`);
    await L.tap(page, `#app [data-act="open-file"][data-file-id="${f?.id}"]`);
    const opened = !!(await page.$('#overlay a[download="leah-resume.pdf"]'));
    // The backup carries the file's content; another device gets it back.
    await L.closeSheets(page); await L.tap(page, '[data-act="back"]').catch(() => {});
    await inPage(page, () => { ui.detail = null; ui.screen = 'recent'; render(); });
    await L.tap(page, '[data-act="settings"]');
    const file = await download(page, '#overlay [data-act="export-backup"]');
    const second = await L.newPage(browser, BASE, L.WIDTHS.phone);
    await L.idbWrite(second.page, FIX('demo')); await L.openApp(second.page); await L.tap(second.page, '[data-act="settings"]');
    await second.page.setInputFiles('#backupFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(file) });
    await L.settle(second.page); await second.page.waitForTimeout(300);
    const restored = await second.page.evaluate(fid => new Promise(r => { const q = indexedDB.open('ZivugMatchDB'); q.onsuccess = () => { const g = q.result.transaction('blobs').objectStore('blobs').get(fid); g.onsuccess = async () => { const b = g.result; q.result.close(); r(b ? await b.text() : null); }; }; }), f?.id);
    // Delete keeps it for Undo.
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'files'; render(); });
    await L.tap(page, `#app [data-act="open-file"][data-file-id="${f?.id}"]`); await L.tap(page, '#overlay [data-act="delete-file"]');
    const hidden = !(await page.$(`#app [data-file-id="${f?.id}"]`));
    await page.evaluate(() => document.querySelector('#toast [data-act="restore-file"]').click()); await L.settle(page); await page.waitForTimeout(150);
    const back = !!(await page.$(`#app [data-file-id="${f?.id}"]`));
    const ok = !!f && f.personId === 'p_leah' && f.mime === 'application/pdf' && blob === bytes.toString() && !!row && opened && JSON.parse(file).blobs?.[f.id]?.startsWith('data:') && restored === bytes.toString() && hidden && back;
    record('F01', 'A file added on the Files tab is stored once with its content, opens when tapped, is carried by the backup to another device, and Delete has Undo', ok, { file: f && { name: f.name, personId: f.personId }, stored: blob === bytes.toString(), opened, inBackup: !!JSON.parse(file).blobs?.[f?.id], restored: restored === bytes.toString(), hidden, back });
    await second.ctx.close(); await ctx.close();
  },

  // ---- Intake --------------------------------------------------------------------------------------
  async N02_intake_list_from_paste() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const text = 'Rivka Stern: names for you\nChana Feld 050-000-7001\nYael Brill';
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay [data-add="paste"]');
    await page.fill('#pasteText', text); await L.tap(page, '#overlay [data-act="save-paste"]');
    const filingOpen = !!(await page.$('#overlay [data-act="save-filing"]'));
    await L.closeSheets(page);
    const waiting = await inPage(page, () => { ui.detail = null; ui.screen = 'recent'; render(); return { row: document.querySelector('#app .to-file-row strong')?.textContent, inHistory: liveEntries().some(e => e.channel === 'Pasted') }; });
    await L.tap(page, '#app [data-act="intake"]'); await L.tap(page, '#overlay [data-act="file-entry"]');
    const guess = await page.$eval('#fileFrom', e => e.value);
    await L.tap(page, '#overlay [data-file-kind="list"]'); await page.fill('#fileListName', "Rivka's new names");
    await L.tap(page, '#overlay [data-act="save-filing"]');
    const st = await L.idbRead(page);
    const e = st.entries.find(x => x.channel === 'Pasted');
    const src = st.sources.find(s => s.name === "Rivka's new names");
    const after = await inPage(page, eid => ({ row: !!document.querySelector('#app .to-file-row'), time: document.querySelector(`#app [data-entry="${eid}"] time`)?.textContent }), e?.id);
    const ok = filingOpen && waiting.row === '1' && !waiting.inHistory && guess === 'p_rivka' && !e.toFile && e.text === text && e.at === null && !!e.pastedAt && e.fromPersonId === 'p_rivka' && e.about.some(a => a.type === 'source' && a.id === src?.id) && e.corrections?.[0]?.field === 'filed'
      && src.fromPersonId === 'p_rivka' && src.entryId === e.id && src.originalText === text && src.lines.length === 3 && !after.row && after.time === 'Pasted';
    record('N02', 'Paste: the message waits in To file (shown on Recent only then, not in History); filing it as a list from Rivka (guessed) makes the source from the exact words; no time is invented ("Pasted")', ok, { filingOpen, waiting, guess, entry: e && { at: e.at, from: e.fromPersonId, toFile: !!e.toFile }, source: src && { lines: src.lines.length, from: src.fromPersonId }, after });
    await ctx.close();
  },

  async N03_intake_idea_with_photo() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const s0 = await L.idbRead(page);
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay [data-add="paste"]');
    await page.fill('#pasteText', 'Miriam Cohen: an idea for you, Shira Katz from Haifa.');
    await page.setInputFiles('#pasteFiles', { name: 'shira.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('made-up image') });
    await L.tap(page, '#overlay [data-act="save-paste"]');
    await L.tap(page, '#overlay [data-file-kind="idea"]');
    await page.selectOption('#fileIdeaWho', '__new'); await page.fill('#fileIdeaName', 'Shira Katz');
    await L.tap(page, '#overlay [data-act="save-filing"]');
    const st = await L.idbRead(page);
    const shira = st.people.find(p => p.name === 'Shira Katz');
    const i = st.ideas.find(x => x.girlId === shira?.id);
    const item = st.openItems.find(x => x.about?.type === 'idea' && x.about.id === i?.id);
    const photo = st.files.find(f => f.name === 'shira.jpg');
    const ok = !!shira && shira.types.includes('Girl') && i?.guyId === 'p_me' && i.suggestedByPersonId === 'p_miriam' && i.status === 'open' && item?.personId === 'p_miriam' && item.direction === 'me' && photo?.personId === shira.id && st.shidduchim.length === s0.shidduchim.length;
    record('N03', 'Filing a pasted idea for me: the suggested girl gets one record (through the matching check), the offer is from Miriam with "answer Miriam" waiting on me, her photo goes on her record, and no shidduch is made', ok, { shira: !!shira, idea: i && { status: i.status, by: i.suggestedByPersonId }, item: item?.label, photoTo: photo?.personId === shira?.id, shidduchim: st.shidduchim.length - s0.shidduchim.length });
    await ctx.close();
  },

  // ---- Folders -------------------------------------------------------------------------------------
  async G01_folders_label_people_and_filter_views() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await run(page, personPath('p_miriam', 'shadchan')); await L.tap(page, '[data-act="detail-menu"]'); await L.tap(page, '#overlay [data-act="folders"]');
    await page.fill('#newFolder', 'Top'); await L.tap(page, '#overlay [data-act="save-folders"]');
    const st = await L.idbRead(page);
    const folder = st.folders.find(f => f.name === 'Top');
    await run(page, [nav('shadchanim'), seg('shadchanim', 'all')]);
    const w0 = await writes(page);
    await L.tap(page, '[data-act="filters"]'); await L.tap(page, `#overlay [data-folder-view="${folder?.id}"]`);
    const shown = await page.$$eval('#app [data-person]', els => [...new Set(els.map(e => e.dataset.person))]);
    await L.tap(page, '#app .folder-note [data-folder-view=""]');
    const all = await page.$$eval('#app [data-person]', els => new Set(els.map(e => e.dataset.person)).size);
    const w1 = await writes(page);
    const ok = !!folder && byId(st.people, 'p_miriam').folderIds.includes(folder.id) && JSON.stringify(shown) === '["p_miriam"]' && all > 10 && w1 === w0;
    record('G01', 'A folder is a label on a person (from ⋯); choosing it in a list shows only those people, Show all brings everyone back, and the view writes nothing', ok, { folder: folder?.name, shown, all, writes: w1 - w0 });
    await ctx.close();
  },

  // ---- Showing never writes ------------------------------------------------------------------------
  async N01_new_sheets_and_search_write_nothing() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const w0 = await writes(page); const s0 = await L.idbRead(page);
    const steps = [
      () => sendProfileSheet(me().id, 'p_miriam'), () => profileVersionsSheet('p_me'), () => answerSheet('sh_me_leah', 'girl'), () => addDateSheet('sh_david_noa'), () => dateSheet('date_david_noa_2'),
      () => notApplicableSheet('idea_moshe_tamar'), () => ideaSheet('idea_me_leah'), () => waitingSheet('p_miriam'), () => afterContactSheet('p_miriam', null), () => { ui.detail = { type: 'shidduch', id: 'sh_ari_rina' }; ui.detailTab = 'history'; render(); toggleRound('round_ari_rina_1'); },
    ];
    for (let i = 0; i < steps.length; i++) { await page.evaluate(`(${steps[i].toString()})()`); await L.settle(page); await L.closeSheets(page); }
    for (const screen of ['girls', 'guys', 'shadchanim']) { await inPage(page, s => { ui.detail = null; ui.screen = s; render(); }, screen); const sel = '#app [data-role="search"]'; if (await page.$(sel)) for (const q of ['לאה', 'Rosen', '']) { await page.fill(sel, q); await page.waitForTimeout(150); } }
    await L.settle(page);
    const w1 = await writes(page); const s1 = await L.idbRead(page);
    const same = COLL.every(c => JSON.stringify(s1[c]) === JSON.stringify(s0[c]));
    record('N01', 'Opening every new sheet (send, versions, answer, dates, offers, items, earlier rounds) and searching write nothing', w1 === w0 && same, { writes: w1 - w0, same });
    await ctx.close();
  },

  // ---- ARCHITECTURE.md §13.2 -------------------------------------------------------------------------
  async A01_recent_is_a_view_of_the_ledger() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    // Every row opens its entry, and from there one tap reaches what it is about.
    const targets = await inPage(page, () => { const out = {}; for (const e of liveEntries()) { const a = e.about?.[0]; if (a && !out[a.type]) out[a.type] = e.id; } return out; });
    const reached = {};
    for (const [type, eid] of Object.entries(targets)) {
      await inPage(page, () => { closeSheet(); ui.detail = null; ui.screen = 'recent'; render(); });
      if (!(await page.$(`#app [data-entry="${eid}"]`))) { reached[type] = 'no row'; continue; }
      await L.tap(page, `#app [data-entry="${eid}"]`); await L.tap(page, '#app [data-act="open-about"]');
      reached[type] = await inPage(page, () => document.querySelector('#overlay .sheet') ? 'sheet' : ui.detail?.type || ui.screen);
    }
    const want = { person: 'person', shidduch: 'shidduch', round: 'shidduch', date: 'shidduch', source: 'source', idea: 'sheet' };
    const opens = Object.entries(reached).every(([t, r]) => r === want[t]);
    // Deleting an entry removes it from every view at once (Recent and the History) — they are views, not copies.
    await inPage(page, () => { closeSheet(); addActivitySheet('p_miriam'); }); await page.fill('#aText', 'Short note for the view test.'); await L.tap(page, '#overlay [data-act="save-activity"]');
    const eid = (await L.idbRead(page)).entries.find(e => e.text === 'Short note for the view test.')?.id;
    const seen = async () => inPage(page, eid => { const r = {}; ui.detail = null; ui.screen = 'recent'; render(); r.recent = !!document.querySelector(`#app [data-entry="${eid}"]`); ui.detail = { type: 'person', id: 'p_miriam' }; ui.detailTab = 'conversation'; render(); r.history = !!document.querySelector(`#app [data-entry="${eid}"]`); return r; }, eid);
    const before = await seen();
    await inPage(page, eid => { ui.detail = { type: 'entry', id: eid }; render(); }, eid); await L.tap(page, '#app [data-act="delete-entry"]');
    const after = await seen();
    const ok = opens && before.recent && before.history && !after.recent && !after.history;
    record('A01', 'Recent is the ledger: each row opens the right person, shidduch, date, source or offer; deleting an entry removes it from Recent and the History at once', ok, { reached, before, after });
    await ctx.close();
  },

  async A02_no_shidduch_without_a_pairing() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    // Send my profile, call a reference, meet someone at an event, introduce myself, and say Not applicable.
    await inPage(page, () => sendProfileSheet(me().id, 'p_batya')); await L.tap(page, '#overlay [data-send="copy"]'); await L.settle(page);
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_david' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="add-link"]');
    await page.fill('#kName', 'Yosef Brill'); await page.fill('#kPhone', '050-000-7003'); await L.tap(page, '#overlay [data-act="save-link"]');
    const ref = (await L.idbRead(page)).people.find(p => p.name === 'Yosef Brill');
    await inPage(page, idv => { ui.detail = { type: 'person', id: idv }; ui.detailTab = 'profile'; render(); }, ref.id); await L.tap(page, '[data-contact="call"]'); await L.settle(page); await L.closeSheets(page);
    await inPage(page, () => { ui.detail = { type: 'source', id: 'src_event' }; render(); }); await L.tap(page, '[data-act="source-add-person"]'); await page.fill('#lName', 'Devora Lev'); await L.tap(page, '#overlay [data-act="save-list-person"]');
    await inPage(page, () => addActivitySheet('p_dina')); await page.selectOption('#aType', 'message'); await page.fill('#aText', 'Introduced myself.'); await L.tap(page, '#overlay [data-act="save-activity"]');
    await inPage(page, () => ideaSheet('idea_moshe_tamar')); await L.tap(page, '#overlay [data-act="idea-no"]'); await L.tap(page, '#overlay [data-act="idea-no-save"]');
    const st = await L.idbRead(page);
    const ok = st.shidduchim.length === s0.shidduchim.length && st.rounds.length === s0.rounds.length && st.entries.length >= s0.entries.length + 5;
    record('A02', 'No shidduch without a pairing: sending my profile, calling a reference, meeting someone at an event, introducing myself and Not applicable make no shidduch or round', ok, { shidduchim: st.shidduchim.length - s0.shidduchim.length, rounds: st.rounds.length - s0.rounds.length, newEntries: st.entries.length - s0.entries.length });
    await ctx.close();
  },

  async A03_not_applicable_for_me_hides_but_keeps() {
    const { ctx, page } = await fresh({ mode: 'single' });
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay [data-add="offer"]');
    await page.selectOption('#iGuy', 'p_me'); await page.selectOption('#iGirl', 'p_tamar'); await page.selectOption('#iBy', 'p_miriam');
    await L.tap(page, '#overlay [data-act="save-idea"]');
    const s0 = await L.idbRead(page);
    const girls = async q => inPage(page, q => { ui.detail = null; ui.screen = 'girls'; ui.search = q; render(); const ids = [...document.querySelectorAll('#app [data-person]')].map(e => e.dataset.person); ui.search = ''; return ids; }, q);
    const browsingBefore = await girls('');
    const offer = s0.ideas.find(i => i.guyId === 'p_me' && i.girlId === 'p_tamar' && i.status === 'open');
    await inPage(page, idv => ideaSheet(idv), offer.id); await L.tap(page, '#overlay [data-act="idea-no"]'); await L.tap(page, '#overlay [data-act="idea-no-save"]');
    const browsingAfter = await girls(''), searched = await girls('Tamar');
    await inPage(page, async () => { data.settings.mode = 'shadchan'; await save(); applySettings(); });
    const shadchanView = await girls('');
    const s1 = await L.idbRead(page);
    const kept = JSON.stringify(byId(s1.people, 'p_tamar')) === JSON.stringify(byId(s0.people, 'p_tamar')) && JSON.stringify(s1.profileVersions.filter(v => v.personId === 'p_tamar')) === JSON.stringify(s0.profileVersions.filter(v => v.personId === 'p_tamar')) && s0.entries.every(e => s1.entries.some(x => x.id === e.id));
    const ok = browsingBefore.includes('p_tamar') && !browsingAfter.includes('p_tamar') && searched.includes('p_tamar') && shadchanView.includes('p_tamar') && kept;
    record('A03', 'Not applicable for me: she leaves Single-mode browsing, search still finds her, she is normal in Shadchan mode, and nothing about her is lost', ok, { before: browsingBefore.includes('p_tamar'), after: browsingAfter.includes('p_tamar'), search: searched.includes('p_tamar'), shadchanMode: shadchanView.includes('p_tamar'), kept });
    await ctx.close();
  },

  async A04_declined_then_a_new_pair_starts_clean() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    // Leah says No to me through Miriam, and I end it with a private reason.
    await run(page, [...shidduchPath('sh_me_leah'), tab('overview')]);
    await L.tap(page, '[data-act="set-answer"][data-side="girl"]'); await L.tap(page, '#overlay [data-answer-value="no"]'); await page.selectOption('#answerFrom', 'p_miriam'); await page.fill('#answerNote', 'PRIVATE-HER-NO'); await L.tap(page, '#overlay [data-act="save-answer"]');
    await L.tap(page, '[data-act="end-shidduch"]'); await page.fill('#endReason', 'PRIVATE-HASHKAFA'); await L.tap(page, '#overlay [data-act="confirm-end-shidduch"]');
    const mine = await inPage(page, () => entriesForShidduch('sh_me_leah').map(e => e.id));
    // Later, Rivka suggests David – Leah.
    await inPage(page, async () => { data.ideas.push({ id: 'idea_david_leah2', guyId: 'p_david', girlId: 'p_leah', suggestedByPersonId: 'p_rivka', createdAt: iso(), status: 'open' }); await save(); ideaSheet('idea_david_leah2'); });
    await L.tap(page, '#overlay [data-act="idea-yes"]'); await L.closeSheets(page);
    const st = await L.idbRead(page);
    const dl = st.shidduchim.find(s => s.guyId === 'p_david' && s.girlId === 'p_leah');
    const view = await inPage(page, sid => ({ history: entriesForShidduch(sid).map(e => e.id), goBetweens: shidduchGoBetweens(shidduch(sid)), rounds: roundsOf(shidduch(sid)).length }), dl?.id);
    await inPage(page, () => sendProfileSheet('p_leah', 'p_rivka'));
    const preview = await page.$eval('#sendPreview', e => e.textContent);
    const leahText = await inPage(page, () => latestProfileVersion('p_leah')?.text || '');
    await run(page, [['close']]); await inPage(page, sid => { ui.detail = { type: 'shidduch', id: sid }; ui.detailTab = 'people'; render(); }, dl?.id);
    const peopleTab = await page.$eval('#app', a => a.textContent);
    const ok = !!dl && dl.id !== 'sh_me_leah' && view.rounds === 1 && view.history.length === 1 && !view.history.some(x => mine.includes(x)) && JSON.stringify(view.goBetweens) === '["p_rivka"]'
      && preview === leahText && !/PRIVATE-/.test(preview) && !/Miriam/.test(peopleTab);
    record('A04', 'Declined, then David – Leah: a new shidduch that starts empty (only its own entry), go-betweens only from its own offer, and a send preview holding only her profile version', ok, { newRecord: !!dl, rounds: view.rounds, history: view.history.length, goBetweens: view.goBetweens, previewIsProfile: preview === leahText, miriamOnPeopleTab: /Miriam/.test(peopleTab) });
    await ctx.close();
  },

  async A05_make_match_starts_the_shidduch() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const s0 = await L.idbRead(page);
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_david' }; ui.detailTab = 'profile'; render(); });
    await L.tap(page, '[data-act="detail-menu"]'); await L.tap(page, '#overlay [data-act="make-match-for"]');
    const preset = await page.$eval('#iGuy', e => e.value);
    await page.selectOption('#iGirl', 'p_tamar');
    await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="make-match"]'); b.click(); b.click(); });
    await L.settle(page); await page.waitForTimeout(300); await L.closeSheets(page);
    const s1 = await L.idbRead(page);
    const sh = s1.shidduchim.filter(s => !s0.shidduchim.some(x => x.id === s.id)), rs = s1.rounds.filter(r => !s0.rounds.some(x => x.id === r.id));
    const entry = s1.entries.find(e => (e.changes || []).some(c => c.kind === 'round-started' && c.roundId === rs[0]?.id));
    // David – Noa is already in progress: Make match only opens it.
    await inPage(page, () => addIdeaSheet('p_david')); await page.selectOption('#iGirl', 'p_noa'); await L.tap(page, '#overlay [data-act="make-match"]'); await L.closeSheets(page);
    const s2 = await L.idbRead(page);
    const ok = preset === 'p_david' && sh.length === 1 && sh[0].guyId === 'p_david' && sh[0].girlId === 'p_tamar' && rs.length === 1 && rs[0].status === 'active' && entry?.text === 'Match made. Round 1 started.'
      && s2.shidduchim.length === s1.shidduchim.length && s2.rounds.length === s1.rounds.length;
    record('A05', 'Make match (Shadchan mode, from a single\'s ⋯) starts the shidduch at once with Round 1, once even with a double tap; on a pair already in progress it adds nothing', ok, { preset, shidduchim: sh.length, rounds: rs.length, text: entry?.text, again: { shidduchim: s2.shidduchim.length - s1.shidduchim.length, rounds: s2.rounds.length - s1.rounds.length } });
    await ctx.close();
  },

  // ---- Reconciliation with ARCHITECTURE.md (C) -------------------------------------------------------
  async C01_needs_a_number() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    // A shadchan added by name only is a light record marked "Needs a number"; a single never is.
    await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay #qaShad'); await page.fill('#fName', 'Tova Light'); await L.tap(page, '#overlay [data-act="save-person"]');
    const tova = (await L.idbRead(page)).people.find(p => p.name === 'Tova Light');
    const marked = !!(await page.$('#app .number-hint'));
    const leahMarked = await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'profile'; render(); return !!document.querySelector('#app .number-hint'); });
    // Adding a number that belongs to someone else runs the matching check again.
    await inPage(page, idv => { ui.detail = { type: 'person', id: idv }; ui.detailTab = 'details'; render(); }, tova.id);
    await L.tap(page, '#app [data-act="add-number"]');
    const focused = await page.evaluate(() => document.activeElement?.id);
    await page.fill('#epPhone', '+972 50-555-0101'); await L.tap(page, '#overlay [data-act="save-edit-person"]');
    const asked = /Same person\?/.test(await page.$eval('#overlay', o => o.textContent));
    await L.tap(page, '#overlay [data-act="edit-keep-separate"]');
    const st = await L.idbRead(page);
    const decided = st.identityDecisions.some(x => x.ids?.includes(tova.id) && x.ids?.includes('p_miriam'));
    const afterMark = !!(await page.$('#app .number-hint'));
    const ok = marked && !leahMarked && focused === 'epPhone' && asked && decided && byId(st.people, tova.id).phone === '+972 50-555-0101' && !afterMark;
    record('C01', 'Needs a number: a shadchan saved by name only is marked (singles never are); adding the number runs the matching check again ("Same person?"), and the mark goes away', ok, { marked, leahMarked, focused, asked, decided, afterMark });
    await ctx.close();
  },

  async C02_send_my_profile_to_a_list() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const s0 = await L.idbRead(page);
    await inPage(page, () => { ui.detail = { type: 'source', id: 'src_rivka10' }; render(); });
    const row = await page.$eval('#app [data-act="list-send"]', e => e.textContent);
    await L.tap(page, '#app [data-act="list-send"]');
    const offered = await page.$$eval('#overlay input[name="listSendTo"]', els => els.map(e => e.value));
    await page.uncheck(`#overlay input[name="listSendTo"][value="${offered[3]}"]`);
    await page.fill('#sendWords', 'Hello from the list.'); await page.dispatchEvent('#sendWords', 'input');
    await L.tap(page, '#overlay [data-act="list-send-start"]');
    // Copy for the first (tapped twice), skip the second, WhatsApp for the third.
    await page.evaluate(() => { const b = document.querySelector('#overlay [data-list-send="copy"]'); b.click(); b.click(); }); await L.settle(page); await page.waitForTimeout(200);
    await L.tap(page, '#overlay [data-list-send="skip"]');
    await L.tap(page, '#overlay [data-list-send="whatsapp"]'); await L.settle(page); await page.waitForTimeout(200);
    const st = await L.idbRead(page);
    const sends = st.entries.filter(e => e.type === 'profile' && e.direction === 'out' && !s0.entries.some(x => x.id === e.id));
    const v = await inPage(page, () => latestProfileVersion(me().id));
    const after = await inPage(page, () => sourceStats(source('src_rivka10')));
    const before = await inPage(page, d => { const was = data; data = d; const r = sourceStats(source('src_rivka10')); data = was; return r; }, s0);
    const fu = st.openItems.filter(x => x.kind === 'list-follow-up' && x.about?.id === 'src_rivka10');
    const ok = /4 not contacted/.test(row) && offered.length === 4 && sends.length === 2 && JSON.stringify(sends.map(e => e.toPersonId)) === JSON.stringify([offered[0], offered[2]]) && sends.every(e => e.profileVersionId === v.id && e.sentText === `Hello from the list.\n\n${v.text}`) && after.contacted === before.contacted + 2 && fu.length <= 1 && !(await page.$('#overlay [data-list-send]'));
    record('C02', 'Send my profile to the people on a list not contacted yet: one version and message chosen once, then one person at a time; each send is its own entry with the exact version (a double tap sends once), Skip sends nothing, and the list counts update', ok, { row, offered: offered.length, sends: sends.map(e => e.toPersonId), contacted: [before.contacted, after.contacted], followUps: fu.length });
    await ctx.close();
  },

  async C03_pause_resume_and_undo() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const itemIds = await inPage(page, async () => { const a = addOpenItem({ direction: 'them', personId: 'p_rivka', about: { type: 'shidduch', id: 'sh_david_noa' }, label: 'Noa side answer on dates' }); const b = addOpenItem({ direction: 'me', personId: 'p_rivka', about: { type: 'shidduch', id: 'sh_david_noa' }, label: 'Call Rivka' }); await save(); return [a.id, b.id]; });
    const s0 = await L.idbRead(page);
    await run(page, [...shidduchPath('sh_david_noa'), tab('overview')]);
    await L.tap(page, '[data-act="detail-menu"]'); await L.tap(page, '#overlay [data-act="pause-shidduch"]'); await L.tap(page, '#overlay [data-act="confirm-pause"]');
    const s1 = await L.idbRead(page);
    const pauseE = s1.entries.find(e => e.changes?.some(c => c.kind === 'round-paused'));
    const closed = itemIds.every(i => byId(s1.openItems, i).status === 'closed' && byId(s1.openItems, i).closedByEntryId === pauseE?.id);
    const shown = await inPage(page, () => ({ note: !!document.querySelector('#app .zm-paused-note'), next: document.querySelector('#app .zm-clean-row.next strong')?.textContent, list: (ui.screen = 'shidduchim', ui.screenView.shidduchim = 'active', ui.detail = null, render(), [...document.querySelectorAll('#app [data-shidduch="sh_david_noa"] time')].map(t => t.textContent).join()) }));
    await page.evaluate(() => document.querySelector('#toast [data-act="undo-pause"]').click()); await L.settle(page); await page.waitForTimeout(200);
    const s2 = await L.idbRead(page);
    const undone = itemIds.every(i => JSON.stringify(byId(s2.openItems, i)) === JSON.stringify(byId(s0.openItems, i))) && !s2.entries.some(e => e.id === pauseE?.id) && !(await inPage(page, () => shPaused(shidduch('sh_david_noa'))));
    // Pause again, then an offer for the same pair: Interested continues the round and resumes it.
    await inPage(page, () => { ui.detail = { type: 'shidduch', id: 'sh_david_noa' }; ui.detailTab = 'overview'; render(); pauseSheet('sh_david_noa'); }); await L.tap(page, '#overlay [data-act="confirm-pause"]');
    await inPage(page, async () => { data.ideas.push({ id: 'idea_dn_again', guyId: 'p_david', girlId: 'p_noa', suggestedByPersonId: 'p_dina', createdAt: iso(), status: 'open' }); await save(); ideaSheet('idea_dn_again'); });
    await L.tap(page, '#overlay [data-act="idea-yes"]'); await L.closeSheets(page);
    const s3 = await L.idbRead(page);
    const resumed = !(await inPage(page, () => shPaused(shidduch('sh_david_noa')))) && s3.rounds.length === s0.rounds.length;
    const ok = !!pauseE && closed && shown.note && shown.next === 'Paused' && /Paused/.test(shown.list) && byId(s1.rounds, 'round_david_noa_1').status === 'active' && undone && resumed;
    record('C03', 'Pause keeps the shidduch in progress (marked Paused) and closes its open items, each pointing to the pause; Undo reopens exactly those items; Interested on a paused pair resumes the same round', ok, { closed, shown, undone, resumed });
    await ctx.close();
  },

  async C04_end_has_undo() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const itemId = await inPage(page, async () => { const a = addOpenItem({ direction: 'them', personId: 'p_rivka', about: { type: 'shidduch', id: 'sh_david_noa' }, label: 'Noa side answer' }); await save(); return a.id; });
    const s0 = await L.idbRead(page);
    await run(page, [...shidduchPath('sh_david_noa'), tab('overview')]);
    await L.tap(page, '[data-act="end-shidduch"]'); await page.fill('#endReason', 'Made-up reason'); await L.tap(page, '#overlay [data-act="confirm-end-shidduch"]');
    const s1 = await L.idbRead(page);
    await page.evaluate(() => document.querySelector('#toast [data-act="undo-end"]').click()); await L.settle(page); await page.waitForTimeout(200);
    const s2 = await L.idbRead(page);
    const ok = byId(s1.rounds, 'round_david_noa_1').status === 'ended' && byId(s1.openItems, itemId).status === 'closed'
      && JSON.stringify(byId(s2.rounds, 'round_david_noa_1')) === JSON.stringify(byId(s0.rounds, 'round_david_noa_1')) && JSON.stringify(byId(s2.openItems, itemId)) === JSON.stringify(byId(s0.openItems, itemId)) && s2.entries.length === s0.entries.length;
    record('C04', 'Ending a shidduch closes its open items and has Undo: the round, the items and the history come back exactly as they were', ok, { ended: byId(s1.rounds, 'round_david_noa_1').status, restored: JSON.stringify(byId(s2.rounds, 'round_david_noa_1')) === JSON.stringify(byId(s0.rounds, 'round_david_noa_1')) });
    await ctx.close();
  },

  async C05_tell_the_go_between_and_status_source() {
    const { ctx, page } = await fresh({ mode: 'single' });
    // I decide my own side: telling Miriam is now waiting on me.
    await run(page, [...shidduchPath('sh_me_leah'), tab('overview')]);
    await L.tap(page, '[data-act="set-answer"][data-side="guy"]'); await L.tap(page, '#overlay [data-answer-value="thinking"]'); await L.tap(page, '#overlay [data-act="save-answer"]');
    await L.tap(page, '[data-act="set-answer"][data-side="guy"]'); await L.tap(page, '#overlay [data-answer-value="yes"]'); await L.tap(page, '#overlay [data-act="save-answer"]');
    const st = await L.idbRead(page);
    const tells = st.openItems.filter(x => x.kind === 'tell-decision');
    const open = tells.filter(x => x.status === 'open');
    // The answer shows where it came from: tap it, see the entry.
    await L.tap(page, '[data-act="set-answer"][data-side="guy"]');
    const source = await page.$eval('#overlay .answer-source', e => e.textContent);
    await L.tap(page, '#overlay .answer-source [data-act="open-entry"]');
    const opened = await inPage(page, () => ui.detail?.type === 'entry' && data.entries.find(e => e.id === ui.detail.id)?.changes?.some(c => c.kind === 'answer' && c.side === 'guy' && c.value === 'yes'));
    // A call to Miriam: the app names the item, I tick it, it closes by the call.
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_miriam' }; ui.detailTab = 'details'; render(); });
    await L.tap(page, '[data-contact="call"]'); await L.settle(page);
    await page.check(`#overlay input[name="afterItem"][value="${open[0]?.id}"]`); await L.tap(page, '#overlay [data-act="after-contact-save"]');
    const s2 = await L.idbRead(page);
    const call = s2.entries.filter(e => e.type === 'call').pop();
    const ok = tells.length === 2 && open.length === 1 && open[0].personId === 'p_miriam' && /my answer is Yes/.test(open[0].label) && /Now: Yes/.test(source) && opened && byId(s2.openItems, open[0].id).closedByEntryId === call?.id;
    record('C05', 'When I decide my own side, "Tell Miriam: my answer is Yes" waits on me (a newer decision replaces the older); the answer shows its source one tap away; a call to Miriam closes it', ok, { tells: tells.map(x => `${x.label}:${x.status}`), source, opened });
    await ctx.close();
  },

  async C06_how_i_know_them() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await inPage(page, () => addActivitySheet('p_miriam')); await page.selectOption('#aType', 'referral'); await page.fill('#aText', 'Recommended by Batya.'); await L.tap(page, '#overlay [data-act="save-activity"]');
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_miriam' }; ui.detailTab = 'details'; render(); });
    await L.tap(page, '#app [data-act="how-i-know"]');
    const rows = await page.$$eval('#overlay .how-row strong', els => els.map(e => e.textContent));
    const ways = await inPage(page, () => howIKnow('p_miriam').map(w => w.at));
    const ordered = ways.every((t, i) => i === 0 || new Date(ways[i - 1] || 0) <= new Date(t || 0));
    await L.tap(page, '#overlay .how-row[data-act="open-source"]');
    const openedSource = await inPage(page, () => ui.detail?.type === 'source');
    const ok = rows.length === 3 && rows.some(r => /^Met at /.test(r)) && rows.some(r => /^On /.test(r)) && rows.some(r => /Recommended by Batya/.test(r)) && ordered && openedSource;
    record('C06', 'How I know her: every list, event and referral, oldest first, each opening its list or its entry', ok, { rows, ordered, openedSource });
    await ctx.close();
  },

  async C07_same_name_in_another_script_asks() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    const add = async (name, city) => { await inPage(page, () => { closeSheet(); ui.detail = null; ui.screen = 'recent'; render(); }); await L.tap(page, '[data-act="add-current"]'); await L.tap(page, '#overlay #qaShad'); await page.fill('#fName', name); if (city) await page.fill('#fCity', city); await L.tap(page, '#overlay [data-act="save-person"]'); return page.$eval('#overlay', o => o.textContent).catch(() => ''); };
    const withCity = await add('מרים כהן', 'Jerusalem');
    const askedLikely = /Is this the Miriam Cohen you know\?/.test(withCity);
    if (askedLikely) await L.tap(page, '#overlay [data-act="identity-different"]');
    const noCity = await add('מרים כהן', '');
    const st = await L.idbRead(page);
    const ok = askedLikely && !/you know\?/.test(noCity) && st.people.filter(p => p.name === 'מרים כהן').length === 2;
    record('C07', 'The same full name in another script asks "Is this the Miriam you know?" when the city matches; with nothing else in common it only adds the quiet hint', ok, { askedLikely, secondAsked: /you know\?/.test(noCity) });
    await ctx.close();
  },

  async C08_search_everyone_and_mine_private() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    // A parent (no role of her own) is found by search.
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="add-link"]');
    await page.selectOption('#kKind', 'mother'); await page.fill('#kName', 'Rachel Rosen'); await page.fill('#kPhone', '050-000-7004'); await L.tap(page, '#overlay [data-act="save-link"]');
    const found = await inPage(page, () => { ui.detail = null; ui.screen = 'recent'; ui.search = 'rosen'; render(); const r = [...document.querySelectorAll('#app .warm-stack [data-person]')].map(e => e.querySelector('strong').textContent); ui.search = ''; render(); return r; });
    const rows = await inPage(page, () => { ui.screen = 'shidduchim'; ui.screenView.shidduchim = 'active'; render(); return Object.fromEntries([...document.querySelectorAll('#app [data-shidduch]')].map(e => [e.dataset.shidduch, e.querySelector('time').textContent])); });
    const ok = found.includes('Leah Rosen') && found.includes('Rachel Rosen') && /Private/.test(rows.sh_me_leah) && !/Private/.test(rows.sh_david_noa);
    record('C08', 'Search finds everyone, including a parent with no role of her own; in Shadchan mode my own shidduch is marked Private in Shidduchim', ok, { found, rows });
    await ctx.close();
  },

  async C09_single_mode_recent_folds_other_shidduchim() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    // A note written on David – Noa's page is about that shidduch (the page decides "about").
    await run(page, [...shidduchPath('sh_david_noa'), tab('history')]);
    await L.tap(page, '#app [data-act="add-shidduch-note"]'); await page.fill('#aText', 'Note on David and Noa.'); await L.tap(page, '#overlay [data-act="save-activity"]');
    const e = (await L.idbRead(page)).entries.find(x => x.text === 'Note on David and Noa.');
    const about = (e?.about || []).map(a => a.type).join();
    const view = async mode => inPage(page, async m => { data.settings.mode = m; ui.detail = null; ui.screen = 'recent'; ui.showOthers = false; render(); return { shown: [...document.querySelectorAll('#app [data-entry]')].map(x => x.dataset.entry), line: document.querySelector('#app .quiet-line')?.textContent || '' }; }, mode);
    const shadchanView = await view('shadchan');
    const singleView = await view('single');
    await L.tap(page, '#app .quiet-line');
    const opened = await inPage(page, () => [...document.querySelectorAll('#app [data-entry]')].map(x => x.dataset.entry));
    const ok = /shidduch,round,person/.test(about) && shadchanView.shown.includes(e.id) && !shadchanView.line && !singleView.shown.includes(e.id) && /more in Shadchan mode/.test(singleView.line) && opened.includes(e.id);
    record('C09', 'Single mode Recent folds other people\'s shidduchim into one quiet line (tap shows them); Shadchan mode shows everything; a note from a shidduch\'s page is about that shidduch', ok, { about, singleLine: singleView.line, inShadchan: shadchanView.shown.includes(e?.id), inSingle: singleView.shown.includes(e?.id), afterTap: opened.includes(e?.id) });
    await ctx.close();
  },

  async C10_single_mode_rows_show_my_profile_version() {
    const { ctx, page } = await fresh({ mode: 'single' });
    const line = async pid => inPage(page, p => { ui.detail = null; ui.screen = 'shadchanim'; ui.screenView.shadchanim = 'all'; render(); return document.querySelector(`#app [data-person="${p}"] .warm-person-line`)?.textContent || ''; }, pid);
    const before = { miriam: await line('p_miriam'), batya: await line('p_batya') };
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_me' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="detail-menu"]'); await L.tap(page, '#overlay [data-act="edit-person"]');
    await page.fill('#epProfile', 'פרופיל לדוגמה בלבד.'); await L.tap(page, '#overlay [data-act="save-edit-person"]');
    const after = await line('p_miriam');
    const v = (await L.idbRead(page)).profileVersions.filter(x => x.personId === 'p_me').sort((a, b) => a.number - b.number).pop();
    const ok = /has v4$/.test(before.miriam) && !/has v/.test(before.batya) && /has v4 \(old\)$/.test(after) && v.language === 'Hebrew';
    record('C10', 'Single mode: a shadchan\'s row says which version of my profile they have ("has v4", then "has v4 (old)" after an edit); a version knows its language', ok, { before, after, language: v.language });
    await ctx.close();
  },

  async C11_people_views_and_age_with_its_date() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await run(page, [nav('girls')]);
    const w0 = await writes(page);
    await L.tap(page, '[data-act="filters"]');
    await page.selectOption('#pfAgeMin', '33'); await page.selectOption('#pfAgeMax', '34'); await page.selectOption('#pfCity', { label: 'Jerusalem' });
    const shown = await page.$$eval('#app .warm-stack [data-person]', els => els.map(e => e.dataset.person).sort());
    await L.closeSheets(page); await L.tap(page, '#app .folder-note [data-folder-view=""]');
    const all = await page.$$eval('#app .warm-stack [data-person]', els => els.length);
    const w1 = await writes(page);
    // Age with its date: an unchanged old age keeps no invented date; a changed age counts on from today.
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_leah' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="edit-person"]'); await L.tap(page, '#overlay [data-act="save-edit-person"]');
    const kept = byId((await L.idbRead(page)).people, 'p_leah');
    await L.tap(page, '[data-act="edit-person"]'); await page.fill('#epAge', '35'); await page.selectOption('#epKnow', 'little'); await L.tap(page, '#overlay [data-act="save-edit-person"]');
    const changed = byId((await L.idbRead(page)).people, 'p_leah');
    await page.clock.setFixedTime(new Date(L.FIXED_TIME.getTime() + 400 * 86400000));
    const later = await inPage(page, () => { render(); return { age: personAge(person('p_leah')), know: [...document.querySelectorAll('#app .warm-info-card span')].some(s => s.textContent === 'How well') }; });
    const ok = JSON.stringify(shown) === '["p_leah","p_tamar"]' && all === 4 && w1 === w0 && kept.age === 34 && !kept.ageAsOf && changed.age === 35 && !!changed.ageAsOf && changed.knowLevel === 'little' && later.age === 36 && later.know;
    record('C11', 'Shadchan mode Girls: age and city views (writing nothing, Show all clears them); an age is kept with the date it was typed and counts on, an old age gets no invented date; "How well I know them" shows once set', ok, { shown, all, writes: w1 - w0, kept: { age: kept.age, ageAsOf: kept.ageAsOf }, changed: { age: changed.age, ageAsOf: !!changed.ageAsOf }, later });
    await ctx.close();
  },

  async C12_date_feedback_points_at_the_side_contact() {
    const { ctx, page } = await fresh({ mode: 'shadchan' });
    await inPage(page, () => { ui.detail = { type: 'person', id: 'p_noa' }; ui.detailTab = 'profile'; render(); }); await L.tap(page, '[data-act="add-link"]');
    await page.selectOption('#kKind', 'mother'); await page.fill('#kName', 'Hadas Weiss'); await page.fill('#kPhone', '050-000-7005'); await L.tap(page, '#overlay [data-act="save-link"]');
    const mother = (await L.idbRead(page)).people.find(p => p.name === 'Hadas Weiss');
    await run(page, [...shidduchPath('sh_david_noa'), tab('dates')]);
    await L.tap(page, '[data-act="add-date"]'); await page.fill('#dateWhen', '2026-10-04T19:00'); await L.tap(page, '#overlay [data-act="save-new-date"]');
    const did = (await L.idbRead(page)).dates.find(d => d.number === 3)?.id;
    await L.tap(page, `[data-date="${did}"]`); await L.tap(page, '#overlay [data-act="date-happened"]');
    const items = (await L.idbRead(page)).openItems.filter(x => x.kind === 'date-feedback' && x.about?.id === did);
    const by = Object.fromEntries(items.map(x => [x.side, x.personId]));
    const ok = items.length === 2 && by.girl === mother?.id && by.guy === 'p_david';
    record('C12', 'On someone else\'s shidduch, each side\'s date feedback is waited on from that side\'s contact (here Noa\'s mother), and only without one from the single', ok, { by, mother: mother?.id });
    await ctx.close();
  },

  // ---- Backups -----------------------------------------------------------------------------------
  async B01_backup_round_trip() {
    const { ctx, page } = await fresh({ fixture: 'v58-rich' });
    const st = await L.idbRead(page);
    await L.tap(page, '[data-act="settings"]');
    const file = await download(page, '#overlay [data-act="export-backup"]');
    const backup = JSON.parse(file);
    const second = await L.newPage(browser, BASE, L.WIDTHS.phone);
    await L.idbWrite(second.page, FIX('demo')); await L.openApp(second.page);
    await L.tap(second.page, '[data-act="settings"]');
    await second.page.setInputFiles('#backupFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(file) });
    await L.settle(second.page); await second.page.waitForTimeout(300);
    const restored = await L.idbRead(second.page);
    const same = COLL.every(c => JSON.stringify(restored[c]) === JSON.stringify(st[c]));
    const ok = backup.app === 'ZivugMatch' && backup.version === '1.0' && backup.schema === 2 && same;
    record('B01', 'A v1.0 backup restores every record exactly, on another device', ok, { app: backup.app, version: backup.version, schema: backup.schema, identical: same });
    await second.ctx.close(); await ctx.close();
  },

  async B02_v58_backup_restores_and_upgrades() {
    const { ctx, page } = await fresh({ fixture: 'demo' });
    const before = await L.idbRead(page);
    await L.tap(page, '[data-act="settings"]');
    await page.setInputFiles('#backupFile', { name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(FIX('v58-rich'))) });
    await L.settle(page); await page.waitForTimeout(300);
    const st = await L.idbRead(page);
    const upgraded = st.schema === 2 && st.people.length === FIX('v58-rich').people.length && st.attention.length === 2;
    const undo = await page.$('#toast [data-act="undo-safety"]');
    if (undo) { await page.evaluate(() => document.querySelector('#toast [data-act="undo-safety"]').click()); await L.settle(page); await page.waitForTimeout(300); }
    const back = await L.idbRead(page);
    const undone = COLL.every(c => JSON.stringify(back[c]) === JSON.stringify(before[c]));
    record('B02', 'A v58 backup is upgraded when restored; the data it replaced comes back with Undo', upgraded && !!undo && undone, { upgraded, undoOffered: !!undo, undone });
    await ctx.close();
  },
};

(async () => {
  L.mkdirp(OUT);
  browser = await L.launch();
  for (const [name, fn] of Object.entries(tests)) {
    if (ONLY && !name.startsWith(ONLY)) continue;
    try { await fn(); } catch (e) { results.push({ id: name.split('_')[0], title: name, status: 'ERROR', details: e.message.split('\n').slice(0, 3).join(' ') }); console.log(`ERROR ${name} ${e.message.split('\n')[0]}`); }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'acceptance.json'), JSON.stringify(results, null, 1));
  const pass = results.filter(r => r.status === 'PASS').length;
  console.log(`\n${pass}/${results.length} acceptance tests pass`);
  process.exit(pass === results.length ? 0 : 1);
})();
