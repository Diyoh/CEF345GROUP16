import React from 'react';
import { useT, useI18n } from '../i18n';
import { Card, Badge, StatTile, EmptyState } from './ui';
import { formatMoney, formatDate } from '../utils/helpers';

/**
 * One institution's money, on its public page, for citizens.
 *
 * Everything shown here is the pair-of-records data: what MINFI committed and
 * sent against what the institution confirmed, what the institution paid
 * against what its contractors affirmed. The gaps are the point; they render
 * first-class, never hidden in a tooltip.
 */
export const EntityMoney = ({ finance }) => {
  const t = useT();
  const { locale } = useI18n();

  if (!finance) return null;

  const { budgets = [], income = [], allocations = [], payments = [], totals = {} } = finance;
  const empty =
    budgets.length === 0 && income.length === 0 && allocations.length === 0 && payments.length === 0;

  // The section stays on the page even with nothing to show. A missing money
  // section reads as "this platform does not track their money"; an explicit
  // empty state reads as the truth: nothing has been recorded yet.
  if (empty) {
    return (
      <section aria-labelledby="entity-money-heading" className="mb-10">
        <h2 id="entity-money-heading" className="mb-1 text-h2 text-fg">
          {t('money.title')}
        </h2>
        <p className="mb-5 max-w-prose text-caption text-fg-secondary">{t('money.lead')}</p>
        <EmptyState icon="fa-coins" title={t('money.empty')} body={t('money.emptyBody')} />
      </section>
    );
  }

  const year = new Date().getFullYear();
  const budget = budgets.find((b) => b.fiscalYear === year) || budgets[0];
  const fromName = (a) => (locale === 'fr' ? a.fromNameFr : a.fromNameEn);

  return (
    <section aria-labelledby="entity-money-heading" className="mb-10">
      <h2 id="entity-money-heading" className="mb-1 text-h2 text-fg">
        {t('money.title')}
      </h2>
      <p className="mb-5 max-w-prose text-caption text-fg-secondary">{t('money.lead')}</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={budget ? t('money.budgetOf', { year: budget.fiscalYear }) : t('money.budgetNone')}
          value={budget ? formatMoney(Number(budget.plannedAmountXaf), 'compact') : '–'}
          exact={budget ? formatMoney(Number(budget.plannedAmountXaf), 'full') : undefined}
        />
        <StatTile
          label={t('money.allocatedLabel')}
          value={formatMoney(totals.allocatedXaf || 0, 'compact')}
          exact={formatMoney(totals.allocatedXaf || 0, 'full')}
        />
        <StatTile
          label={t('money.confirmedLabel')}
          value={formatMoney(totals.confirmedXaf || 0, 'compact')}
          exact={formatMoney(totals.confirmedXaf || 0, 'full')}
        />
        <StatTile
          label={t('money.incomeLabel')}
          value={formatMoney(totals.incomeXaf || 0, 'compact')}
          exact={formatMoney(totals.incomeXaf || 0, 'full')}
          delta={totals.gapXaf > 0 ? t('money.gapDelta', { amount: formatMoney(totals.gapXaf, 'compact') }) : undefined}
          deltaTone="negative"
        />
      </div>

      {allocations.length > 0 && (
        <Card padding="lg" className="mb-4">
          <h3 className="text-h4 text-fg">{t('money.allocationsTitle')}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {allocations.map((alloc) => (
              <li key={alloc.id} className="border-t border-line-subtle pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 text-body text-fg">
                    {alloc.purpose}
                    <span className="ml-2 text-caption text-fg-tertiary">
                      {fromName(alloc)} · {alloc.fiscalYear}
                    </span>
                  </p>
                  <p className="tabular shrink-0 text-body text-fg">{formatMoney(Number(alloc.amountXaf), 'full')}</p>
                </div>
                {alloc.disbursements.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {alloc.disbursements.map((d) => {
                      const confirmed = d.amountConfirmedXaf !== null;
                      const gap = confirmed ? Number(d.amountXaf) - Number(d.amountConfirmedXaf) : 0;
                      return (
                        <li key={d.id}>
                          <Badge tone={!confirmed ? 'delayed' : gap === 0 ? 'done' : 'over'} size="sm">
                            {formatMoney(Number(d.amountXaf), 'compact')} {t('money.sentShort')}
                            {confirmed
                              ? gap === 0
                                ? ` · ${t('money.confirmedFull')}`
                                : ` · ${t('money.confirmedShort', { amount: formatMoney(Number(d.amountConfirmedXaf), 'compact') })}`
                              : ` · ${t('money.notConfirmed')}`}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {payments.length > 0 && (
        <Card padding="lg">
          <h3 className="text-h4 text-fg">{t('money.paymentsTitle')}</h3>
          <ul className="mt-3 flex flex-col gap-1">
            {payments.map((row) => {
              const affirmed = Boolean(row.affirmedAt);
              const gap = affirmed ? Number(row.amountXaf) - Number(row.amountAffirmedXaf) : 0;
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-1.5 text-caption">
                  <span className="min-w-0 text-fg-secondary">
                    {row.projectTitle} · {row.contractorName} · {formatDate(row.initiatedAt)}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-fg">{formatMoney(Number(row.amountXaf), 'full')}</span>
                    <Badge tone={!affirmed ? 'delayed' : gap === 0 ? 'done' : 'over'} size="sm">
                      {!affirmed
                        ? t('money.notAffirmed')
                        : gap === 0
                          ? t('money.affirmedFull')
                          : t('money.affirmedShort', { amount: formatMoney(Number(row.amountAffirmedXaf), 'compact') })}
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
};
