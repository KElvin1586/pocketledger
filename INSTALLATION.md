# Installation

PocketLedger is a standard Vite + React project.

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (Vite 7 requirement)
- npm (comes with Node)

## Install

```bash
git clone <this repo>
cd pocketledger
npm install
```

## Run the dev server

```bash
npm run dev
```

Open http://localhost:5173/ — the app is fully offline and works from the local dev server.

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview it locally:

```bash
npm run preview   # http://localhost:4173
```

## Run tests

```bash
npm test          # vitest (jsdom + fake-indexeddb)
npm run test:ui   # interactive vitest UI (optional)
```

The test suite covers money/date/calculation logic, storage & repository CRUD, CSV escaping, import/export validation, entitlement gating, and UI smoke tests.

## Configuration

Configuration lives in `src/config.ts` and is driven by Vite environment
variables (see `PRICING.md` for the full schema):

```
# .env
VITE_UPGRADE_URL=
VITE_PREMIUM_PRICE=1299
VITE_PREMIUM_CURRENCY=KES
```

Behavior:

- `VITE_UPGRADE_URL` empty and **development** build → Upgrade modal links to
  the internal development test checkout page (`#/checkout`).
- `VITE_UPGRADE_URL` empty and **production** build → the modal honestly states
  that no checkout URL is configured (never a placeholder domain).
- `VITE_UPGRADE_URL` set → Upgrade modal links to that URL regardless.

## Browser requirements

IndexedDB is required — every evergreen browser (Chrome, Edge, Firefox, Safari ≥ 16) supports it. The app never touches the network except to load assets.
