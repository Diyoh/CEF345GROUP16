import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { useT, useI18n } from '../../i18n';
import { PageHeader } from '../../components/layout/AdminLayout';
import { ConfirmSecondFactor } from '../../components/ConfirmSecondFactor';
import { Card, Button, Badge, Input, StatTile, EmptyState, Skeleton, SkeletonRegion, useToast } from '../../components/ui';
import { formatMoney } from '../../utils/helpers';

/**
 * The institution's finance desk: its planned budget, its own income, and the
 * money MINFI has committed and sent to it.
 *
 * The load-bearing action is confirmation of receipt. MINFI records what it
 * sent; this desk records what arrived; the platform publishes the difference.
 * Every mutation goes through the second-factor modal.
 */

const thisYear = new Date().getFullYear();

export const DeskFinance = () => {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [incomeLabel, setIncomeLabel] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  // One pending action at a time: { kind, summary, run(secondFactor) }
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getMyFinance()
      .then((res) => setData(res.success ? res.data : { budgets: [], income: [], allocations: [], totals: {} }))
      .catch(() => setData({ budgets: [], income: [], allocations: [], totals: {} }));
  };
  useEffect(load, []);

  const runPending = async (secondFactor) => {
    setBusy(true);
    const res = await pending.run(secondFactor).catch(() => null);
    setBusy(false);
    if (res?.success) {
      setPending(null);
      toast.success(t(pending.doneKey));
      load();
    } else {
      // The modal stays open: a mistyped PCN should not cost the typed figures.
      toast.error(res?.error || t('twofa.failed'));
    }
  };

  if (data === null) {
    return (
      <>
        <PageHeader title={t('desk.finance')} description={t('desk.financeLead')} />
        <SkeletonRegion label={t('common.loading')}>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="mt-4 h-40 w-full rounded-lg" />
        </SkeletonRegion>
      </>
    );
  }

  const totals = data.totals || {};
  const budget = data.budgets.find((b) => b.fiscalYear === thisYear);

  const askSetBudget = () => {
    const amount = Number(budgetInput);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setPending({
      summary: t('desk.budgetSummary', { amount: formatMoney(amount, 'full'), year: thisYear }),
      doneKey: 'desk.budgetSaved',
      run: (sf) => api.setBudget({ fiscalYear: thisYear, plannedAmountXaf: amount, ...sf }),
    });
  };

  const askRecordIncome = () => {
    const amount = Number(incomeAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !incomeLabel.trim()) return;
    setPending({
      summary: t('desk.incomeSummary', { amount: formatMoney(amount, 'full'), label: incomeLabel.trim() }),
      doneKey: 'desk.incomeSaved',
      run: (sf) => api.recordIncome({ fiscalYear: thisYear, label: incomeLabel.trim(), amountXaf: amount, ...sf }),
    });
  };

  const askConfirm = (disb) => {
    // The receiving officer states what actually arrived. Prefilled with what
    // MINFI says it sent, but theirs to correct: the gap is the finding.
    setPending({
      summary: t('desk.confirmSummary', { amount: formatMoney(Number(disb.amountXaf), 'full') }),
      doneKey: 'desk.confirmSaved',
      amountLabel: t('desk.confirmAmountLabel'),
      initialAmount: Number(disb.amountXaf),
      run: ({ amountXaf, ...sf }) => api.confirmDisbursement(disb.id, { amountConfirmedXaf: amountXaf, ...sf }),
    });
  };

  return (
    <>
      <PageHeader title={t('desk.finance')} description={t('desk.financeLead')} />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t('desk.totalAllocated')} value={formatMoney(totals.allocatedXaf || 0, 'compact')} exact={formatMoney(totals.allocatedXaf || 0, 'full')} />
        <StatTile label={t('desk.totalDisbursed')} value={formatMoney(totals.disbursedXaf || 0, 'compact')} exact={formatMoney(totals.disbursedXaf || 0, 'full')} />
        <StatTile label={t('desk.totalConfirmed')} value={formatMoney(totals.confirmedXaf || 0, 'compact')} exact={formatMoney(totals.confirmedXaf || 0, 'full')} />
        <StatTile
          label={t('desk.gap')}
          value={formatMoney(totals.gapXaf || 0, 'compact')}
          exact={formatMoney(totals.gapXaf || 0, 'full')}
          delta={totals.awaitingConfirmation > 0 ? t('desk.awaiting', { count: totals.awaitingConfirmation }) : undefined}
          deltaTone="negative"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="text-h3 text-fg">{t('desk.budgetTitle', { year: thisYear })}</h2>
          <p className="mt-1 text-caption text-fg-secondary">
            {budget
              ? t('desk.budgetCurrent', { amount: formatMoney(Number(budget.plannedAmountXaf), 'full') })
              : t('desk.budgetNone')}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label={t('desk.budgetLabel')}
              type="number"
              min="1"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              fieldClassName="w-full sm:w-56"
            />
            <Button variant="primary" size="md" onClick={askSetBudget} disabled={!budgetInput}>
              {budget ? t('desk.budgetRevise') : t('desk.budgetSet')}
            </Button>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-h3 text-fg">{t('desk.incomeTitle')}</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label={t('desk.incomeLabel')}
              placeholder={t('desk.incomePlaceholder')}
              value={incomeLabel}
              onChange={(e) => setIncomeLabel(e.target.value)}
              fieldClassName="w-full sm:w-56"
            />
            <Input
              label={t('desk.incomeAmount')}
              type="number"
              min="1"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              fieldClassName="w-full sm:w-40"
            />
            <Button variant="primary" size="md" onClick={askRecordIncome} disabled={!incomeLabel.trim() || !incomeAmount}>
              {t('desk.incomeRecord')}
            </Button>
          </div>
          {data.income.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1 border-t border-line-subtle pt-3">
              {data.income.slice(0, 6).map((row) => (
                <li key={row.id} className="flex items-baseline justify-between gap-4 text-caption">
                  <span className="text-fg-secondary">{row.label}</span>
                  <span className="tabular shrink-0 text-fg">{formatMoney(Number(row.amountXaf), 'full')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mb-4 mt-10 text-h3 text-fg">{t('desk.allocationsTitle')}</h2>
      {data.allocations.length === 0 ? (
        <EmptyState icon="fa-coins" title={t('desk.noAllocations')} body={t('desk.noAllocationsBody')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.allocations.map((alloc) => (
            <li key={alloc.id}>
              <Card padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-overline uppercase text-fg-tertiary">
                      {locale === 'fr' ? alloc.fromNameFr : alloc.fromNameEn} · {alloc.fiscalYear}
                    </p>
                    <h3 className="mt-1 text-h4 text-fg">{alloc.purpose}</h3>
                  </div>
                  <p className="tabular shrink-0 text-h4 text-fg">{formatMoney(Number(alloc.amountXaf), 'full')}</p>
                </div>

                {alloc.disbursements.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 border-t border-line-subtle pt-3">
                    {alloc.disbursements.map((d) => {
                      const confirmed = d.amountConfirmedXaf !== null;
                      const gap = confirmed ? Number(d.amountXaf) - Number(d.amountConfirmedXaf) : 0;
                      return (
                        <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 text-caption">
                          <span className="text-fg-secondary">
                            {t('desk.sent')}: <span className="tabular text-fg">{formatMoney(Number(d.amountXaf), 'full')}</span>
                          </span>
                          {confirmed ? (
                            <span className="flex items-center gap-2">
                              <Badge tone={gap === 0 ? 'done' : 'over'} size="sm">
                                {t('desk.received')}: {formatMoney(Number(d.amountConfirmedXaf), 'full')}
                              </Badge>
                              {gap !== 0 && (
                                <span className="text-over-fg">{t('desk.gapOf', { amount: formatMoney(Math.abs(gap), 'full') })}</span>
                              )}
                            </span>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => askConfirm(d)}>
                              {t('desk.confirmReceipt')}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmSecondFactor
        isOpen={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
        summary={pending?.summary}
        amountLabel={pending?.amountLabel}
        initialAmount={pending?.initialAmount}
        busy={busy}
      />
    </>
  );
};
