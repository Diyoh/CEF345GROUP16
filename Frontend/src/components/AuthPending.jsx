import React from 'react';
import { Skeleton } from './ui';
import { useT } from '../i18n';

/**
 * Shown while the session check is still in flight.
 *
 * WHY THIS EXISTS:
 * The store starts with `user = null` and only learns who you are once `getMe()` returns.
 * A guard that reads `user` alone therefore sees "logged out" on every page load and
 * redirects — so refreshing an admin or contractor page bounced you to the login screen
 * and then back again.
 *
 * On Render's free tier that is not a flicker. A cold start can take ~30 seconds, during
 * which an authenticated user sits on a login form and reasonably concludes their session
 * expired. Waiting for `authChecked` before deciding is the difference between a brief
 * skeleton and a user retyping credentials they never needed.
 *
 * `role="status"` announces the wait to screen readers rather than leaving them on a
 * silent page.
 */
export const AuthPending = ({ label }) => {
  const t = useT();
  const text = label || t('common.checkingSession');

  return (
  <div className="mx-auto max-w-content px-4 py-10 md:px-8" role="status" aria-live="polite">
    <span className="sr-only">{text}</span>

    <Skeleton className="h-9 w-64" />
    <Skeleton className="mt-3 h-5 w-80" />

    <div className="mt-8 grid gap-4 sm:grid-cols-3" aria-hidden="true">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>

    <Skeleton className="mt-8 h-64 w-full rounded-lg" aria-hidden="true" />
  </div>
  );
};
