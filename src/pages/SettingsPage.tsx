import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TEST_MODE_ENABLED } from '../config';
import { useData } from '../hooks/DataProvider';
import { useEntitlement } from '../entitlement/EntitlementContext';
import { buildExportPayload, importJSON } from '../data/importExport';
import { downloadFile } from '../utils/download';
import { toCsv } from '../domain/csvCodec';
import { addAccount, deleteAccount } from '../data/repo';
import { db } from '../data/db';
import { validateText } from '../domain/validators';
import { Modal } from '../components/Modal';
import { PremiumBadge } from '../components/premium/PremiumBadge';
import { DownloadIcon, UploadIcon, TrashIcon } from '../components/Icons';

export function SettingsPage() {
  const { transactions, categories, accounts, settings, refresh } = useData();
  const entitlement = useEntitlement();
  const fileInput = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currencySel, setCurrencySel] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [mergeMode, setMergeMode] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);

  async function handleActivate() {
    const key = licenseKey.trim();
    if (!key) {
      setActivationMsg({ kind: 'error', text: 'Enter your license key first.' });
      return;
    }
    setActivating(true);
    setActivationMsg(null);
    const result = await entitlement.activatePremium(key);
    setActivating(false);
    if (result.ok) {
      setLicenseKey('');
      setActivationMsg({
        kind: 'success',
        text: 'License verified — Premium is now active on this device.',
      });
    } else {
      setActivationMsg({ kind: 'error', text: result.message });
    }
  }

  async function handleDeactivate() {
    await entitlement.deactivatePremium();
    setActivationMsg({
      kind: 'success',
      text: 'License deactivated on this device. You are back on the Free plan.',
    });
  }

  const currency = settings?.currency ?? 'USD';

  function exportJSON() {
    if (!entitlement.gate('full-export-import')) return;
    void buildExportPayload().then((payload) => {
      const name = `pocketledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(name, JSON.stringify(payload, null, 2), 'application/json');
      setStatus('Backup exported.');
    });
  }

  function exportCSV() {
    const header = ['id', 'date', 'type', 'category', 'account', 'amount', 'note'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      categories.find((c) => c.id === t.categoryId)?.name ?? '',
      accounts.find((a) => a.id === t.accountId)?.name ?? '',
      (t.amount / 100).toFixed(2),
      t.note,
    ]);
    const name = `pocketledger-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(name, toCsv(header, rows), 'text/csv');
    setStatus('CSV exported.');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!entitlement.gate('full-export-import')) {
      e.target.value = '';
      return;
    }
    setError(null);
    setStatus(null);
    const text = await file.text();
    const result = await importJSON(text, !mergeMode);
    if (!result.ok) {
      setError(`Import failed: ${result.errors[0] ?? 'Unknown error.'}`);
      setStatus(null);
    } else {
      const s = result.summary!;
      setStatus(
        `Imported ${s.transactions} transactions, ${s.categories} categories, ${s.accounts} accounts, ${s.budgets} budgets, ${s.recurring} recurring rules${s.duplicates ? ` (${s.duplicates} duplicate${s.duplicates === 1 ? '' : 's'} skipped)` : ''}.`,
      );
      await refresh();
    }
    e.target.value = '';
  }

  async function saveCurrency() {
    const next = (currencySel ?? currency).toUpperCase();
    if (next.length !== 3) {
      setError('Use a 3-letter currency code like USD or EUR.');
      return;
    }
    if (settings) {
      await db.settings.put({ ...settings, currency: next });
    } else {
      await db.settings.put({ id: 'settings', currency: next, createdAt: Date.now() });
    }
    setError(null);
    setStatus(`Currency set to ${next}.`);
    await refresh();
  }

  async function handleAddAccount() {
    if (!entitlement.gate('multiple-accounts')) return;
    const problem = validateText(newAccountName, 'Account name');
    if (problem) {
      setError(problem);
      return;
    }
    if (accounts.some((a) => a.name.toLowerCase() === newAccountName.trim().toLowerCase())) {
      setError('An account with this name already exists.');
      return;
    }
    await addAccount(newAccountName.trim());
    setNewAccountName('');
    setError(null);
    setStatus('Account added.');
    await refresh();
  }

  async function reset() {
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.accounts.clear(),
      db.budgets.clear(),
      db.recurring.clear(),
    ]);
    setConfirmReset(false);
    await refresh();
    setStatus('Ledger cleared.');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage plan, accounts, and data portability.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center font-semibold text-slate-800">
          Plan
          {!entitlement.isPremium && <PremiumBadge feature="unlimited-transactions" />}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Current plan: <strong>{entitlement.plan}</strong>
          {entitlement.isPremium
            ? ` — everything is unlocked${entitlement.licenseKeyHint ? ` (license …${entitlement.licenseKeyHint})` : ''}.`
            : ' — free limits apply.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            View plans &amp; pricing
          </Link>
        </div>

        {entitlement.isPremium ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-900">
              Premium is active on this device
              {entitlement.licenseKeyHint && (
                <> — license key ending in <strong>…{entitlement.licenseKeyHint}</strong></>
              )}
              .
            </p>
            {entitlement.licenseKeyHint && (
              <button
                type="button"
                onClick={() => void handleDeactivate()}
                className="mt-2 rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Deactivate license on this device
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Activate Premium with a license key
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              After purchasing, Lemon Squeezy emails you a license key. Paste it
              here — it is verified directly with Lemon Squeezy&apos;s license
              server.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                autoComplete="off"
                spellCheck={false}
                aria-label="License key"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={activating}
                onClick={() => void handleActivate()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {activating ? 'Verifying…' : 'Activate Premium'}
              </button>
            </div>
          </div>
        )}

        {activationMsg && (
          <p
            role={activationMsg.kind === 'error' ? 'alert' : 'status'}
            className={`mt-3 text-sm ${activationMsg.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {activationMsg.text}
          </p>
        )}

        <p className="mt-3 text-xs text-slate-400">
          Your financial data never leaves this browser. Only license
          activation contacts Lemon Squeezy&apos;s license server — to verify
          your key; no financial data is ever sent.
        </p>

        {TEST_MODE_ENABLED && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">
              Development test mode
            </h3>
            <p className="mt-1 text-xs text-amber-800">
              Toggle the entitlement locally without processing money. This panel
              is disabled in production builds.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  entitlement.setPlan('premium');
                  setStatus('Test mode: Premium enabled.');
                }}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Test as Premium
              </button>
              <button
                type="button"
                onClick={() => {
                  entitlement.setPlan('free');
                  setStatus('Test mode: back to Free.');
                }}
                className="rounded-lg border border-amber-600 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                Test as Free
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center font-semibold text-slate-800">
          Accounts
          {!entitlement.isPremium && <PremiumBadge feature="multiple-accounts" />}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-lg py-1.5">
              <span className="text-slate-700">{a.name}</span>
              {accounts.length > 1 && entitlement.isPremium && (
                <button
                  type="button"
                  aria-label={`Delete ${a.name}`}
                  onClick={async () => {
                    if (transactions.some((t) => t.accountId === a.id)) {
                      setError(`"${a.name}" has transactions and cannot be removed.`);
                      return;
                    }
                    await deleteAccount(a.id);
                    setStatus(`Account "${a.name}" removed.`);
                    setError(null);
                    await refresh();
                  }}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="e.g. Bank, Wallet"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddAccount}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Free accounts have one default wallet. Premium unlocks wallets and bank accounts.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">Currency</h2>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={currencySel ?? currency}
            onChange={(e) => setCurrencySel(e.target.value)}
            placeholder="USD"
            maxLength={3}
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase"
          />
          <button
            type="button"
            onClick={saveCurrency}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Save
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">Export, import & backups</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV <span className="text-xs text-emerald-600">Free</span>
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export backup (JSON)
            {!entitlement.canUse('full-export-import') && <PremiumBadge feature="full-export-import" />}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UploadIcon className="h-4 w-4" />
              Import JSON
              {!entitlement.canUse('full-export-import') && <PremiumBadge feature="full-export-import" />}
            </button>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={mergeMode}
                onChange={(e) => setMergeMode(e.target.checked)}
              />
              Merge instead of replace
            </label>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
        {status && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-600">
          Clear all transactions, categories, budgets, and accounts in this browser.
        </p>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          Erase everything
        </button>
      </section>

      {confirmReset && (
        <Modal title="Erase everything" onClose={() => setConfirmReset(false)}>
          <p className="text-sm text-slate-600">
            This removes all transactions, budgets, categories, and accounts in this browser.
            This cannot be undone. Export a backup first if you need the data.
          </p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={reset} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">
              Erase everything
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
