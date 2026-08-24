import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { useT, useI18n } from '../../i18n';
import { PageHeader } from '../../components/layout/AdminLayout';
import { ConfirmSecondFactor } from '../../components/ConfirmSecondFactor';
import { subscribeFinanceChanges } from '../../liveFinance';
import { Card, Button, Badge, Input, Select, Textarea, EmptyState, Skeleton, SkeletonRegion, useToast } from '../../components/ui';
import { formatMoney } from '../../utils/helpers';

/**
 * The Ministry of Finance's outbound desk: commit money to an institution,
 * record what was actually sent, and watch which payments the receiving side
 * has not yet confirmed.
 *
 * Every action here passes the second factor. The entity picker mirrors the
 * access-code generator: ministries first, then councils grouped by region.
 */

const thisYear = new Date().getFullYear();

export const MinfiAllocations = () => {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();

  const [tree, setTree] = useState(null);
  const [allocations, setAllocations] = useState(null);
  const [budgets, setBudgets] = useState([]);

  const [toEntityId, setToEntityId] = useState('');
  const [year, setYear] = useState(String(thisYear));
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');

  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getMinfiOverview()
      .then((res) => setAllocations(res.success ? res.data.allocations : []))
      .catch(() => setAllocations([]));
    // The whole budget book: every institution's declared budget, with what
    // MINFI allocated to it and what it recorded as its own income. The
    // ministry that funds the system sees everything about budgets.
    api.getAllBudgets()
      .then((res) => setBudgets(res.success ? res.data.budgets : []))
      .catch(() => setBudgets([]));
  };
  useEffect(() => {
    load();
    api.getEntities()
      .then((res) => setTree(res.success ? res.data : { ministries: [], regions: [] }))
      .catch(() => setTree({ ministries: [], regions: [] }));
    // Live: confirmations and budget declarations elsewhere land here unasked.
    return subscribeFinanceChanges(() => load());
  }, []);

  const name = (row) => (locale === 'fr' ? row.nameFr || row.name_fr : row.nameEn || row.name_en);

  const runPending = async (secondFactor) => {
    setBusy(true);
    const res = await pending.run(secondFactor).catch(() => null);
    setBusy(false);
    if (res?.success) {
      setPending(null);
      toast.success(t(pending.doneKey));
      if (pending.reset) pending.reset();
      load();
    } else {
      toast.error(res?.error || t('twofa.failed'));
    }
  };

  const askAllocate = () => {
    const n = Number(amount);
    if (!toEntityId || !purpose.trim() || !Number.isFinite(n) || n <= 0) return;
    setPending({
      summary: t('minfi.allocateSummary', { amount: formatMoney(n, 'full'), year }),
      doneKey: 'minfi.allocatedToast',
      run: (sf) => api.createAllocation({ toEntityId, fiscalYear: Number(year), amountXaf: n, purpose: purpose.trim(), ...sf }),
      reset: () => {
        setAmount('');
        setPurpose('');
      },
    });
  };

  const askDisburse = (alloc) => {
    const remaining = Number(alloc.amountXaf) - Number(alloc.disbursedXaf);
    setPending({
      summary: t('minfi.disburseSummary', { name: name({ nameFr: alloc.toNameFr, nameEn: alloc.toNameEn }) }),
      doneKey: 'minfi.disbursedToast',
      amountLabel: t('minfi.disburseAmountLabel'),
      initialAmount: remaining > 0 ? remaining : '',
      run: ({ amountXaf, ...sf }) => api.createDisbursement(alloc.id, { amountXaf, ...sf }),
    });
  };

  if (allocations === null || tree === null) {
    return (
      <>
        <PageHeader title={t('desk.allocations')} description={t('minfi.lead')} />
        <SkeletonRegion label={t('common.loading')}>
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="mt-4 h-40 w-full rounded-lg" />
        </SkeletonRegion>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('desk.allocations')} description={t('minfi.lead')} />

      <Card padding="lg" className="mb-8">
        <h2 className="text-h3 text-fg">{t('minfi.newTitle')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label={t('codes.institution')} value={toEntityId} onChange={(e) => setToEntityId(e.target.value)} required>
            <option value="">{t('codes.selectInstitution')}</option>
            <optgroup label={t('gov.ministriesTitle')}>
              {tree.ministries
                .filter((m) => m.code !== 'MINFI')
                .map((m) => (
                  <option key={m.id} value={m.id}>{name(m)}</option>
                ))}
            </optgroup>
            {tree.regions.map((region) => (
              <optgroup key={region.id} label={name(region)}>
                {(region.councils || []).map((c) => (
                  <option key={c.id} value={c.id}>{name(c)}</option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Input label={t('minfi.year')} type="number" min="2020" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
          <Input label={t('minfi.amount')} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Textarea
              label={t('minfi.purpose')}
              hint={t('minfi.purposeHint')}
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={askAllocate} disabled={!toEntityId || !amount || !purpose.trim()}>
            {t('minfi.allocate')}
          </Button>
        </div>
      </Card>

      <h2 className="mb-4 text-h3 text-fg">{t('minfi.listTitle')}</h2>
      {allocations.length === 0 ? (
        <EmptyState icon="fa-money-bill-transfer" title={t('minfi.empty')} body={t('minfi.emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {allocations.map((alloc) => {
            const disbursed = Number(alloc.disbursedXaf);
            const confirmed = Number(alloc.confirmedXaf);
            const awaiting = Number(alloc.awaitingConfirmation);
            const gap = disbursed - confirmed;
            return (
              <li key={alloc.id}>
                <Card padding="lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-overline uppercase text-fg-tertiary">
                        {name({ nameFr: alloc.toNameFr, nameEn: alloc.toNameEn })} · {alloc.fiscalYear}
                      </p>
                      <h3 className="mt-1 text-h4 text-fg">{alloc.purpose}</h3>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-h4 text-fg">{formatMoney(Number(alloc.amountXaf), 'full')}</p>
                      <p className="mt-1 text-caption text-fg-tertiary">
                        {t('minfi.sentSoFar')}: <span className="tabular">{formatMoney(disbursed, 'full')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {awaiting > 0 && (
                        <Badge tone="delayed" size="sm">{t('desk.awaiting', { count: awaiting })}</Badge>
                      )}
                      {awaiting === 0 && disbursed > 0 && (
                        <Badge tone={gap === 0 ? 'done' : 'over'} size="sm">
                          {gap === 0
                            ? t('minfi.allConfirmed')
                            : t('desk.gapOf', { amount: formatMoney(Math.abs(gap), 'full') })}
                        </Badge>
                      )}
                    </div>
                    {disbursed < Number(alloc.amountXaf) && (
                      <Button variant="secondary" size="sm" onClick={() => askDisburse(alloc)}>
                        {t('minfi.recordDisbursement')}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {budgets.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-h3 text-fg">{t('minfi.budgetsTitle')}</h2>
          <Card padding="lg">
            <p className="mb-3 max-w-prose text-caption text-fg-secondary">{t('minfi.budgetsLead')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-line text-left text-overline uppercase text-fg-tertiary">
                    <th className="py-2 pr-4 font-medium">{t('codes.institution')}</th>
                    <th className="py-2 pr-4 font-medium">{t('minfi.year')}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t('minfi.plannedCol')}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t('desk.totalAllocated')}</th>
                    <th className="py-2 text-right font-medium">{t('minfi.incomeCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr key={b.id} className="border-b border-line-subtle last:border-b-0">
                      <td className="py-2 pr-4 text-fg">
                        {locale === 'fr' ? b.entityNameFr : b.entityNameEn}
                      </td>
                      <td className="tabular py-2 pr-4 text-fg-secondary">{b.fiscalYear}</td>
                      <td className="tabular py-2 pr-4 text-right text-fg">{formatMoney(Number(b.plannedAmountXaf), 'full')}</td>
                      <td className="tabular py-2 pr-4 text-right text-fg-secondary">{formatMoney(Number(b.allocatedXaf), 'full')}</td>
                      <td className="tabular py-2 text-right text-fg-secondary">{formatMoney(Number(b.incomeXaf), 'full')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
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
