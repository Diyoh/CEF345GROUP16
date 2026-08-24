import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { useT } from '../../i18n';
import { PageHeader } from '../../components/layout/AdminLayout';
import { Card, Button, Badge, EmptyState, Modal, Textarea, Skeleton, SkeletonRegion, useToast } from '../../components/ui';

/**
 * The MINTP verification queue.
 *
 * The request behind it: every contractor must own an account with the
 * necessary documentation, confirmed by the ministry in charge of public works.
 * Approving is one action; rejecting requires a written reason the company will
 * see, because "no" without "why" is a dead end for a legitimate business.
 */
export const VerificationQueue = () => {
  const t = useT();
  const toast = useToast();
  const [queue, setQueue] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getContractorQueue()
      .then((res) => setQueue(res.success ? res.data : []))
      .catch(() => setQueue([]));
  };
  useEffect(load, []);

  const decideOn = async (row, decision, why = '') => {
    setBusy(true);
    const res = await api.verifyContractor(row.userId, decision, why).catch(() => null);
    setBusy(false);
    setRejecting(null);
    setReason('');

    if (res?.success) {
      toast.success(
        t(decision === 'VERIFIED' ? 'verify.approvedToast' : 'verify.rejectedToast', {
          name: row.companyName,
        })
      );
      load();
    } else {
      toast.error(res?.error || t('auth.registrationFailed'));
    }
  };

  return (
    <>
      <PageHeader title={t('verify.title')} description={t('verify.lead')} />

      {queue === null ? (
        <SkeletonRegion label={t('common.loading')}>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="mt-4 h-32 w-full rounded-lg" />
        </SkeletonRegion>
      ) : queue.length === 0 ? (
        <EmptyState icon="fa-user-check" title={t('verify.empty')} body={t('verify.emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {queue.map((row) => (
            <li key={row.userId}>
              <Card padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-h3 text-fg">{row.companyName}</h2>
                    <p className="mt-1 text-caption text-fg-tertiary">
                      {t('verify.applicant')}: {row.applicantName} · {row.applicantEmail}
                    </p>
                    <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-caption">
                      <div>
                        <dt className="inline text-fg-tertiary">RCCM: </dt>
                        <dd className="tabular inline text-fg-secondary">{row.rccmNumber || t('common.notSet')}</dd>
                      </div>
                      <div>
                        <dt className="inline text-fg-tertiary">NIU: </dt>
                        <dd className="tabular inline text-fg-secondary">{row.taxpayerNumber || t('common.notSet')}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      loading={busy}
                      onClick={() => decideOn(row, 'VERIFIED')}
                      leadingIcon={<i className="fas fa-check" aria-hidden="true" />}
                    >
                      {t('verify.approve')}
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => setRejecting(row)}>
                      {t('verify.reject')}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 border-t border-line-subtle pt-3">
                  <p className="mb-2 text-overline uppercase text-fg-tertiary">{t('verify.documents')}</p>
                  {row.documents.length === 0 ? (
                    <Badge rank="flag" tone="delayed" size="sm">
                      {t('verify.noDocs')}
                    </Badge>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {row.documents.map((doc) => (
                        <li key={doc.id}>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-caption text-accent hover:bg-sunken"
                          >
                            <i className="fas fa-file-lines" aria-hidden="true" />
                            {doc.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        size="sm"
        title={t('verify.reasonTitle')}
        description={rejecting?.companyName}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!reason.trim()}
              loading={busy}
              onClick={() => decideOn(rejecting, 'REJECTED', reason)}
            >
              {t('verify.confirmReject')}
            </Button>
          </>
        }
      >
        <Textarea
          label={t('verify.reasonLabel')}
          hint={t('verify.reasonHint')}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </>
  );
};
