import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n';
import { Card, Button, Badge, Input, useToast } from './ui';

/**
 * The contractor's company file: verification status, identity fields, and the
 * documents MINTP decides from.
 *
 * The status is the load-bearing part. An unverified contractor cannot be
 * assigned projects, so this card says so in words, shows the rejection reason
 * when there is one, and makes clear that editing identity fields sends the
 * file back for review.
 */

const STATUS_TONE = { PENDING: 'delayed', VERIFIED: 'done', REJECTED: 'over' };

export const ContractorAccount = () => {
  const t = useT();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [rccm, setRccm] = useState('');
  const [niu, setNiu] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getContractorProfile()
      .then((res) => {
        if (cancelled || !res.success) return;
        setProfile(res.data.profile);
        setDocuments(res.data.documents || []);
        setCompanyName(res.data.profile?.companyName || '');
        setRccm(res.data.profile?.rccmNumber || '');
        setNiu(res.data.profile?.taxpayerNumber || '');
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await api
      .saveContractorProfile({ companyName, rccmNumber: rccm, taxpayerNumber: niu })
      .catch(() => null);
    setBusy(false);
    if (res?.success) {
      setProfile(res.data.profile);
      toast.success(t('contractor.savedToast'));
    } else {
      toast.error(res?.error || t('auth.registrationFailed'));
    }
  };

  const upload = async () => {
    if (!docFile || !docLabel.trim()) return;
    setBusy(true);
    const form = new FormData();
    form.append('label', docLabel);
    form.append('file', docFile);
    const res = await api.addContractorDocument(form).catch(() => null);
    setBusy(false);
    if (res?.success) {
      setDocuments(res.data.documents || []);
      setDocLabel('');
      setDocFile(null);
      toast.success(t('contractor.uploadedToast'));
    } else {
      toast.error(res?.error || t('auth.registrationFailed'));
    }
  };

  if (!loaded) return null;

  const status = profile?.status || 'PENDING';

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-fg">{t('contractor.accountTitle')}</h2>
        <Badge tone={STATUS_TONE[status] || 'neutral'} size="md">
          {t(`contractor.status${status}`)}
        </Badge>
      </div>

      <p className="mt-2 max-w-prose text-caption text-fg-secondary">
        {t(
          status === 'VERIFIED'
            ? 'contractor.verifiedNote'
            : status === 'REJECTED'
              ? 'contractor.rejectedNote'
              : 'contractor.pendingNote'
        )}
      </p>
      {status === 'REJECTED' && profile?.rejectionReason && (
        <p className="mt-2 rounded-sm bg-over-bg px-3 py-2 text-caption text-over-fg">
          {t('contractor.rejectionReason')}: {profile.rejectionReason}
        </p>
      )}

      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-3">
        <Input
          label={t('contractor.companyName')}
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Input label={t('contractor.rccm')} value={rccm} onChange={(e) => setRccm(e.target.value)} />
        <Input label={t('contractor.niu')} value={niu} onChange={(e) => setNiu(e.target.value)} />
        <div className="sm:col-span-3">
          <Button type="submit" variant="secondary" size="md" loading={busy}>
            {t('contractor.saveProfile')}
          </Button>
        </div>
      </form>

      <div className="mt-6 border-t border-line-subtle pt-4">
        <h3 className="text-overline uppercase text-fg-tertiary">{t('contractor.documents')}</h3>

        {documents.length === 0 ? (
          <p className="mt-2 text-caption text-fg-tertiary">{t('contractor.noDocuments')}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {documents.map((doc) => (
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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label={t('contractor.docLabel')}
            placeholder={t('contractor.docLabelPlaceholder')}
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
            fieldClassName="w-full sm:w-72"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            className="block w-full text-caption text-fg-tertiary file:mr-3 file:rounded-sm file:border file:border-input file:bg-canvas file:px-3 file:py-1.5 file:text-caption file:font-medium file:text-fg sm:w-auto"
          />
          <Button
            variant="primary"
            size="md"
            onClick={upload}
            loading={busy}
            disabled={!docFile || !docLabel.trim()}
          >
            {t('contractor.upload')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
