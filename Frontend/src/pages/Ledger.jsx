import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n';
import { subscribeFinanceChanges } from '../liveFinance';
import { Card, Button, Badge, EmptyState, Skeleton, SkeletonRegion, useToast } from '../components/ui';
import { formatMoney, formatDate } from '../utils/helpers';

/**
 * The public ledger explorer.
 *
 * The platform's trust model, handed to the citizen as a working instrument:
 * the chain head to copy down, a button that runs the full cryptographic
 * verification on demand, and the feed of signed entries as they land. The
 * page does not ask to be believed; it shows how to check.
 */

const TYPE_ICON = {
  'allocation.created': 'fa-file-signature',
  'disbursement.sent': 'fa-money-bill-transfer',
  'disbursement.confirmed': 'fa-check-double',
  'budget.set': 'fa-scale-balanced',
  'budget.revised': 'fa-scale-balanced',
  'income.recorded': 'fa-building-columns',
  'payment.initiated': 'fa-hand-holding-dollar',
  'payment.affirmed': 'fa-check-double',
  'contractor.verified': 'fa-user-check',
  'contractor.rejected': 'fa-user-xmark',
};

export const Ledger = () => {
  const t = useT();
  const toast = useToast();

  const [head, setHead] = useState(null);
  const [entries, setEntries] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verdict, setVerdict] = useState(null);

  const load = () => {
    api.getLedgerHead().then((res) => res.success && setHead(res.data)).catch(() => {});
    api.getLedgerEntries()
      .then((res) => setEntries(res.success ? res.data : []))
      .catch(() => setEntries([]));
  };

  useEffect(() => {
    load();
    // Live: every signed money action lands in the feed as it happens.
    return subscribeFinanceChanges(() => load());
  }, []);

  const copyHead = async () => {
    try {
      await navigator.clipboard.writeText(`seq ${head.seq} ${head.entryHash}`);
      toast.success(t('ledger.copiedToast'));
    } catch {
      toast.error(t('codes.copyFailed'));
    }
  };

  const runVerify = async () => {
    setVerifying(true);
    setVerdict(null);
    const res = await api.getLedgerVerify().catch(() => null);
    setVerifying(false);
    setVerdict(res?.success ? res.data : { ok: false, problem: t('ledger.verifyFailed') });
  };

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 border-b border-line pb-6">
        <h1 className="text-h1 text-fg">{t('ledger.title')}</h1>
        <p className="mt-2 max-w-prose text-body text-fg-secondary">{t('ledger.lead')}</p>
      </header>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="text-h3 text-fg">{t('ledger.headTitle')}</h2>
          <p className="mt-1 max-w-prose text-caption text-fg-secondary">{t('ledger.headLead')}</p>
          {head ? (
            <>
              <p className="tabular mt-4 break-all rounded-sm bg-sunken px-3 py-2.5 font-mono text-caption text-fg">
                <span className="mr-2 text-fg-tertiary">#{head.seq}</span>
                {head.entryHash}
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={copyHead}>
                {t('ledger.copyHead')}
              </Button>
            </>
          ) : (
            <Skeleton className="mt-4 h-10 w-full rounded-sm" />
          )}
        </Card>

        <Card padding="lg">
          <h2 className="text-h3 text-fg">{t('ledger.verifyTitle')}</h2>
          <p className="mt-1 max-w-prose text-caption text-fg-secondary">{t('ledger.verifyLead')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" loading={verifying} onClick={runVerify}>
              {t('ledger.verifyNow')}
            </Button>
            {verdict && (
              <p
                role="status"
                className={`text-body font-medium ${verdict.ok ? 'text-done-fg' : 'text-over-fg'}`}
              >
                <i
                  className={`fas ${verdict.ok ? 'fa-shield-halved' : 'fa-triangle-exclamation'} mr-2`}
                  aria-hidden="true"
                />
                {verdict.ok
                  ? t('ledger.verdictOk', { count: verdict.entries })
                  : t('ledger.verdictBroken', { seq: verdict.brokenAtSeq ?? '?' })}
              </p>
            )}
          </div>
        </Card>
      </div>

      <section aria-labelledby="ledger-feed-heading">
        <h2 id="ledger-feed-heading" className="mb-1 text-h2 text-fg">
          {t('ledger.feedTitle')}
        </h2>
        <p className="mb-4 max-w-prose text-caption text-fg-secondary">{t('ledger.feedLead')}</p>

        {entries === null ? (
          <SkeletonRegion label={t('common.loading')}>
            <Skeleton className="h-48 w-full rounded-lg" />
          </SkeletonRegion>
        ) : entries.length === 0 ? (
          <EmptyState icon="fa-link" title={t('ledger.empty')} body={t('ledger.emptyBody')} />
        ) : (
          <Card padding="lg">
            <ol className="flex flex-col">
              {entries.map((entry) => (
                <li
                  key={entry.seq}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-subtle py-2.5 last:border-b-0"
                >
                  <span className="tabular w-12 shrink-0 text-caption text-fg-tertiary">#{entry.seq}</span>
                  <span className="inline-flex w-56 shrink-0 items-center gap-2 text-caption text-fg">
                    <i className={`fas ${TYPE_ICON[entry.entryType] || 'fa-file-lines'} text-fg-tertiary`} aria-hidden="true" />
                    {t(`ledger.type_${String(entry.entryType).replace(/\./g, '_')}`)}
                  </span>
                  <span className="tabular w-40 shrink-0 text-right text-caption text-fg">
                    {entry.amountXaf !== null ? formatMoney(Number(entry.amountXaf), 'full') : ''}
                  </span>
                  <span className="text-caption text-fg-tertiary">{formatDate(entry.occurredAt)}</span>
                  <span className="tabular ml-auto font-mono text-caption text-fg-tertiary" title={entry.entryHash}>
                    {String(entry.entryHash).slice(0, 12)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-line-subtle pt-3 text-caption text-fg-tertiary">
              {t('ledger.feedFootnote')}
            </p>
          </Card>
        )}
      </section>
    </div>
  );
};
