import React, { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { Modal, Button, Input } from './ui';

/**
 * The two-step confirmation every financial action passes through.
 *
 * The caller describes the action in words and money; this modal collects the
 * password and the Private Confirmation Number, hands them to onConfirm, and
 * clears them from its own state the moment it closes. It never stores either
 * factor anywhere, not even in memory beyond the open modal.
 */
export const ConfirmSecondFactor = ({ isOpen, onClose, onConfirm, title, summary, busy, amountLabel, initialAmount }) => {
  const t = useT();
  const [password, setPassword] = useState('');
  const [pcn, setPcn] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setPcn('');
    } else {
      setAmount(initialAmount === undefined || initialAmount === null ? '' : String(initialAmount));
    }
  }, [isOpen, initialAmount]);

  const amountValid = !amountLabel || (Number.isFinite(Number(amount)) && Number(amount) >= 0 && amount !== '');

  const submit = (e) => {
    e.preventDefault();
    if (!password || !pcn.trim() || !amountValid) return;
    const payload = { password, pcn: pcn.trim() };
    if (amountLabel) payload.amountXaf = Number(amount);
    onConfirm(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title || t('twofa.title')} description={summary}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-caption text-fg-secondary">{t('twofa.lead')}</p>
        {amountLabel && (
          <Input
            label={amountLabel}
            type="number"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
        <Input
          label={t('twofa.password')}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label={t('twofa.pcn')}
          hint={t('twofa.pcnHint')}
          required
          value={pcn}
          onChange={(e) => setPcn(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          fieldClassName="font-mono uppercase tracking-widest"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={!password || !pcn.trim() || !amountValid}>
            {t('twofa.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
