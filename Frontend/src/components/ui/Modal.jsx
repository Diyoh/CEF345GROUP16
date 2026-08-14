import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from './cn';
import { Button } from './Button';

/**
 * Modal. Spec: docs/design/03-components.md section 8.
 *
 * Reserved for destructive confirmation and focused create/edit. Success messages are
 * toasts, which is what retires the confirm-on-every-save pattern.
 *
 * Contract: focus moves in on open and returns to the trigger on close, focus is
 * trapped, Escape closes, background scroll is locked, and the panel is labelled by
 * its title. Below 640px it becomes a full-height bottom sheet.
 */

const SIZES = { sm: 'sm:max-w-[560px]', md: 'sm:max-w-[720px]', lg: 'sm:max-w-[960px]' };

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  className,
  closeOnBackdrop = true,
}) => {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const titleId = useRef(`modal-${Math.random().toString(36).slice(2, 9)}`).current;

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    triggerRef.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      // Focus returns to whatever opened the dialog, so keyboard context is never lost.
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-[rgb(var(--overlay)/0.55)] animate-fade-in dark:bg-[rgb(var(--overlay)/0.65)]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-xl bg-raised shadow-e4',
          'animate-scale-in sm:rounded-xl',
          SIZES[size],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-h3 text-fg">
              {title}
            </h2>
            {description && <p className="mt-1 text-caption text-fg-tertiary">{description}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            aria-label="Close dialog"
            leadingIcon={<i className="fas fa-xmark" aria-hidden="true" />}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Destructive confirmation. Names the object, because "Are you sure?" is not a question
 * anyone can answer. The destructive action is never focused by default.
 */
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body, confirmLabel = 'Delete', loading }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-body text-fg-secondary">{body}</p>
  </Modal>
);
