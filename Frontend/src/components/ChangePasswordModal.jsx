import React, { useState } from 'react';
import { useAppStore } from '../useAppStore';
import { Modal, Button, Input, useToast } from './ui';

/**
 * Change password. Same store call and same validation as before.
 *
 * What changed: success is a toast rather than a green box followed by a 1.5s timer,
 * because a message that disappears on a timer is a message the user may never read.
 * The dialog now closes immediately on success and the confirmation is announced.
 */
export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { changePassword } = useAppStore();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Use at least 6 characters for your new password.');
      return;
    }

    setLoading(true);
    const res = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (res?.success) {
      toast.success('Your password has been updated.');
      reset();
      onClose();
    } else {
      setError(res?.error || 'The password could not be updated.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Change password"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" variant="primary" loading={loading}>
            Update password
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-sm border border-over-line bg-over-bg px-3 py-2.5 text-caption text-over-fg">
            {error}
          </p>
        )}

        <Input
          label="Current password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 6 characters."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          error={confirmPassword && newPassword !== confirmPassword ? 'The two passwords do not match.' : ''}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </form>
    </Modal>
  );
};
