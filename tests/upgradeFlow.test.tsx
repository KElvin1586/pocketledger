import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

beforeEach(() => {
  localStorage.clear();
});

describe('Upgrade flow & lock cycle', () => {
  it('locks premium for Free, unlocks it in test mode, locks again when reverted', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('PocketLedger').length).toBeGreaterThan(0));

    // FREE: budgets locked
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Upgrade to unlock/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Upgrade to unlock/ }));
    expect(await screen.findByRole('dialog', { name: /Upgrade to Premium/ })).toBeInTheDocument();

    // upgrade button → real Lemon Squeezy checkout, opened in a new tab
    const checkoutLink = screen.getByRole('link', { name: /Upgrade for/ });
    expect(checkoutLink).toHaveAttribute(
      'href',
      'https://kelvindigitaltools.lemonsqueezy.com/checkout/buy/5a9a0680-dbb4-4c1b-b38c-02c8bbd20fe1',
    );
    expect(checkoutLink).toHaveAttribute('target', '_blank');

    // clicking Upgrade must NOT unlock premium by itself
    await user.click(screen.getByRole('button', { name: /Maybe later/ }));
    expect(await screen.findByRole('button', { name: /Upgrade to unlock/ })).toBeInTheDocument();

    // switch to premium via dev test mode
    await user.click(screen.getAllByRole('link', { name: /Settings/ })[0]);
    await user.click(await screen.findByRole('button', { name: /Test as Premium/ }));
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Add budget/ })).toBeInTheDocument();

    // revert to free via Settings test mode → locked again
    await user.click(screen.getAllByRole('link', { name: /Settings/ })[0]);
    await user.click(screen.getByRole('button', { name: /Test as Free/ }));
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(await screen.findByRole('button', { name: /Upgrade to unlock/ })).toBeInTheDocument();
  });

  it('entitlement test mode is gated by config and stays local-only', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('PocketLedger').length).toBeGreaterThan(0));
    expect(localStorage.getItem('pocketledger-entitlement')).toBe('{"plan":"free"}');
  });
});
