import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { TEST_MODE_ENABLED, type Plan } from '../config';
import { UpgradeModal } from './UpgradeModal';
import {
  activateLicense,
  deactivateLicense,
  validateLicense,
  type LicenseResult,
} from './lemonSqueezy';

export type Feature =
  | 'unlimited-transactions'
  | 'unlimited-categories'
  | 'multiple-accounts'
  | 'budgets'
  | 'recurring'
  | 'advanced-reports'
  | 'advanced-charts'
  | 'full-export-import';

const FEATURE_LABELS: Record<Feature, string> = {
  'unlimited-transactions': 'Unlimited transactions',
  'unlimited-categories': 'Unlimited categories',
  'multiple-accounts': 'Multiple accounts',
  budgets: 'Budgets',
  recurring: 'Recurring transactions',
  'advanced-reports': 'Advanced reports',
  'advanced-charts': 'Advanced charts',
  'full-export-import': 'Full export/import',
};

const ENTITLEMENT_KEY = 'pocketledger-entitlement';

export interface StoredEntitlement {
  plan?: Plan;
  licenseKey?: string;
  instanceId?: string;
  activatedAt?: string;
}

function readStored(): StoredEntitlement {
  try {
    const raw = localStorage.getItem(ENTITLEMENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredEntitlement;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Premium must be backed by a stored Lemon Squeezy license key. In
 * production a bare {"plan":"premium"} written into localStorage by hand
 * is discarded on load; the dev-only test mode is the single exception.
 */
export function resolveInitialPlan(
  stored: StoredEntitlement,
  testModeEnabled: boolean,
): Plan {
  if (stored.plan !== 'premium') return 'free';
  if (stored.licenseKey && stored.instanceId) return 'premium';
  return testModeEnabled ? 'premium' : 'free';
}

export interface Entitlement {
  plan: Plan;
  isPremium: boolean;
  /** Last 4 characters of the activated license key, when premium. */
  licenseKeyHint: string | null;
  canUse(feature: Feature): boolean;
  /**
   * Gate a premium action. Returns true when execution may continue,
   * and shows the upgrade modal otherwise.
   */
  gate(feature: Feature): boolean;
  /** Open the upgrade modal without gating a specific feature. */
  openUpgrade(feature?: Feature): void;
  /**
   * Activate Premium with a Lemon Squeezy license key. The key is
   * verified against Lemon Squeezy's real license API; Premium is only
   * granted when the server confirms activation.
   */
  activatePremium(licenseKey: string): Promise<LicenseResult>;
  /** Deactivate this device's license and return to the Free plan. */
  deactivatePremium(): Promise<void>;
  /** Dev test-mode only: flip the plan without payment. */
  setPlan(plan: Plan): void;
}

const Ctx = createContext<Entitlement | undefined>(undefined);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredEntitlement>(() => {
    const s = readStored();
    return { ...s, plan: resolveInitialPlan(s, TEST_MODE_ENABLED) };
  });
  const [pendingFeature, setPendingFeature] = useState<Feature | null>(null);

  const plan: Plan = stored.plan === 'premium' ? 'premium' : 'free';

  useEffect(() => {
    localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(stored));
  }, [stored]);

  // Re-validate the stored license against Lemon Squeezy on app start.
  // A revoked/expired license must not keep Premium unlocked. Network
  // failures keep the current plan: this is an offline-first app and a
  // previously validated license stays valid while offline.
  useEffect(() => {
    if (plan !== 'premium' || !stored.licenseKey || !stored.instanceId) return;
    const key = stored.licenseKey;
    const instance = stored.instanceId;
    let cancelled = false;
    void validateLicense(key, instance).then((result) => {
      if (cancelled) return;
      if (!result.ok && result.reason !== 'network') {
        setStored({ plan: 'free' });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPremium = plan === 'premium';
  const licenseKeyHint = isPremium && stored.licenseKey
    ? stored.licenseKey.slice(-4)
    : null;

  const canUse = useCallback((_feature: Feature) => isPremium, [isPremium]);
  const gate = useCallback(
    (f: Feature) => {
      if (isPremium) return true;
      setPendingFeature(f);
      return false;
    },
    [isPremium],
  );
  const openUpgrade = useCallback((f?: Feature) => {
    setPendingFeature(f ?? 'advanced-reports');
  }, []);
  const setPlan = useCallback(
    (p: Plan) => setStored((s) => ({ ...s, plan: p })),
    [],
  );

  const activatePremium = useCallback(
    async (licenseKey: string): Promise<LicenseResult> => {
      const result = await activateLicense(licenseKey.trim());
      if (result.ok) {
        setStored({
          plan: 'premium',
          licenseKey: licenseKey.trim(),
          instanceId: result.instanceId,
          activatedAt: new Date().toISOString(),
        });
      }
      return result;
    },
    [],
  );

  const deactivatePremium = useCallback(async () => {
    const { licenseKey, instanceId } = stored;
    setStored({ plan: 'free' });
    if (licenseKey && instanceId) {
      await deactivateLicense(licenseKey, instanceId);
    }
  }, [stored]);

  const value = useMemo<Entitlement>(
    () => ({
      plan,
      isPremium,
      licenseKeyHint,
      canUse,
      gate,
      openUpgrade,
      activatePremium,
      deactivatePremium,
      setPlan,
    }),
    [
      plan,
      isPremium,
      licenseKeyHint,
      canUse,
      gate,
      openUpgrade,
      activatePremium,
      deactivatePremium,
      setPlan,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <UpgradeModal
        feature={pendingFeature}
        onClose={() => setPendingFeature(null)}
      />
    </Ctx.Provider>
  );
}

export function useEntitlement(): Entitlement {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEntitlement outside EntitlementProvider');
  return ctx;
}

export { FEATURE_LABELS };
