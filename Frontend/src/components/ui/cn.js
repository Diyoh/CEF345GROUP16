/**
 * Class name joiner.
 *
 * Deliberately not tailwind-merge: per the Phase 3 uniformity contract, `className`
 * on a primitive is for LAYOUT ONLY (margin, width, grid placement). Chrome overrides
 * are a review failure, so there is nothing to merge and no dependency to add.
 */
export const cn = (...parts) => parts.flat(Infinity).filter(Boolean).join(' ');
