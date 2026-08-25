import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useT, useI18n } from '../i18n';
import { subscribeFinanceChanges } from '../liveFinance';
import { Card, Badge } from './ui';
import { formatMoney, formatDate } from '../utils/helpers';

/**
 * Follow the money, on the project page.
 *
 * One project's complete money trail: who owns it, every payment the owning
 * institution recorded to the contractor, and what the contractor affirmed
 * receiving, gap by gap. This is the last mile of the chain that starts at
 * the Ministry of Finance, and it ends on the page citizens actually visit.
 *
 * Live: an affirmation lands on an open page without a refresh.
 */
export const MoneyTrail = ({ project }) => {
  const t = useT();
  const { locale } = useI18n();
  const [payments, setPayments] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.getProjectPayments(project.id)
        .then((res) => !cancelled && setPayments(res.success ? res.data : []))
        .catch(() => !cancelled && setPayments([]));
    load();
    const unsubscribe = subscribeFinanceChanges((payload) => {
      if (payload?.projectId === project.id) load();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [project.id]);

  const owner = project.ownerEntity;
  if (!owner && (!payments || payments.length === 0)) return null;

  const ownerName = owner ? (locale === 'fr' ? owner.nameFr : owner.nameEn) : null;
  const paid = (payments || []).reduce((s, r) => s + Number(r.amountXaf), 0);
  const affirmed = (payments || []).reduce((s, r) => s + Number(r.amountAffirmedXaf || 0), 0);
  const open = (payments || []).filter((r) => !r.affirmedAt).length;

  return (
    <section aria-labelledby="money-trail-heading">
      <h2 id="money-trail-heading" className="mb-4 text-h2 text-fg">
        {t('trail.title')}
      </h2>
      <Card padding="lg">
        {/* The chain of custody, as chips: institution to contractor. */}
        <div className="flex flex-wrap items-center gap-2 text-caption">
          {owner && (
            <>
              <Link
                to={`/entity/${owner.code}`}
                className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1.5 font-medium text-accent hover:underline"
              >
                <i className="fas fa-landmark" aria-hidden="true" />
                {ownerName}
              </Link>
              <i className="fas fa-arrow-right-long text-fg-tertiary" aria-hidden="true" />
            </>
          )}
          <span className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1.5 font-medium text-fg">
            <i className="fas fa-helmet-safety" aria-hidden="true" />
            {project.contractorName || t('common.notAssigned')}
          </span>
          {payments && payments.length > 0 && (
            <span className="ml-auto text-fg-tertiary">
              {t('trail.summary', {
                paid: formatMoney(paid, 'compact'),
                affirmed: formatMoney(affirmed, 'compact'),
              })}
            </span>
          )}
        </div>

        {payments === null ? null : payments.length === 0 ? (
          <p className="mt-4 border-t border-line-subtle pt-4 text-caption text-fg-tertiary">
            {t('trail.noPayments')}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-1 border-t border-line-subtle pt-3">
            {payments.map((row) => {
              const done = Boolean(row.affirmedAt);
              const gap = done ? Number(row.amountXaf) - Number(row.amountAffirmedXaf) : 0;
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-1.5 text-caption">
                  <span className="min-w-0 text-fg-secondary">
                    {formatDate(row.initiatedAt)}
                    {row.note ? ` · ${row.note}` : ''}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-fg">{formatMoney(Number(row.amountXaf), 'full')}</span>
                    <Badge tone={!done ? 'delayed' : gap === 0 ? 'done' : 'over'} size="sm">
                      {!done
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
        )}

        <p className="mt-4 border-t border-line-subtle pt-4 text-caption text-fg-tertiary">
          {open > 0 && <span className="mr-2">{t('trail.awaiting', { count: open })}</span>}
          {t('trail.ledgerNote')}{' '}
          <Link to="/ledger" className="text-accent hover:underline">
            {t('trail.ledgerLink')}
          </Link>
        </p>
      </Card>
    </section>
  );
};
