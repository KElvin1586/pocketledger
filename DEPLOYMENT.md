# Deployment

PocketLedger builds to a fully static `dist/` folder — serve it with any static host.

## Build

```bash
npm run build
```

The result in `dist/` can be shipped as-is.

## Deploy targets

### GitHub Pages

A workflow (`.github/workflows/deploy.yml`) builds and deploys `dist/` on every
push to the `pocketledger` branch. The Vite `base` is `/pocketledger/`, so the
live URL is `https://kelvin1586.github.io/pocketledger/`.

One-time setup in the repository on GitHub:

1. Rename the repository to `pocketledger` (Settings → General → Repository
   name) so the Pages path matches the Vite base.
2. Make the repository public (Settings → General → Danger Zone) — GitHub
   Pages on private repos requires a paid plan.
3. Enable Pages with the Actions source: Settings → Pages → Source →
   **GitHub Actions**.

After that, every push deploys automatically. The app uses HashRouter, so no
404 rewrite rules are needed.

### Vercel / Netlify

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Cloudflare Pages

Same as above — no serverless functions needed.

### nginx / Apache / any static server

Copy `dist/` to your web root. That's it. Because the app uses HashRouter, no server rewrites are needed.

## Content-Security-Policy (optional)

The app does not require network access. If you want a strict CSP, allow only your own origin:

```
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'
```

(Vite may inline some styles, hence `'unsafe-inline'` for style-src.)

## Service worker / PWAs (optional)

The app is already offline-first by design (IndexedDB). If you want installability, add a PWA plugin such as `vite-plugin-pwa`; the app contents are fully static so it's a drop-in change.

## Configuration at build time

Use env vars to adjust pricing/URL before building. Copy `.env.example` to
`.env` (git-ignored) or pass variables inline:

```bash
VITE_UPGRADE_URL="<the checkout link from your payment provider>" \
VITE_PREMIUM_PRICE=9.99 \
VITE_PREMIUM_CURRENCY=USD \
npm run build
```

### Enabling the real Premium checkout

1. **Create the product** in your payment provider of choice (one-time
   "PocketLedger Premium").
2. **Create the checkout / payment link** in that provider's dashboard.
3. **Set `VITE_UPGRADE_URL`** to that exact link before building.
4. **Rebuild** (`npm run build`) and redeploy — Vite env vars are baked in at
   build time; editing `.env` without rebuilding does nothing.
5. **Test the checkout** on the deployed site: trigger a 🔒 PREMIUM feature,
   click the upgrade button, confirm your real checkout opens. Use the
   provider's sandbox/test mode first.
6. **Never put private API or payment secrets in `VITE_*` variables** — they
   are embedded in the public bundle. Credentials live only on the provider's
   backend.

The production build ships with the real Lemon Squeezy checkout link baked
in (`src/config.ts`); `VITE_UPGRADE_URL` only overrides it. If it were set to
an empty value, production would honestly tell users that checkout is not
configured — no placeholder URL, no fake payment screen.
Development builds additionally expose a clearly-labelled internal test
checkout and Free/Premium toggles; neither exists in the production bundle.

See [PRICING.md](./PRICING.md) for the full commercial configuration reference.
