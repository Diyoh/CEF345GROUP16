import { ProjectStatus } from '../types';

/**
 * Derived project health.
 * Spec: docs/design/02-ia-ux.md section 2.
 *
 * ProjectStatus keeps its four stored values, because the API and the socket payloads
 * depend on them. "Delayed" and "Over budget" are DERIVED here from figures a contractor
 * cannot edit without it showing up in the money, which makes them harder to game than
 * a self-reported dropdown.
 */

export const BANDS = {
  balance: { tone: 'progress', label: 'On balance' },
  watch: { tone: 'delayed', label: 'Watch' },
  critical: { tone: 'over', label: 'Critical' },
  over: { tone: 'over', label: 'Over budget' },
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const projectHealth = (project = {}) => {
  const budget = num(project.budget);
  const spent = num(project.spent);
  const progress = Math.max(0, Math.min(100, num(project.progress)));

  const burn = budget > 0 ? (spent / budget) * 100 : 0;
  const variance = Math.round(progress - burn);
  const overBudget = burn > 100;

  const completionDate = project.completionDate || project.completion_date || null;
  const completed = project.status === ProjectStatus.COMPLETED;
  const delayed = Boolean(
    completionDate && !completed && new Date(completionDate).getTime() < Date.now()
  );

  // Over budget always wins: it is the only condition that means the money is gone.
  const band = overBudget ? 'over' : variance >= -5 ? 'balance' : variance >= -20 ? 'watch' : 'critical';

  return {
    budget,
    spent,
    progress,
    burn,
    burnRounded: Math.round(burn),
    variance,
    // A positive variance is shown neutral, not green: underspend on public works is not
    // automatically good news, and colouring it as a win is a claim the data cannot support.
    varianceTone: variance > 0 ? 'neutral' : BANDS[band].tone,
    band,
    bandLabel: BANDS[band].label,
    overBudget,
    delayed,
    completionDate,
    /** Plain-language interpretation. The meter is aria-hidden; this sentence is the truth. */
    sentence: budget > 0
      ? `${Math.round(burn)}% of the budget is spent and ${Math.round(progress)}% of the work is done.`
      : 'No budget has been recorded for this project yet.',
  };
};

/** Lifecycle badge tone for a stored status value. */
export const statusTone = (status) =>
  ({
    [ProjectStatus.PLANNED]: 'planned',
    [ProjectStatus.ONGOING]: 'progress',
    [ProjectStatus.COMPLETED]: 'done',
    [ProjectStatus.STALLED]: 'stalled',
  }[status] || 'neutral');

export const statusIcon = (status) =>
  ({
    [ProjectStatus.PLANNED]: 'fa-regular fa-circle',
    [ProjectStatus.ONGOING]: 'fa-solid fa-circle-half-stroke',
    [ProjectStatus.COMPLETED]: 'fa-solid fa-circle-check',
    [ProjectStatus.STALLED]: 'fa-solid fa-circle-pause',
  }[status] || 'fa-solid fa-circle');

/** Sort helper for "worst first" surfaces: the admin overview and the chart. */
export const byVarianceAsc = (a, b) => projectHealth(a).variance - projectHealth(b).variance;
