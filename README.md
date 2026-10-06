# ZivugMatch v1.0

A private shidduch organizer. It runs in the browser (installable as an app), works offline, and
keeps all data on the device. No accounts, no server. The first launch shows made-up demo data;
Settings can clear it and start fresh.

## Screens

Recent · Guys · Shadchanim · Girls · Shidduchim, in both Single mode and Shadchan mode, with the
Warm Modern Dashboard look and 11 skins.

## How the data works

- **One record per real person.** Every way someone comes in (adding by hand, a list, a reference,
  a pasted message) goes through one matching check. "Not the same person" is remembered. Merges
  keep both records and can be undone.
- **One ledger.** Each real moment is written once, as one entry with a permanent id. Recent, a
  person's History, a shidduch's History and a list's progress are all views of it.
- **Offers come first.** Not applicable makes no shidduch. Interested makes the pair's one
  permanent shidduch; a pair suggested again after it ended gets Round 2 on the same record.
- **Dates keep one id** through moving, happening and feedback.
- **Open items** (My to-do, To hear back) close only by choice, each by the entry that settled it.
- **Profile versions are frozen.** A send records the exact version, files and words that went out.
- **Nothing is written by showing a screen,** switching mode or skin, searching or filtering.

The full rules are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). How v1.0 builds them, and
what looks different from v58, is in [`docs/V1_DESIGN.md`](docs/V1_DESIGN.md).

## Code

Plain scripts, loaded in order by `index.html`, with one click handler (`app-5.js`).

| File | Owns |
|---|---|
| `storage.js` | IndexedDB (`ZivugMatchDB`), saving, safety copies, the one-time upgrade, backups |
| `migrate.js` | The upgrade of v58 data to v1.0 records |
| `identity.js` | The matching check, "not the same person", merge and undo |
| `model.js` | Reading the records: people, entries, items, shidduchim, rounds, dates, sources |
| `ledger.js` | Writing entries and open items; the entry page |
| `profiles.js` | Profile versions and sending |
| `offers.js` | Offers, Not applicable, Interested, linking earlier history |
| `rounds.js` | Answers, dates, rounds |
| `items.js` | What's next?, after a contact |
| `sources.js`, `links.js`, `files.js`, `folders.js`, `intake.js` | Lists, references and family, files, folders, Paste and To file |
| the other `app-*.js` and screen files | The screens and sheets |

`node tools/set-version.cjs 1.0.0` sets Stable's version on every asset and in `sw.js` (bump it for a
Stable release).

## Stable and Test

- **Stable** (`main`) is served at `/zivugmatch/`, **Test** (`test`) at `/zivugmatch/test/`, from one
  deploy (`.github/workflows/pages.yml`). Test keeps its own database.
- **Test updates by itself.** The workflow stamps the Test copy with its commit
  (`tools/stamp-build.cjs`): every file address gets `?v=<commit>`, the service worker gets its own
  cache, and `build.txt` holds the build. Test loads network-first (past the browser's cache) and keeps
  its last copy for offline. When Test opens or comes back to the front, it compares `build.txt` with
  its own build and reloads into a newer one, or shows "New test version · Load" while a sheet or form
  is open. Settings shows the build (TEST · a92916f) with "Check now".
- **Stable** stays cache-first for offline use and never answers for `/test/`.
- From a commit on `test` to the phone: about 30 seconds of deploy, then switch to Test.

## Storage and upgrade

Data lives in IndexedDB, one store per kind of record. On the first start after updating from v58,
the old data is upgraded once. An untouched copy is kept as **Settings → Before v1.0** in the same
step, and the original v58 value is never changed. If the upgrade fails, nothing is written and the
app offers the original data as a file.

Backups (Settings) are a JSON file with every record and the content of every file. v58 backups
can be restored too; they are upgraded on the way in, and the data they replace can be brought back
with Undo.

## Tests

`tests/golden` holds the regression harness: every screen and sheet in 11 skins, 2 modes and 2
widths compared against the cleaned v58, functional checks, and the v1.0 acceptance tests
(`acceptance.cjs`). All test data is made up. See [`tests/golden/README.md`](tests/golden/README.md).
