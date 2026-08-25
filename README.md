# PocketLedger

A production-ready, offline-first personal income & expense tracker. All data lives in your browser — no accounts, no servers, no tracking.

## Features

- **Dashboard** with balance, monthly income/expense totals, savings rate, and charts
- **Transactions** with full CRUD, search, and preset/custom date filtering
- **Categories** with colors, archive states, and type filtering (income/expense)
- **Budgets** (Premium) with per-category monthly limits and live progress
- **Recurring transactions** (Premium) with daily/weekly/monthly/yearly rules
- **Multiple accounts/wallets** (Premium) — track Cash, Bank, etc.
- **Reports** (Premium): balance trend, top categories, monthly summaries
- **Export/Import**: full JSON backup/restore with referential-integrity validation + CSV export
- **Freemium model**: centralized entitlement system with a Free plan (up to 150 transactions, 12 categories) and Premium unlock (configurable one-time price, default $9.99)
- **Pricing page** with professional Free/Premium comparison and upgrade CTA
- **No fake payments**: the built-in `Upgrade` action links to the configurable checkout URL; development builds also expose a clearly-labelled **development test checkout** page and **dev-only free/premium toggles** on Settings
- **Privacy**: financial data never leaves the browser; the only outbound request is the configurable upgrade URL
- **Responsive design** powered by Tailwind CSS (sidebar on desktop, bottom navigation on mobile)

## Tech stack

- React 19, TypeScript, Vite 7
- Tailwind CSS 4
- Dexie (IndexedDB) for persistence
- recharts for charts
- Vitest + Testing Library for tests

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build
npm test           # run the test suite
```

## Project layout

```
src/
├── config.ts            # entitlement, pricing, feature flags
├── domain/              # pure logic: money, dates, calculations, CSV, validators
├── data/                # Dexie database, repository, seed data, import/export
├── entitlement/         # Free/Premium context, gates, badges, upgrade modal
├── hooks/               # central data-loading provider
├── components/          # layout, modal, icons, charts, transaction form
└── pages/               # Dashboard, Transactions, Categories, Budgets,
                         # Recurring, Reports, Settings
tests/                   # unit + UI tests (vitest)
```

## Freemium gating

Premium features show a 🔒 PREMIUM badge in navigation, render a gate screen, and open the centralized upgrade modal. Free users can never exceed `FREE_TRANSACTION_LIMIT` transactions — the gate is requested from the centralized `gate(feature)` helper in `EntitlementContext`.

The upgrade action resolves like this:

1. The button opens the real **Lemon Squeezy checkout** (configurable via `VITE_UPGRADE_URL` at build time) in a new tab. Clicking it never unlocks Premium by itself.
2. After paying, the customer receives a **license key** by email and activates it in **Settings → Activate Premium**. The key is verified against Lemon Squeezy's real license API — no API key or secret is embedded in the bundle (the license endpoints are unauthenticated by design).
3. Premium persists in localStorage and is **re-validated against Lemon Squeezy on every app start**; revoked/expired licenses are downgraded to Free. A hand-written `{"plan":"premium"}` in localStorage is discarded on load in production builds.
4. **Development builds only** additionally route to `#/checkout` — an internal test-checkout page prominently labelled as a development tool that never processes money.

Development additionally shows a **Development Test Mode** panel in Settings with *Test as Premium* / *Test as Free* toggles (hidden entirely in production).

## Security & privacy

- Amounts are stored as **integer cents** internally to avoid float drift; parsing/formatting lives in one module.
- All user input is validated (`domain/validators.ts`) before persistence.
- Import JSON is validated structurally, with referential-integrity checks (transactions must reference known categories/accounts).
- No analytics, tracking, or server calls.

## Documentation

- [USER-GUIDE.md](./USER-GUIDE.md) — how to use every feature
- [INSTALLATION.md](./INSTALLATION.md) — local setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) — static hosting guide
- [PRICING.md](./PRICING.md) — Free/Premium comparison and configuration
- [CHANGELOG.md](./CHANGELOG.md) — release notes
- [LICENSE.md](./LICENSE.md) — MIT
- [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) — notes for commercial redistribution

## Pricing

Free: **$0** (limited transactions and categories). Premium: **$9.99 one-time**
(configurable via `VITE_PREMIUM_PRICE` / `VITE_PREMIUM_CURRENCY` /
`VITE_UPGRADE_URL`). See [PRICING.md](./PRICING.md) for the full comparison and
integration notes.
