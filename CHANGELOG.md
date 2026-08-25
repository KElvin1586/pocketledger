# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- Real Lemon Squeezy checkout wired as the production upgrade URL
- License-key activation flow: Settings → "Activate Premium" verifies keys
  against Lemon Squeezy's real license API (activate/validate/deactivate —
  unauthenticated endpoints by design, so no secret in the bundle)
- Premium re-validation on every app start; revoked/expired/disabled licenses
  downgrade to Free, offline failures keep the current plan
- localStorage tamper protection: a bare `{"plan":"premium"}` without a
  license key is discarded on load in production builds
- Clear error states for unknown, expired, disabled, and seat-limited licenses
- "Already purchased? Activate your license key" link in the upgrade modal

## [1.0.0] — 2026-08-25

### Added

- Dashboard with balance, monthly income/expense, savings rate, 6-month chart, category pie, and recent transactions
- Full transaction CRUD with search and date-range filtering
- Categories with archive state and custom colors
- Budgets (Premium) with spending progress
- Recurring transactions (Premium) — daily/weekly/monthly/yearly
- Multiple accounts/wallets (Premium)
- Reports page (Premium) with balance trend, top categories, and monthly summaries
- CSV export (Free) — full backup/restore and import with referential-integrity validation (Premium)
- Freemium entitlement system with 🔒 PREMIUM badges, gates, and upgrade modal
- Pricing page with Free/Premium comparison table and upgrade CTA
- Development-only Free ↔ Premium test mode in Settings + internal test checkout page
- Centralized input validation in `domain/validators.ts`
- Responsive layout (desktop sidebar / mobile bottom navigation)
- 65 unit & UI tests with vitest

### Changed (commercial hardening pass)

- Removed placeholder upgrade URL default; `VITE_UPGRADE_URL` is now
  optional and honestly reflected in the Upgrade modal when unset
- Upgrade modal now has proper dialog accessibility (focus trap, Esc,
  aria-labelledby) and shows which feature was gated
- All dialogs share that accessibility foundation (focus management,
  focus restore)
- Fixed entitlement provider ordering so router context is available to
  the upgrade modal (was a real crash on `/checkout`)
- Added SEO/OG metadata and a robots directive
- Documentation: added PRICING.md, COMMERCIAL-LICENSE.md, and renamed LICENSE → LICENSE.md
