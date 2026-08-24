import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useT, useI18n } from '../i18n';
import { ConfirmSecondFactor } from './ConfirmSecondFactor';
import { Card, Button, Badge, useToast } from './ui';
import { formatMoney, formatDate } from '../utils/helpers';

/**
 * The contractor's payment inbox.
 *
 * Every payment an institution records against this contractor lands here, and
 * the contractor answers it once: this much actually arrived. That answer is
 * what moves the project's public spent figure, so the affirm action goes
 * through the same second-factor modal as every other money action.
 */
export const ContractorPayments = () => {
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();

  const [payments, setPayments] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getPaymentInbox()
      .then((res) => setPayments(res.success ? res.data : []))
      .catch(() => setPayments([]));
  };
  useEffect(load, []);

  const payerName = (row) => (locale === 'fr' ? row.payerNameFr : row.payerNameEn);

  const askAffirm = (row) => {
    setPending({
      row,
      summary: t('payments.affirmSummary', { payer: payerName(row), amount: formatMoney(Number(row.amountXaf), 'full') }),
      amountLabel: t('payments.affirmAmountLabel'),
      initialAmount: Number(row.amountXaf),
    });
  };

  const runAffirm = async ({ amountXaf, ...sf }) => {
    setBusy(true);
    const res = await api.affirmPayment(pending.row.id, { amountAffirmedXaf: amountXaf, ...sf }).catch(() => null);
    setBusy(false);
    if (res?.success) {
      setPending(null);
      toast.success(t('payments.affirmedToast'));
      load();
    } else {
      toast.error(res?.error || t('twofa.failed'));
    }
  };

  // No payments yet: say nothing. An empty inbox card would only add noise to
  // a dashboard whose real content is the project list.
  if (!payments || payments.length === 0) return null;

  const open = payments.filter((row) => !row.affirmedAt);

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-fg">{t('payments.inboxTitle')}</h2>
        {open.length > 0 && (
          <Badge tone="delayed" size="md">{t('payments.openCount', { count: open.length })}</Badge>
        )}
      </div>
      <p className="mt-2 max-w-prose text-caption text-fg-secondary">{t('payments.inboxLead')}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {payments.map((row) => {
          const affirmed = Boolean(row.affirmedAt);
          const gap = affirmed ? Number(row.amountXaf) - Number(row.amountAffirmedXaf) : 0;
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle py-3 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="text-body text-fg">{row.projectTitle}</p>
                <p className="mt-0.5 text-caption text-fg-tertiary">
                  {payerName(row)} · {formatDate(row.initiatedAt)}
                  {row.note ? ` · ${row.note}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular text-body text-fg">{formatMoney(Number(row.amountXaf), 'full')}</span>
                {affirmed ? (
                  <Badge tone={gap === 0 ? 'done' : 'over'} size="sm">
                    {gap === 0
                      ? t('payments.affirmedFull')
                      : t('payments.affirmedPartial', { amount: formatMoney(Number(row.amountAffirmedXaf), 'full') })}
                  </Badge>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => askAffirm(row)}>
                    {t('payments.affirm')}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmSecondFactor
        isOpen={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runAffirm}
        summary={pending?.summary}
        amountLabel={pending?.amountLabel}
        initialAmount={pending?.initialAmount}
        busy={busy}
      />
    </Card>
  );
};
