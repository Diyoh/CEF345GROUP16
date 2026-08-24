/**
 * LIVE FINANCE EVENTS
 *
 * The store owns the one socket connection; finance-aware views should not
 * each open another. So the store forwards every `finance:changed` broadcast
 * into this tiny pub-sub, and any component that shows money subscribes to
 * refetch when an event concerns it.
 *
 * The payload is { kind, entityIds, projectId, contractorId }: which kind of
 * record moved and which institutions it touches. Subscribers decide
 * relevance; the module just delivers.
 */

const listeners = new Set();

export const publishFinanceChange = (payload) => {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // One broken subscriber must not stop delivery to the others.
    }
  }
};

export const subscribeFinanceChanges = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True when the event touches any of the given entity ids. */
export const touchesEntity = (payload, ids) => {
  const wanted = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  return (payload?.entityIds || []).some((id) => wanted.includes(id));
};
