import { Link } from 'react-router-dom';
import {
  PREMIUM_PRICE_LABEL,
  TEST_MODE_ENABLED,
  UPGRADE_URL,
} from '../config';
import type { Feature } from './EntitlementContext';
import { FEATURE_LABELS } from './EntitlementContext';
import { useDialogA11y } from '../components/Modal';
import { useId, useRef } from 'react';

const BENEFITS = [
  'Unlimited transactions and categories',
  'Budget tracking with progress',
  'Recurring transactions',
  'Multiple accounts and wallets',
  'Advanced reports and charts',
  'Full export/import and backups',
];

export function UpgradeModal({
  feature,
  onClose,
}: {
  feature: Feature | null;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useDialogA11y(root, onClose);
  if (feature === null) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            🔒 PREMIUM
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <h2 id={titleId} className="mt-3 text-xl font-bold text-slate-900">
          Upgrade to Premium
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {FEATURE_LABELS[feature]} is a Premium feature. A one-time payment
          unlocks everything — no subscription, no account.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="text-emerald-600" aria-hidden="true">✔</span>
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {UPGRADE_URL ? (
            <a
              href={UPGRADE_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring"
            >
              Upgrade for {PREMIUM_PRICE_LABEL}
            </a>
          ) : TEST_MODE_ENABLED ? (
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring"
            >
              Upgrade for {PREMIUM_PRICE_LABEL} — test checkout
            </Link>
          ) : (
            <p className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-center text-sm text-slate-500">
              A checkout URL has not been configured for this build.
            </p>
          )}
          {(UPGRADE_URL || TEST_MODE_ENABLED) && (
            <p className="mt-2 text-center text-xs text-slate-400">
              {UPGRADE_URL
                ? 'Opens the secure Lemon Squeezy checkout in a new tab.'
                : 'Opens the internal test checkout — no payment is processed.'}
            </p>
          )}
          {UPGRADE_URL && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Already purchased?{' '}
              <Link
                to="/settings"
                onClick={onClose}
                className="font-medium text-emerald-700 underline hover:text-emerald-800"
              >
                Activate your license key
              </Link>
            </p>
          )}
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={onClose}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
