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
