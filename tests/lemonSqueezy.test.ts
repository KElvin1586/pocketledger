import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  activateLicense,
  validateLicense,
  deactivateLicense,
  LICENSE_ERROR_MESSAGES,
} from '../src/entitlement/lemonSqueezy';
import { resolveInitialPlan } from '../src/entitlement/EntitlementContext';

// fetch is stubbed here because a real Lemon Squeezy license key can only
// exist after a real purchase; the unit under test is the request shape and
// response mapping against Lemon Squeezy's documented API contract.

function stubFetch(json: Record<string, unknown>, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      status,
      json: async () => json,
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('lemonSqueezy license API client', () => {
  it('activateLicense posts the key and instance name to the real endpoint', async () => {
    stubFetch({
      activated: true,
      license_key: { status: 'active' },
      instance: { id: 'inst-123' },
    });
    const result = await activateLicense('KEY-ABC');
    expect(result).toEqual({ ok: true, instanceId: 'inst-123', status: 'active' });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.lemonsqueezy.com/v1/licenses/activate');
    expect(JSON.parse(String(init?.body))).toEqual({
      license_key: 'KEY-ABC',
      instance_name: 'pocketledger-web',
    });
  });

  it('maps "license_key not found" to the not-found error', async () => {
    stubFetch({ activated: false, error: 'license_key not found.' });
    const result = await activateLicense('NOPE');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not-found');
      expect(result.message).toBe(LICENSE_ERROR_MESSAGES['not-found']);
    }
  });

  it('maps activation-limit errors to limit-reached', async () => {
    stubFetch({
      activated: false,
      error: 'license_key activation limit reached.',
    });
    const result = await activateLicense('FULL');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('limit-reached');
  });

  it('validateLicense returns ok for an active license', async () => {
    stubFetch({ valid: true, license_key: { status: 'active' } });
    const result = await validateLicense('KEY', 'inst-1');
    expect(result).toEqual({ ok: true, instanceId: 'inst-1', status: 'active' });
  });

  it('validateLicense rejects expired licenses', async () => {
    stubFetch({ valid: false, license_key: { status: 'expired' }, error: '' });
    const result = await validateLicense('KEY', 'inst-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('expired');
  });

  it('validateLicense rejects disabled/revoked licenses', async () => {
    stubFetch({ valid: false, license_key: { status: 'disabled' }, error: '' });
    const result = await validateLicense('KEY', 'inst-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('disabled');
  });

  it('network failures map to the network reason', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const result = await validateLicense('KEY', 'inst-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('network');
  });

  it('deactivateLicense reports success', async () => {
    stubFetch({ deactivated: true });
    expect(await deactivateLicense('KEY', 'inst-1')).toBe(true);
  });
});

describe('resolveInitialPlan (localStorage tamper protection)', () => {
  it('grants premium only with a stored license key and instance', () => {
    expect(
      resolveInitialPlan(
        { plan: 'premium', licenseKey: 'K', instanceId: 'I' },
        false,
      ),
    ).toBe('premium');
  });

  it('discards a hand-written {"plan":"premium"} in production', () => {
    expect(resolveInitialPlan({ plan: 'premium' }, false)).toBe('free');
  });

  it('keeps test-mode premium in development builds only', () => {
    expect(resolveInitialPlan({ plan: 'premium' }, true)).toBe('premium');
  });

  it('defaults to free for missing or corrupt storage', () => {
    expect(resolveInitialPlan({}, false)).toBe('free');
    expect(resolveInitialPlan({ plan: 'free' }, false)).toBe('free');
  });
});
