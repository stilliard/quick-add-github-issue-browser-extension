# Agent Guide (build/test/style)

This repository is a small WebExtension (Chrome + Firefox) that opens a pre-filled GitHub “new issue” URL from the extension popup.

## Quick facts

- Package manager: **npm** (`package-lock.json` exists)
- Bundler: **webpack** (entry: `popup/app.js`, output: `popup/dist/app.js`)
- Extension manifest: `manifest.json` (**Manifest V3**)
- Packaging: `web-ext` via `make build` (outputs to `web-ext-artifacts/`)
- Cursor/Copilot rules: **none found** (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md` not present)

## Setup / install

```bash
npm ci
# or: npm install
```

Local-only config (required for the popup to run):

```bash
cp popup/config.js.example popup/config.js
# edit popup/config.js and set a random secret
```

Do **not** commit `popup/config.js` (it is gitignored).

## Build / watch / package

```bash
npm run build
```

```bash
npm run watch
```

```bash
# one-time tool install (as documented in Makefile)
npm install --global web-ext

# build bundle first so popup/dist/app.js is up to date
npm run build

# produce zip in web-ext-artifacts/
make build
```

Notes:
- `make build` runs `web-ext build --overwrite-dest` (overwrites existing artifact).
- The zip name/version comes from `manifest.json`.

## Lint / format

There is **no ESLint/Prettier configuration** and no `npm run lint` / `npm test` scripts in this repo today.

Closest “sanity check” is running a production bundle:

```bash
npm run build
```

Optional (if you have `web-ext`):

```bash
web-ext lint
# or: npx web-ext lint
```

## Tests

There is currently **no automated unit/integration test runner** configured.

### Running a single test

Not applicable (no test framework present). If you add tests, add scripts for both full suite + single test (example: `"test:one": "vitest -t"`).

### Manual smoke test (recommended)

1. `npm run build`
2. Load unpacked:
   - Chrome: `chrome://extensions` → Developer mode → Load unpacked → select repo folder
   - Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → select `manifest.json`
3. Open popup → set GitHub PAT (+ optional org) → create issue → verify URL/body/labels/projects + screenshot flow

Optional Firefox dev loop:

```bash
web-ext run
```

## Code style & conventions (repo-specific)

### Formatting

- Follow `.editorconfig`:
  - **4 spaces** indentation
  - LF, UTF-8, trim trailing whitespace, final newline
- Keep lines readable; prefer small helper functions over deep nesting.

### Imports / dependencies

- Webpack entry (`popup/app.js`) uses **CommonJS** `require(...)` for npm deps.
- Popup “modules” in `popup/modules/*.js` are loaded via `<script>` tags and expose globals on `window` (e.g. `window.Settings`, `window.Screen`, `window.IssueForm`).
- Prefer this pattern when adding new popup modules:
  - encapsulate in an IIFE
  - export a single object on `window.*`
  - keep DOM wiring near the screen/module that owns it

### Naming

- Files: `lowercase-with-dashes.js` (existing: `hidden-checkbox.js`, `issue-form.js`)
- Globals/modules: `PascalCase` on `window` (existing: `Settings`, `Screen`, `IssueForm`)
- Functions/vars: `camelCase`; constants: `UPPER_SNAKE_CASE`

### Types

- This is plain JavaScript (no TypeScript). When behavior is non-obvious, add **small JSDoc** (especially for public module APIs).

### Error handling

- Treat boundaries as “error zones”:
  - network calls (Octokit REST/GraphQL)
  - `chrome.*` callbacks
  - storage decrypt/JSON parse
- Prefer explicit handling:
  - add `.catch(...)` for Promises
  - show a user-friendly message in the popup (avoid silent failures)
  - don’t leak internals or stack traces to end users

### Security / secrets

- Never log or persist secrets in plaintext.
- `popup/config.js` contains the encryption secret; keep it local.
- Never print the GitHub token to console/logs.
- Be careful changing `host_permissions` / `permissions` in `manifest.json` (least privilege).

### Browser APIs / compatibility

- Manifest is MV3; popup code uses `chrome.tabs.*`, `chrome.storage.local.*`.
- Keep behaviors compatible with both Chrome and Firefox where possible.

## Repo structure (what to touch)

- `popup/app.js`: main popup logic (bundled by webpack)
- `popup/modules/*.js`: global modules used by the popup HTML
- `popup/app.html`, `popup/app.css`: popup UI
- `manifest.json`: extension metadata/permissions/version
