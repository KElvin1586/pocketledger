/**
 * Lemon Squeezy license API client.
 *
 * The /v1/licenses/activate, /validate and /deactivate endpoints are
 * intentionally unauthenticated (Lemon Squeezy designed them to be called
 * from client software), so no API key is ever embedded in this bundle.
 * The license key itself is the credential.
 */

const API_BASE = 'https://api.lemonsqueezy.com/v1/licenses';

export type LicenseErrorReason =
  | 'not-found'
  | 'expired'
  | 'disabled'
  | 'inactive'
  | 'limit-reached'
  | 'network'
  | 'unknown';

export interface LicenseSuccess {
  ok: true;
  instanceId: string;
  status: string;
}

export interface LicenseFailure {
  ok: false;
  reason: LicenseErrorReason;
  message: string;
}

export type LicenseResult = LicenseSuccess | LicenseFailure;

export const LICENSE_ERROR_MESSAGES: Record<LicenseErrorReason, string> = {
  'not-found':
    'This license key was not found. Check for typos — it must match the key in your Lemon Squeezy receipt email.',
  expired: 'This license has expired.',
  disabled: 'This license has been disabled or revoked. Contact support if you believe this is a mistake.',
  inactive: 'This license key is not active.',
  'limit-reached':
    'This license is already active on the maximum number of devices. Deactivate it on another device first.',
  network:
    'Could not reach the license server. Check your internet connection and try again.',
  unknown: 'The license server rejected this key. Please check it and try again.',
};

function classifyError(errorText: string, status?: string): LicenseErrorReason {
  const text = errorText.toLowerCase();
  if (text.includes('not found')) return 'not-found';
  if (text.includes('expired') || status === 'expired') return 'expired';
  if (text.includes('disabled') || status === 'disabled') return 'disabled';
  if (text.includes('limit') || text.includes('activation')) return 'limit-reached';
  if (status === 'inactive') return 'inactive';
  return 'unknown';
}

async function post(
  endpoint: string,
  body: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

function fail(reason: LicenseErrorReason): LicenseFailure {
  return { ok: false, reason, message: LICENSE_ERROR_MESSAGES[reason] };
}

/**
 * Activate a license key on this device/browser. On success Lemon Squeezy
 * returns an instance id that must be stored for later validation.
 */
export async function activateLicense(licenseKey: string): Promise<LicenseResult> {
  try {
    const { json } = await post('activate', {
      license_key: licenseKey,
      instance_name: 'pocketledger-web',
    });
    if (json.activated === true) {
      const instance = json.instance as { id?: string } | undefined;
      const licenseKeyMeta = json.license_key as { status?: string } | undefined;
      return {
        ok: true,
        instanceId: instance?.id ?? '',
        status: licenseKeyMeta?.status ?? 'active',
      };
    }
    return fail(classifyError(String(json.error ?? '')));
  } catch {
    return fail('network');
  }
}

/**
 * Re-validate a previously activated license. Used on app start so a
 * revoked/expired license does not keep Premium unlocked forever.
 */
export async function validateLicense(
  licenseKey: string,
  instanceId: string,
): Promise<LicenseResult> {
  try {
    const { json } = await post('validate', {
      license_key: licenseKey,
      instance_id: instanceId,
    });
    if (json.valid === true) {
      const licenseKeyMeta = json.license_key as { status?: string } | undefined;
      const status = licenseKeyMeta?.status ?? 'active';
      if (status !== 'active') return fail(classifyError('', status));
      return { ok: true, instanceId, status };
    }
    const licenseKeyMeta = json.license_key as { status?: string } | undefined;
    return fail(classifyError(String(json.error ?? ''), licenseKeyMeta?.status));
  } catch {
    return fail('network');
  }
}

/** Deactivate this device's instance, freeing an activation seat. */
export async function deactivateLicense(
  licenseKey: string,
  instanceId: string,
): Promise<boolean> {
  try {
    const { json } = await post('deactivate', {
      license_key: licenseKey,
      instance_id: instanceId,
    });
    return json.deactivated === true;
  } catch {
    return false;
  }
}
