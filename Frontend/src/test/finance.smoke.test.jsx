import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui';
import { I18nProvider } from '../i18n';

/**
 * The finance surfaces of phase G3: the institution desk, the MINFI outbound
 * desk, and the second-factor modal every money action passes through.
 *
 * The modal's contract matters most: it must not submit without both factors,
 * and it must hand the caller exactly { password, pcn } plus the optional
 * amount, because that payload goes straight into a signed ledger entry.
 */

const { myFinance, minfiOverview } = vi.hoisted(() => ({
  myFinance: {
  budgets: [{ id: 'b1', fiscalYear: new Date().getFullYear(), plannedAmountXaf: 900000000 }],
  income: [{ id: 'i1', fiscalYear: 2026, label: 'Market fees', amountXaf: 25000000 }],
  allocations: [
    {
      id: 'a1',
      fiscalYear: 2026,
      amountXaf: 500000000,
      purpose: 'Road maintenance',
      fromNameEn: 'Ministry of Finance',
      fromNameFr: 'Ministere des Finances',
      disbursements: [
        { id: 'd1', amountXaf: 300000000, amountConfirmedXaf: null },
        { id: 'd2', amountXaf: 100000000, amountConfirmedXaf: 80000000 },
      ],
    },
  ],
  totals: { allocatedXaf: 500000000, disbursedXaf: 400000000, confirmedXaf: 80000000, gapXaf: 20000000, awaitingConfirmation: 1 },
  },
  minfiOverview: {
  allocations: [
    {
      id: 'a1',
      fiscalYear: 2026,
      amountXaf: 500000000,
      purpose: 'Road maintenance',
      toNameEn: 'Bamenda I Council',
      toNameFr: 'Commune de Bamenda I',
      disbursedXaf: 300000000,
      confirmedXaf: 0,
      awaitingConfirmation: 1,
    },
  ],
  },
}));

