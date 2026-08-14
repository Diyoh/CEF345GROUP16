import React from 'react';
import { Modal, Button } from '../ui';

/**
 * StatusModal is retained but repurposed.
 *
 * It used to fire on BOTH success and failure, which cost a dismissal click on every
 * single save. Success is now a toast. This component stays for the cases where blocking
 * the user is correct: a failure they must acknowledge before continuing.
 *
 * The API is unchanged, so existing call sites keep working.
 */
export const StatusModal = ({ isOpen, onClose, type = 'success', message }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="sm"
    title={type === 'success' ? 'Done' : 'That did not work'}
    footer={
      <Button variant={type === 'success' ? 'primary' : 'secondary'} onClick={onClose}>
        Close
      </Button>
    }
  >
    <div className="flex items-start gap-3">
      <i
        className={`fas mt-0.5 text-h3 ${
          type === 'success' ? 'fa-circle-check text-accent' : 'fa-circle-exclamation text-danger'
        }`}
        aria-hidden="true"
      />
      <p className="text-body text-fg-secondary">{message}</p>
    </div>
  </Modal>
);
