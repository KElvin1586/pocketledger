import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

// The license server is stubbed because a real Lemon Squeezy license key can
// only exist after a real purchase; these tests exercise the app's real
// activation, persistence, revalidation, and downgrade code paths against
// Lemon Squeezy's documented response shapes.

function stubActivateOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.endsWith('/licenses/activate')) {
        return {
          status: 200,
          json: async () => ({
            activated: true,
            license_key: { status: 'active' },
            instance: { id: 'inst-test' },
          }),
        };
      }
      // validate on subsequent loads
      return {
        status: 200,
        json: async () => ({ valid: true, license_key: { status: 'active' } }),
      };
    }),
  );
}

async function goToSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('link', { name: /Settings/ })[0]);
  await screen.findByRole('heading', { name: /Settings/ });
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('License activation flow', () => {
  it('valid license → Premium, persists across reload, revalidates on mount', async () => {
    stubActivateOk();
    const user = userEvent.setup();
    const first = render(<App />);
    await goToSettings(user);

    await user.type(screen.getByLabelText(/License key/), 'REAL-KEY-1234');
    await user.click(screen.getByRole('button', { name: /Activate Premium/ }));
    expect(
      await screen.findByText(/Premium is now active/),
    ).toBeInTheDocument();

    // premium persisted with license data
    const stored = JSON.parse(
      localStorage.getItem('pocketledger-entitlement') ?? '{}',
    );
    expect(stored.plan).toBe('premium');
    expect(stored.licenseKey).toBe('REAL-KEY-1234');
    expect(stored.instanceId).toBe('inst-test');

    // premium features unlocked
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Add budget/ })).toBeInTheDocument();

    // simulate reload: fresh render reads storage and revalidates online
    first.unmount();
    render(<App />);
    await waitFor(() =>
      expect(screen.getAllByText('PocketLedger').length).toBeGreaterThan(0),
    );
    const user2 = userEvent.setup();
    await user2.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Add budget/ })).toBeInTheDocument();
    // revalidation hit the validate endpoint
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(calls.some((u) => u.endsWith('/licenses/validate'))).toBe(true);
  });

  it('invalid license → stays Free with an error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        json: async () => ({ activated: false, error: 'license_key not found.' }),
      })),
    );
    const user = userEvent.setup();
    render(<App />);
    await goToSettings(user);

    await user.type(screen.getByLabelText(/License key/), 'WRONG-KEY');
    await user.click(screen.getByRole('button', { name: /Activate Premium/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/);

    const stored = JSON.parse(
      localStorage.getItem('pocketledger-entitlement') ?? '{}',
    );
    expect(stored.plan ?? 'free').toBe('free');

    // premium still locked
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Upgrade to unlock/ })).toBeInTheDocument();
  });

  it('revoked license on reload → downgrades to Free', async () => {
    localStorage.setItem(
      'pocketledger-entitlement',
      JSON.stringify({
        plan: 'premium',
        licenseKey: 'REVOKED-KEY',
        instanceId: 'inst-x',
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        json: async () => ({
          valid: false,
          license_key: { status: 'disabled' },
          error: '',
        }),
      })),
    );
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(screen.getAllByText('PocketLedger').length).toBeGreaterThan(0),
    );
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Upgrade to unlock/ })).toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('pocketledger-entitlement') ?? '{}',
      );
      expect(stored.plan).toBe('free');
    });
  });

  it('offline revalidation keeps a previously activated Premium (offline-first)', async () => {
    localStorage.setItem(
      'pocketledger-entitlement',
      JSON.stringify({
        plan: 'premium',
        licenseKey: 'OFFLINE-KEY',
        instanceId: 'inst-y',
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(screen.getAllByText('PocketLedger').length).toBeGreaterThan(0),
    );
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Add budget/ })).toBeInTheDocument();
  });
});
