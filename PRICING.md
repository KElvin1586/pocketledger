# Pricing

PocketLedger is a freemium product with two plans.

## Plans

### Free — $0

- Income & expense tracking
- Category management (up to 12 categories)
- Dashboard with monthly totals
- Basic charts (Income vs Expenses, Category pie)
- Up to 150 transactions
- CSV export
- Responsive design — fully usable on mobile and desktop

### Premium — one-time payment

- Everything in Free
- Unlimited transactions and categories
- Budget creation with live progress
- Recurring transaction rules
- Multiple accounts/wallets
- Advanced reports (monthly summaries, all-time)
- Balance trend chart on the dashboard
- Full export/import (JSON backup & restore)

## Price configuration

The one-time price, currency, and checkout URL are configured at build time
through Vite environment variables (with defaults in `src/config.ts`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_PREMIUM_PRICE` | `1299` | Displayed price |
| `VITE_PREMIUM_CURRENCY` | `KES` | Currency label |
| `VITE_UPGRADE_URL` | the Lemon Squeezy checkout link | Checkout URL for the Upgrade modal |

The production checkout is the real Lemon Squeezy link configured in
`src/config.ts`. If a build overrides `VITE_UPGRADE_URL` with an empty value:

- **Development builds (`npm run dev`)** route the upgrade button to an internal
  `/checkout` page. This page is clearly labelled as a **development test
  checkout** and exists purely to exercise Free ↔ Premium entitlement flows.
  No payment is processed, requested, or simulated as successful.
- **Production builds** honestly show that no checkout URL is configured —
  the app never sends users to a placeholder or dummy domain.

## Upgrade & activation flow

```
Free user → 🔒 PREMIUM feature → Upgrade Modal → Upgrade button
  → Lemon Squeezy checkout (new tab) → pays → receives license key by email
  → Settings → "Activate Premium" → key verified against Lemon Squeezy's
    license API (POST /v1/licenses/activate) → Premium unlocks → persists
    in localStorage → re-validated against Lemon Squeezy on every app start
```

The license endpoints (`activate` / `validate` / `deactivate`) are
unauthenticated by Lemon Squeezy's design — the license key is the
credential — so no API key or secret is ever embedded in the frontend
bundle. A hand-written `{"plan":"premium"}` in localStorage is discarded
on load in production builds: Premium requires a stored license key plus
instance id. Offline revalidation failures keep the current plan
(offline-first); server-side rejection (revoked/expired/disabled/unknown
key) downgrades to Free.

The centralized entitlement lives in `src/entitlement/EntitlementContext.tsx`.
All premium actions go through `gate(feature)`; nothing is scattered across pages.

## Development test mode ≠ real customer payment

These are two completely separate things:

- **Development test mode** — `TEST_MODE_ENABLED` (in `src/config.ts`) is true
  only in non-production builds (`!import.meta.env.PROD`). When enabled, the
  Settings page shows a *Development Test Mode* panel with **Test as Premium** /
  **Test as Free** toggles, and the internal `/checkout` route is available,
  clearly labelled as a test page that never handles real money. This exists
  solely so developers can exercise the Free ↔ Premium entitlement flows.
- **Real customer payment** — handled entirely by your payment provider at the
  URL you configure in `VITE_UPGRADE_URL`. PocketLedger contains no payment
  code and never will; the provider's checkout page is the only place money
  moves.

Production builds hide the test-mode panel and the internal test checkout
route entirely. Nothing about test mode can unlock Premium for a real user.

## Connecting a real checkout

No payment SDK is bundled. To go live:

1. **Create the product** in your chosen payment provider (a one-time
   "PocketLedger Premium" product).
2. **Create the checkout / payment link** for that product in the provider's
   dashboard.
3. **Set `VITE_UPGRADE_URL` to that URL** — copy `.env.example` to `.env`
   (git-ignored) or pass it directly on the build command line.
4. **Rebuild the application** (`npm run build`) and deploy the new `dist/`.
   Vite environment variables are baked in at build time; changing `.env`
   without rebuilding has no effect.
5. **Test the checkout**: open the deployed app, trigger any 🔒 PREMIUM
   feature, click the upgrade button, and confirm it opens your real checkout.
   Use your provider's test/sandbox mode for the first run.
6. **Never put private API keys or payment secrets in `VITE_*` variables** —
   everything prefixed with `VITE_` is embedded in the public frontend bundle
   and visible to anyone. Payment credentials belong exclusively on the
   provider's backend. The checkout URL itself is a public link by design.

Until a real checkout URL is supplied, no payment flow exists and the app says
so. After a successful purchase, grant Premium by having the provider redirect
the customer to a success page you control, which sets the local entitlement:
`localStorage.setItem('pocketledger-entitlement', '{"plan":"premium"}')`
(or serve a confirm page built on top of your provider's SDK).

No license server, no payment credentials in the repo, no webhook secrets in
frontend code. All premium state stays client-side.
