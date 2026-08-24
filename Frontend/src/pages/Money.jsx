import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useT, useI18n } from '../i18n';
import { subscribeFinanceChanges } from '../liveFinance';
import { Card, Badge, Select, StatTile, EmptyState, Skeleton, SkeletonRegion } from '../components/ui';
import { formatMoney } from '../utils/helpers';
import { entityTypeKey } from '../utils/entities';

/**
 * The national money page, public.
 *
 * Two registers a citizen can check for any year: every budget allocation
 * made to every ministry and council, with how much was actually sent and how
 * much the receiver confirmed; and what each institution paid into the
 * government coffers as its own recorded income, line by line. Institution
 * names link to their pages. Live: a new record appears without a refresh.
 */
export const Money = () => {
  const t = useT();
  const { locale } = useI18n();

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const yearRef = useRef('');

  const load = (year) => {
    api.getPublicMoney(year)
      .then((res) => {
        if (res.success) {
          setData(res.data);
          yearRef.current = res.data.year;
        } else setFailed(true);
      })
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    load();
    // Live: any money record, anywhere, refreshes the national view for the
    // year currently on screen.
    return subscribeFinanceChanges(() => load(yearRef.current));
  }, []);

  const name = (row, prefix) =>
    locale === 'fr' ? row[`${prefix}NameFr`] : row[`${prefix}NameEn`];
  const typeKey = entityTypeKey;

  if (failed) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 md:px-8">
        <EmptyState icon="fa-coins" title={t('publicMoney.failed')} body={t('publicMoney.failedBody')} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
        <SkeletonRegion label={t('common.loading')}>
          <Skeleton className="h-9 w-72" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="mt-6 h-72 w-full rounded-lg" />
        </SkeletonRegion>
      </div>
    );
  }

  const { year, years, allocations, income, totals } = data;

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-h1 text-fg">{t('publicMoney.title')}</h1>
          <p className="mt-2 max-w-prose text-body text-fg-secondary">{t('publicMoney.lead')}</p>
        </div>
        <Select
          label={t('publicMoney.yearLabel')}
          value={String(year)}
          onChange={(e) => load(e.target.value)}
          fieldClassName="w-40"
        >
          {(years.length ? years : [year]).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </header>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t('publicMoney.totalAllocated')}
          value={formatMoney(totals.allocatedXaf, 'compact')}
          exact={formatMoney(totals.allocatedXaf, 'full')}
        />
        <StatTile
          label={t('publicMoney.totalSent')}
          value={formatMoney(totals.disbursedXaf, 'compact')}
          exact={formatMoney(totals.disbursedXaf, 'full')}
        />
        <StatTile
          label={t('publicMoney.totalConfirmed')}
          value={formatMoney(totals.confirmedXaf, 'compact')}
          exact={formatMoney(totals.confirmedXaf, 'full')}
          delta={totals.gapXaf > 0 ? t('money.gapDelta', { amount: formatMoney(totals.gapXaf, 'compact') }) : undefined}
          deltaTone="negative"
        />
        <StatTile
          label={t('publicMoney.totalIncome')}
          value={formatMoney(totals.incomeXaf, 'compact')}
          exact={formatMoney(totals.incomeXaf, 'full')}
        />
      </div>

      <section aria-labelledby="alloc-register-heading" className="mb-10">
        <h2 id="alloc-register-heading" className="mb-1 text-h2 text-fg">
          {t('publicMoney.registerTitle', { year })}
        </h2>
        <p className="mb-4 max-w-prose text-caption text-fg-secondary">{t('publicMoney.registerLead')}</p>

        {allocations.length === 0 ? (
          <EmptyState icon="fa-file-invoice" title={t('publicMoney.noAllocations', { year })} body={t('publicMoney.noAllocationsBody')} />
        ) : (
          <Card padding="lg">
            <div className="overflow-x-auto">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-line text-left text-overline uppercase text-fg-tertiary">
                    <th className="py-2 pr-4 font-medium">{t('publicMoney.receiver')}</th>
                    <th className="py-2 pr-4 font-medium">{t('minfi.purpose')}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t('publicMoney.committed')}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t('publicMoney.sent')}</th>
                    <th className="py-2 text-right font-medium">{t('publicMoney.confirmed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => {
                    const gap = Number(a.disbursedXaf) - Number(a.confirmedXaf);
                    const awaiting = Number(a.awaitingConfirmation) > 0;
                    return (
                      <tr key={a.id} className="border-b border-line-subtle align-top last:border-b-0">
                        <td className="py-2.5 pr-4">
                          <Link to={`/entity/${a.toCode}`} className="font-medium text-accent hover:underline">
                            {name(a, 'to')}
                          </Link>
                          <span className="ml-2 text-fg-tertiary">{t(typeKey(a.toType))}</span>
                        </td>
                        <td className="max-w-md py-2.5 pr-4 text-fg-secondary">{a.purpose}</td>
                        <td className="tabular py-2.5 pr-4 text-right text-fg">{formatMoney(Number(a.amountXaf), 'full')}</td>
                        <td className="tabular py-2.5 pr-4 text-right text-fg-secondary">{formatMoney(Number(a.disbursedXaf), 'full')}</td>
                        <td className="py-2.5 text-right">
                          <span className="tabular text-fg-secondary">{formatMoney(Number(a.confirmedXaf), 'full')}</span>
                          {awaiting ? (
                            <Badge tone="delayed" size="sm" className="ml-2">{t('money.notConfirmed')}</Badge>
                          ) : gap > 0 ? (
                            <Badge tone="over" size="sm" className="ml-2">{t('money.gapDelta', { amount: formatMoney(gap, 'compact') })}</Badge>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="coffers-heading">
        <h2 id="coffers-heading" className="mb-1 text-h2 text-fg">
          {t('publicMoney.coffersTitle', { year })}
        </h2>
        <p className="mb-4 max-w-prose text-caption text-fg-secondary">{t('publicMoney.coffersLead')}</p>

        {income.length === 0 ? (
          <EmptyState icon="fa-building-columns" title={t('publicMoney.noIncome', { year })} body={t('publicMoney.noIncomeBody')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {income.map((bucket) => (
              <Card key={bucket.entityId} padding="lg">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link to={`/entity/${bucket.entityCode}`} className="font-medium text-accent hover:underline">
                    {name(bucket, 'entity')}
                  </Link>
                  <span className="tabular text-h4 text-fg">{formatMoney(bucket.totalXaf, 'full')}</span>
                </div>
                <p className="mt-0.5 text-caption text-fg-tertiary">{t(typeKey(bucket.entityType))}</p>
                <ul className="mt-3 flex flex-col gap-1 border-t border-line-subtle pt-2">
                  {bucket.lines.map((line, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-4 text-caption">
                      <span className="text-fg-secondary">{line.label}</span>
                      <span className="tabular shrink-0 text-fg">{formatMoney(line.amountXaf, 'full')}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
