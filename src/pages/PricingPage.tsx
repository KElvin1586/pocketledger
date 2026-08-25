import { useEntitlement } from '../entitlement/EntitlementContext';
import { PREMIUM_PRICE, PREMIUM_CURRENCY, APP_NAME } from '../config';

interface FeatureRow {
  name: string;
  free: string | boolean;
  premium: string | boolean;
}

const ROWS: FeatureRow[] = [
  { name: 'Income & expense tracking', free: true, premium: true },
  { name: 'Categories', free: 'Up to 12', premium: 'Unlimited' },
  { name: 'Transactions', free: 'Up to 150', premium: 'Unlimited' },
  { name: 'Dashboard & monthly totals', free: true, premium: true },
  { name: 'Income vs expenses chart', free: true, premium: true },
  { name: 'CSV export', free: true, premium: true },
  { name: 'Budgets with progress', free: false, premium: true },
  { name: 'Recurring transactions', free: false, premium: true },
  { name: 'Multiple accounts / wallets', free: false, premium: true },
  { name: 'Advanced reports (balance trend, summaries)', free: false, premium: true },
  { name: 'Balance trend chart on dashboard', free: false, premium: true },
  { name: 'JSON backup / restore', free: false, premium: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <span className="text-emerald-700">✔</span>;
  if (value === false) return <span className="text-slate-300">—</span>;
  return <span className="text-slate-700">{value}</span>;
}

export function PricingPage() {
  const { isPremium, openUpgrade } = useEntitlement();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">{APP_NAME} pricing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Offline-first, private by design. Upgrade once — no subscription.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Free</h2>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            $0 <span className="text-sm font-normal text-slate-500">forever</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Everything you need to track income and expenses, with a cap of 150
            transactions and 12 categories.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Premium</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Recommended
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {PREMIUM_PRICE} {PREMIUM_CURRENCY}{' '}
            <span className="text-sm font-normal text-slate-500">one-time</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Removes every limit and unlocks budgets, recurring, reports, wallets,
            and full backup/restore.
          </p>
          {!isPremium && (
            <button
              type="button"
              onClick={() => openUpgrade()}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700"
            >
              Upgrade to Premium
            </button>
          )}
          {isPremium && (
            <p className="mt-4 rounded-lg bg-emerald-600/10 px-3 py-2 text-center text-sm font-medium text-emerald-800">
              Premium active — thank you!
            </p>
          )}
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Feature</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">Free</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">Premium</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-slate-700">
                  {r.name}
                </th>
                <td className="px-4 py-2.5 text-center">
                  <Cell value={r.free} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Cell value={r.premium} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="rounded-2xl bg-slate-100 p-4 text-center text-xs text-slate-500">
        All your financial data stays in this browser — no account, no
        telemetry. Payment is handled by Lemon Squeezy; after purchase you
        receive a license key by email and activate it in Settings. Only the
        license check ever leaves your browser — never your financial data.
      </footer>
    </div>
  );
}
