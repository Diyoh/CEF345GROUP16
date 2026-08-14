import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from './cn';

/**
 * Toast. Spec: docs/design/03-components.md section 9.
 *
 * Replaces the blocking "saved successfully" modal, which cost a dismissal click on
 * every single save.
 *
 * Contract:
 *  - The live regions exist in the DOM from mount. Regions inserted at announcement
 *    time are unreliable across screen readers.
 *  - Success and info are polite; errors are assertive and NEVER auto-dismiss.
 *  - Timers pause on hover and on focus within the region.
 */

const ToastContext = createContext(null);

const TONES = {
  success: { bar: 'bg-accent', icon: 'fa-circle-check', iconColor: 'text-accent' },
  error: { bar: 'bg-danger', icon: 'fa-circle-exclamation', iconColor: 'text-danger' },
  info: { bar: 'bg-info', icon: 'fa-circle-info', iconColor: 'text-info' },
};

const DURATIONS = { success: 4000, info: 6000, error: null };

let nextId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone, message, options = {}) => {
      const id = ++nextId;
      // Max 3 stacked; the oldest goes rather than the newest being dropped, because the
      // newest is the one describing what the user just did.
      setToasts((list) => [...list.slice(-2), { id, tone, message, action: options.action }]);

      const ms = options.duration ?? DURATIONS[tone];
      if (ms) timers.current.set(id, setTimeout(() => dismiss(id), ms));
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
      dismiss,
    }),
    [push, dismiss]
  );

  const pauseAll = () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-0 sm:items-end"
        onMouseEnter={pauseAll}
        onFocusCapture={pauseAll}
      >
        <div role="status" aria-live="polite" className="contents">
          {toasts
            .filter((t) => t.tone !== 'error')
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
        <div role="alert" aria-live="assertive" className="contents">
          {toasts
            .filter((t) => t.tone === 'error')
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  const tone = TONES[toast.tone] || TONES.info;
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-[400px] items-start gap-3 overflow-hidden rounded-md',
        'border border-line bg-raised p-3 shadow-e3 animate-fade-in'
      )}
    >
      <span className={cn('mt-0.5 shrink-0', tone.iconColor)} aria-hidden="true">
        <i className={cn('fas', tone.icon)} />
      </span>
      <p className="min-w-0 flex-1 text-caption text-fg">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action.onClick();
            onDismiss(toast.id);
          }}
          className="shrink-0 text-caption font-medium text-accent underline-offset-4 hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-fg-tertiary hover:text-fg"
      >
        <i className="fas fa-xmark" aria-hidden="true" />
      </button>
    </div>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
