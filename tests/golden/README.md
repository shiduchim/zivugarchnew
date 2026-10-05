# Golden regression harness

Headless-Chromium tests that prove a change keeps ZivugMatch's behaviour, data and look.
They only *load* the app; they never change app files.

The golden baseline is **v58 at commit `0d3bf29`**. It is always regenerated from that commit in the
same environment as the candidate, because pixel hashes depend on the Chromium build and fonts.
`v58/` keeps the reference results from the first run (manifest of 2,871 states, functional results,
and 50 representative screenshots) so changes can be reviewed later.

## Run

Needs Node 18+ and Playwright (`npm i -D playwright && npx playwright install chromium`).

```sh
# 1. serve the v58 baseline and the working tree
git archive 0d3bf29 | (mkdir -p /tmp/v58 && tar -x -C /tmp/v58)
node tests/golden/serve.cjs /tmp/v58 8801 &
node tests/golden/serve.cjs . 8810 &

cd tests/golden
# 2. visual + DOM: every state, 11 skins, 2 modes, phone 412 px and desktop 1280 px (~20 min each)
node visual.cjs http://127.0.0.1:8801/ runs/base
node visual.cjs http://127.0.0.1:8810/ runs/cand --hash-only
# 3. functional + data-state checks
node functional.cjs http://127.0.0.1:8801/ runs/f-base
node functional.cjs http://127.0.0.1:8810/ runs/f-cand
# 4. compare, then recheck any differing screenshots on both builds
node compare.cjs runs/base runs/cand runs/f-base runs/f-cand
node recheck.cjs http://127.0.0.1:8801/ http://127.0.0.1:8810/ runs/cand
```

Quick, targeted runs (DOM only, a few skins):

```sh
node visual.cjs <url> runs/x --dom-only --skins=classic,kids --widths=phone --no-variants
node compare.cjs runs/base runs/x --common
```

## What is covered

- **States:** 62–65 per mode, reached from a fresh load by tapping visible controls only (`data-*` attributes).
  - all 5 tabs and every sub-tab
  - person, shadchan, shidduch, source and entry pages, every tab
  - 22 sheets and filters, including the Recent filter and sort
  - Single-mode My profile and Girls
- **Matrix:** 11 skins × Single/Shadchan × phone (412×915, mobile emulation) / desktop (1280×900).
  Variants add layout feel 2/3, compact size, small/large icons and the forced phone layout.
- **Per state:**
  - a full-page screenshot hash
  - a DOM snapshot (script tags removed)
  - console errors
  - IndexedDB writes (must be zero while browsing)

`functional.cjs` holds three kinds of checks:

- **F (guarantees).** These must always pass:
  - no writes while browsing
  - mode and presentation changes touch only their own setting
  - Recent and History share the same ledger entries
  - one shidduch per pair, with Round 2 on the same record
  - permanent IDs are stable, and data survives a reload
  - Recent filter, navigation and Single mode
  - v58 wording and layout rules, icons, the pinned header
- **S (safety requirements).** They failed on v58 and pass once the data-safety fixes are in.
- **K (recorded v58 bugs).** A K result changes only when a fix is made on purpose.

## Determinism

- Fixed clock (2026-10-05 12:00, Asia/Jerusalem, en-US).
- Seeded `Math.random`.
- Service worker blocked.
- Fresh IndexedDB per context, seeded from `fixtures/demo.json`, which is the app's own made-up demo data.
- Single-threaded rasterisation.

Two full runs of v58 gave identical DOM in all 2,871 states. Screenshots matched in 2,869. The other two
were a 1 px wobble of the ♥ glyph in the Frosted Glass skin, which `recheck.cjs` reproduces identically
on both builds. A screenshot only passes as wobble when the candidate yields a byte-identical image that
the baseline also yields; there is no pixel tolerance.
