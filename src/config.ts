/**
 * Central app configuration.
 *
 * The production checkout is a real Lemon Squeezy checkout link (public
 * information, safe to embed). VITE_UPGRADE_URL can override it at build
 * time. When no URL is configured, development builds fall back to the
 * internal test checkout page, and production builds honestly report
 * that checkout is not configured instead of using a placeholder domain.
 */
export const APP_NAME = 'PocketLedger';
export const APP_VERSION = '1.0.0';

export const PREMIUM_PRICE =
  (import.meta.env.VITE_PREMIUM_PRICE as string | undefined) ?? '1299';
export const PREMIUM_CURRENCY =
  (import.meta.env.VITE_PREMIUM_CURRENCY as string | undefined) ?? 'KES';

const LEMONSQUEEZY_CHECKOUT_URL =
  'https://kelvindigitaltools.lemonsqueezy.com/checkout/buy/5a9a0680-dbb4-4c1b-b38c-02c8bbd20fe1';

/** Configured checkout URL. Empty means "not configured". */
export const UPGRADE_URL: string =
  (import.meta.env.VITE_UPGRADE_URL as string | undefined) ??
  LEMONSQUEEZY_CHECKOUT_URL;

/**
 * Development-only entitlement test mode. Flipping Free ↔ Premium
 * without real money is allowed only in non-production builds.
 */
export const TEST_MODE_ENABLED: boolean = !import.meta.env.PROD;

/**
 * Human-readable price label. When the checkout currency is KES (or any
 * non-USD currency), show the amount with its real currency and an
 * approximate USD equivalent instead of a misleading "$1299".
 */
export const PREMIUM_PRICE_LABEL =
  PREMIUM_CURRENCY === 'KES'
    ? `KES ${PREMIUM_PRICE} (≈ $10 USD)`
    : PREMIUM_CURRENCY === 'USD'
      ? `$${PREMIUM_PRICE} USD`
      : `${PREMIUM_PRICE} ${PREMIUM_CURRENCY}`;

/** Free-plan limits. */
export const FREE_TRANSACTION_LIMIT = 150;
export const FREE_CATEGORY_LIMIT = 12;

export type Plan = 'free' | 'premium';