// DeskFinance reads the session and project list from the store to offer the
// pay-a-contractor form; one owned project with a contractor exercises it.
vi.mock('../useAppStore', () => ({
  useAppStore: () => ({
    user: { id: 'ent3', role: 'ENTITY_ADMIN', entityId: 'e-bam1', entityCode: 'NW-BAMENDA-I' },
    projects: [
      { id: 'p1', title: 'Market Rehab', ownerEntity: { id: 'e-bam1' }, contractorId: 'u2', contractorName: 'BTP Cameroun S.A.' },
    ],
  }),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual('../api');
  return {
    ...actual,
    api: {
      ...actual.api,
      getMyFinance: vi.fn().mockResolvedValue({ success: true, data: myFinance }),
      getMinfiOverview: vi.fn().mockResolvedValue({ success: true, data: minfiOverview }),
      getAllBudgets: vi.fn().mockResolvedValue({ success: true, data: { budgets: [
        { id: 'b1', fiscalYear: 2026, plannedAmountXaf: 900000000, entityNameEn: 'Bamenda I Council', entityNameFr: 'Commune de Bamenda I', allocatedXaf: 500000000, incomeXaf: 25000000 },
      ] } }),
      getPublicMoney: vi.fn().mockResolvedValue({
        success: true,
        data: {
          year: 2026,
          years: [2026, 2025],
          allocations: [{
            id: 'a1', fiscalYear: 2026, amountXaf: 500000000, purpose: 'Urban roads programme',
            toCode: 'NW-BAMENDA-I', toType: 'COUNCIL', toNameEn: 'Bamenda I Council', toNameFr: 'Commune de Bamenda I',
            disbursedXaf: 300000000, confirmedXaf: 250000000, awaitingConfirmation: 0,
          }],
          income: [{
            entityId: 'e-bam1', entityCode: 'NW-BAMENDA-I', entityType: 'COUNCIL',
            entityNameEn: 'Bamenda I Council', entityNameFr: 'Commune de Bamenda I',
            totalXaf: 25000000, lines: [{ label: 'Market fees', amountXaf: 25000000 }],
          }],
          totals: { allocatedXaf: 500000000, disbursedXaf: 300000000, confirmedXaf: 250000000, incomeXaf: 25000000, gapXaf: 50000000 },
        },
      }),
      getPaymentInbox: vi.fn().mockResolvedValue({
        success: true,
        data: [
          { id: 'pay1', projectTitle: 'Market Rehab', amountXaf: 60000000, note: 'First tranche', initiatedAt: '2026-08-01', affirmedAt: null, payerNameEn: 'Bamenda I Council', payerNameFr: 'Commune de Bamenda I' },
          { id: 'pay2', projectTitle: 'Market Rehab', amountXaf: 20000000, initiatedAt: '2026-07-01', affirmedAt: '2026-07-10', amountAffirmedXaf: 15000000, payerNameEn: 'Bamenda I Council', payerNameFr: 'Commune de Bamenda I' },
        ],
      }),
      getEntities: vi.fn().mockResolvedValue({
        success: true,
        data: {
          national: null,
          ministries: [
            { id: 'e-minfi', code: 'MINFI', nameEn: 'Ministry of Finance', nameFr: 'Ministere des Finances' },
            { id: 'e-mintp', code: 'MINTP', nameEn: 'Ministry of Public Works', nameFr: 'Ministere des Travaux Publics' },
          ],
          regions: [
            {
              id: 'e-nw', code: 'NW', nameEn: 'North West', nameFr: 'Nord-Ouest',
              councils: [{ id: 'e-bam1', code: 'NW-BAMENDA-I', nameEn: 'Bamenda I Council', nameFr: 'Commune de Bamenda I' }],
            },
          ],
        },
      }),
    },
  };
});

import { DeskFinance } from '../pages/desk/DeskFinance';
import { MinfiAllocations } from '../pages/desk/MinfiAllocations';
import { ConfirmSecondFactor } from '../components/ConfirmSecondFactor';
import { ContractorPayments } from '../components/ContractorPayments';
import { EntityMoney } from '../components/EntityMoney';
import { Money } from '../pages/Money';

const renderApp = (ui) =>
  render(
    <I18nProvider><MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter></I18nProvider>
  );

describe('DeskFinance', () => {
  it('shows the totals and the unconfirmed payment', async () => {
    renderApp(<DeskFinance />);
    expect(await screen.findByText('Road maintenance')).toBeInTheDocument();
    // One disbursement is unconfirmed: the confirm action is offered exactly once.
    expect(screen.getAllByRole('button', { name: /confirm receipt/i })).toHaveLength(1);
    // The partially confirmed one shows its gap.
    expect(screen.getByText(/gap of/i)).toBeInTheDocument();
  });

  it('routes a budget declaration through the second-factor modal', async () => {
    renderApp(<DeskFinance />);
    await screen.findByText('Road maintenance');
    await userEvent.type(screen.getByLabelText(/planned amount/i), '1000');
    await userEvent.click(screen.getByRole('button', { name: /revise budget/i }));
    // The modal is open, asking for both factors before anything is sent.
    expect(await screen.findByLabelText(/your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/private confirmation number/i)).toBeInTheDocument();
  });
});

describe('MinfiAllocations', () => {
  it('shows the allocation with its confirmation status and receiving picker', async () => {
    renderApp(<MinfiAllocations />);
    expect(await screen.findByText('Road maintenance')).toBeInTheDocument();
    expect(screen.getByText(/awaiting/i)).toBeInTheDocument();
    // MINFI cannot allocate to itself: it is absent from its own picker.
    const picker = screen.getByLabelText(/institution/i);
    const labels = Array.from(picker.querySelectorAll('option')).map((o) => o.textContent);
    expect(labels).toContain('Ministry of Public Works');
    expect(labels).not.toContain('Ministry of Finance');
  });
});

describe('ContractorPayments', () => {
  it('offers affirm on the open payment and shows the partial on the answered one', async () => {
    renderApp(<ContractorPayments />);
    expect(await screen.findByRole('button', { name: /affirm receipt/i })).toBeInTheDocument();
    expect(screen.getByText(/awaiting your answer/i)).toBeInTheDocument();
    // The answered payment shows what was affirmed, not a green tick.
    expect(screen.getByText(/affirmed 15/i)).toBeInTheDocument();
  });
});

describe('EntityMoney, the citizens view', () => {
  const finance = {
    budgets: [{ id: 'b1', fiscalYear: new Date().getFullYear(), plannedAmountXaf: 900000000 }],
    income: [{ id: 'i1', label: 'Market fees', amountXaf: 25000000 }],
    allocations: [{
      id: 'a1', fiscalYear: 2026, amountXaf: 500000000, purpose: 'Urban roads programme',
      fromNameEn: 'Ministry of Finance', fromNameFr: 'Ministere des Finances',
      disbursements: [{ id: 'd1', amountXaf: 300000000, amountConfirmedXaf: 250000000 }],
    }],
    payments: [{ id: 'pay1', projectTitle: 'Market Rehab', contractorName: 'BTP', initiatedAt: '2026-08-01', amountXaf: 60000000, affirmedAt: '2026-08-10', amountAffirmedXaf: 45000000 }],
    totals: { allocatedXaf: 500000000, confirmedXaf: 250000000, incomeXaf: 25000000, gapXaf: 50000000 },
  };

  it('publishes the money with its gaps, never hiding them', () => {
    renderApp(<EntityMoney finance={finance} />);
    expect(screen.getByRole('heading', { name: /public finances/i })).toBeInTheDocument();
    expect(screen.getByText('Urban roads programme')).toBeInTheDocument();
    // The 300M sent / 250M confirmed disbursement renders its shortfall.
    expect(screen.getByText((text) => /250.*confirmed/i.test(text))).toBeInTheDocument();
    // The 60M/45M payment shows what the contractor actually affirmed.
    expect(screen.getByText((text) => /45.*affirmed/i.test(text))).toBeInTheDocument();
  });

  it('renders nothing when a body has no financial records', () => {
    const { container } = renderApp(<EntityMoney finance={{ budgets: [], income: [], allocations: [], payments: [], totals: {} }} />);
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('Money, the national public page', () => {
  it('lists every allocation and what each institution paid into the coffers', async () => {
    renderApp(<Money />);
    expect(await screen.findByRole('heading', { name: /budget allocations, 2026/i })).toBeInTheDocument();
    expect(screen.getByText('Urban roads programme')).toBeInTheDocument();
    // The institution links to its page, in both registers.
    const links = screen.getAllByRole('link', { name: /bamenda i council/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links[0]).toHaveAttribute('href', '/entity/NW-BAMENDA-I');
    // The coffers side itemises the income.
    expect(screen.getByRole('heading', { name: /paid into the coffers/i })).toBeInTheDocument();
    expect(screen.getByText('Market fees')).toBeInTheDocument();
    // The year picker offers both recorded years.
    expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument();
  });
});

describe('ConfirmSecondFactor', () => {
  it('refuses to submit until both factors are present, then hands them over', async () => {
    const onConfirm = vi.fn();
    renderApp(<ConfirmSecondFactor isOpen onClose={vi.fn()} onConfirm={onConfirm} summary="Allocate 500" />);

    const confirmButton = screen.getByRole('button', { name: /confirm and sign/i });
    // The Button renders aria-disabled (it stays focusable for screen readers).
    expect(confirmButton).toHaveAttribute('aria-disabled', 'true');

    await userEvent.type(screen.getByLabelText(/your password/i), 'password');
    expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/private confirmation number/i), 'AB23-CD45-EF67');
    await userEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith({ password: 'password', pcn: 'AB23-CD45-EF67' });
  });

  it('includes the amount when the action asks for one', async () => {
    const onConfirm = vi.fn();
    renderApp(
      <ConfirmSecondFactor isOpen onClose={vi.fn()} onConfirm={onConfirm} amountLabel="Amount sent (FCFA)" initialAmount={200} />
    );
    await userEvent.type(screen.getByLabelText(/your password/i), 'password');
    await userEvent.type(screen.getByLabelText(/private confirmation number/i), 'AB23CD45EF67');
    await userEvent.click(screen.getByRole('button', { name: /confirm and sign/i }));
    expect(onConfirm).toHaveBeenCalledWith({ password: 'password', pcn: 'AB23CD45EF67', amountXaf: 200 });
  });
});
