/**
 * PROJECT FLAGS — automatic anomaly detection
 *
 * The platform already held every figure needed to say "this project is spending far faster
 * than it is building", and said nothing. A citizen had to compare two percentages across a
 * page and draw the conclusion themselves. This module draws it for them.
 *
 * DESIGN RULES, in order of importance:
 *
 * 1. A flag states a FACT, never an accusation. "78% spent, 20% built" is checkable and
 *    defensible; "suspected fraud" is neither, and one wrong accusation against a real
 *    contractor would cost the platform the credibility it exists to build.
 *
 * 2. Every flag carries the numbers that triggered it. A reader must be able to disagree
 *    with the verdict without having to trust it. An unexplained flag is a rumour.
 *
 * 3. Flags are DERIVED, never stored or self-reported. A contractor cannot clear one except
 *    by changing figures that are themselves logged in project_changes. That is what makes
 *    them harder to game than a status dropdown.
 *
 * 4. Thresholds live here alone, so the API, the CSV export and the UI cannot disagree about
 *    what counts as a problem.
 *
 * WHY SERVER-SIDE: this was previously computed only in the browser
 * (Frontend/src/utils/projectHealth.js), so the API, any future data consumer and the export
 * saw raw numbers with no interpretation, and "show me only flagged projects" could not be
 * answered without downloading everything first.
 */

/** Spending this far ahead of building is the headline anomaly. Percentage points. */
const VARIANCE_WATCH = -5;
const VARIANCE_CRITICAL = -20;

/** A project untouched this long is not being reported on, whatever its status says. */
const DORMANT_DAYS = 90;

/** How long a payment may sit unaffirmed before silence itself is the finding. */
const AFFIRM_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const daysSince = (value, now) => {
    if (!value) return null;
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return null;
    return Math.floor((now - then) / DAY_MS);
};

/**
 * computeHealth
 * The shared arithmetic. Mirrors Frontend/src/utils/projectHealth.js deliberately — see the
 * landmine note in the skill: if a threshold changes here it must change there too, or the
 * page and the API will disagree about the same project.
 */
export const computeHealth = (project = {}, now = Date.now()) => {
    const budget = num(project.budget);
    const spent = num(project.spent);
    const progress = Math.max(0, Math.min(100, num(project.progress)));

    const burn = budget > 0 ? (spent / budget) * 100 : 0;
    const variance = Math.round(progress - burn);
    const overBudget = burn > 100;

    const completionDate = project.completion_date || project.completionDate || null;
    const completed = project.status === 'Completed';
    const delayed = Boolean(
        completionDate && !completed && new Date(completionDate).getTime() < now
    );

    const band = overBudget
        ? 'over'
        : variance >= VARIANCE_WATCH
            ? 'balance'
            : variance >= VARIANCE_CRITICAL
                ? 'watch'
                : 'critical';

    return {
        budget,
        spent,
        progress,
        burn: Math.round(burn),
        variance,
        band,
        overBudget,
        delayed,
        completionDate
    };
};

/**
 * Flag definitions. `severity` orders them for display: `critical` means money is gone or
 * unaccounted for; `warning` means the project is off track but the figures still add up.
 */
const DEFINITIONS = [
    {
        code: 'over_budget',
        severity: 'critical',
        label: 'Over budget',
        test: (h) => h.overBudget,
        detail: (h) => `${h.burn}% of the budget has been spent.`,
        params: (h) => ({ burn: h.burn })
    },
    {
        code: 'spending_ahead_of_build',
        severity: 'critical',
        label: 'Spending far ahead of building',
        // Deliberately excludes projects already flagged over budget: two flags for the same
        // money would read as two problems.
        test: (h) => !h.overBudget && h.variance < VARIANCE_CRITICAL,
        detail: (h) => `${h.burn}% of the budget is spent but only ${h.progress}% of the work is done.`,
        params: (h) => ({ burn: h.burn, progress: h.progress })
    },
    {
        code: 'spending_ahead_watch',
        severity: 'warning',
        label: 'Spending ahead of building',
        test: (h) => !h.overBudget && h.variance < VARIANCE_WATCH && h.variance >= VARIANCE_CRITICAL,
        detail: (h) => `${h.burn}% spent against ${h.progress}% built.`,
        params: (h) => ({ burn: h.burn, progress: h.progress })
    },
    {
        code: 'past_due',
        severity: 'warning',
        label: 'Past its completion date',
        test: (h) => h.delayed,
        detail: (h, p, now) => {
            const over = daysSince(h.completionDate, now);
            return over === null ? 'The completion date has passed.' : `${over} days past the expected completion date.`;
        },
        params: (h, p, now) => ({ days: daysSince(h.completionDate, now) })
    },
    {
        code: 'stalled',
        severity: 'warning',
        label: 'Reported as stalled',
        test: (h, p) => p.status === 'Stalled',
        detail: () => 'The contractor has reported this project as stalled.',
        params: () => ({})
    },
    {
        code: 'dormant',
        severity: 'warning',
        label: 'No recent update',
        test: (h, p, now) => {
            // A completed project is legitimately quiet.
            if (p.status === 'Completed') return false;

            // A STALLED project is also expected to be quiet — that is what stalled means.
            // Flagging both says "this is stalled" and "this is not being updated" as though
            // they were two findings. One flag per problem, or the flags become wallpaper
            // and readers stop looking at any of them.
            if (p.status === 'Stalled') return false;

            // Work that has not started yet cannot be behind on reporting. Without this a
            // project approved months in advance is flagged from the day it is created.
            const startDate = p.start_date || p.startDate;
            if (startDate && new Date(startDate).getTime() > now) return false;

            const age = daysSince(p.updated_at || p.updatedAt, now);
            return age !== null && age >= DORMANT_DAYS;
        },
        detail: (h, p, now) => `No update for ${daysSince(p.updated_at || p.updatedAt, now)} days.`,
        params: (h, p, now) => ({ days: daysSince(p.updated_at || p.updatedAt, now) })
    },
    {
        code: 'no_evidence',
        severity: 'warning',
        label: 'Progress reported without photos',
        // Photos are how a claim of physical progress becomes checkable. Claiming
        // substantial work with none is worth surfacing, though it is often just an
        // administrative omission — hence warning, not critical.
        test: (h, p) => h.progress >= 25 && Array.isArray(p.images) && p.images.length === 0,
        detail: (h) => `${h.progress}% of work reported with no site photographs.`,
        params: (h) => ({ progress: h.progress })
    },
    {
        code: 'payment_mismatch',
        severity: 'critical',
        label: 'Contractor affirms less than was paid',
        // paymentsPaidAffirmed: sum of payments the contractor has answered;
        // paymentsAffirmed: what they say arrived. Aggregates joined by the
        // project queries; absent columns mean the row was fetched without
        // payment data, and silence must not fire a critical flag.
        test: (h, p) => {
            const paid = p.payments_paid_affirmed ?? p.paymentsPaidAffirmed;
            const affirmed = p.payments_affirmed ?? p.paymentsAffirmed;
            return paid !== undefined && paid !== null && num(affirmed) < num(paid);
        },
        detail: (h, p) => {
            const paid = num(p.payments_paid_affirmed ?? p.paymentsPaidAffirmed);
            const affirmed = num(p.payments_affirmed ?? p.paymentsAffirmed);
            return `The institution recorded ${paid.toLocaleString('en-GB')} FCFA paid; the contractor affirms ${affirmed.toLocaleString('en-GB')} FCFA received.`;
        },
        params: (h, p) => ({
            paid: num(p.payments_paid_affirmed ?? p.paymentsPaidAffirmed),
            affirmed: num(p.payments_affirmed ?? p.paymentsAffirmed)
        })
    },
    {
        code: 'payment_unconfirmed',
        severity: 'warning',
        label: 'Payment awaiting contractor affirmation',
        test: (h, p, now) => {
            const oldest = p.oldest_unaffirmed_at ?? p.oldestUnaffirmedAt;
            if (!oldest) return false;
            const age = daysSince(oldest, now);
            return age !== null && age >= AFFIRM_DAYS;
        },
        detail: (h, p, now) => `A recorded payment has waited ${daysSince(p.oldest_unaffirmed_at ?? p.oldestUnaffirmedAt, now)} days without the contractor affirming receipt.`,
        params: (h, p, now) => ({ days: daysSince(p.oldest_unaffirmed_at ?? p.oldestUnaffirmedAt, now) })
    },
    {
        code: 'contractor_unverified',
        severity: 'critical',
        label: 'Contractor not verified by MINTP',
        // Assignment of unverified contractors is blocked at the service, so
        // this fires only for records that predate the rule, and it should:
        // an unchecked company holding public works is exactly the finding.
        test: (h, p) => {
            const status = p.contractor_verification ?? p.contractorVerification;
            const contractorId = p.contractor_id ?? p.contractorId;
            return Boolean(contractorId) && status !== undefined && status !== 'VERIFIED';
        },
        detail: () => 'The assigned contractor has not been verified by the Ministry of Public Works.',
        params: (h, p) => ({ status: (p.contractor_verification ?? p.contractorVerification) || 'NONE' })
    }
];

/**
 * computeFlags
 * Returns the anomalies that apply to a project, most serious first.
 */
export const computeFlags = (project = {}, now = Date.now()) => {
    const health = computeHealth(project, now);

    return DEFINITIONS
        .filter((def) => {
            try {
                return def.test(health, project, now);
            } catch {
                return false; // A malformed row must never break the listing.
            }
        })
        .map((def) => ({
            code: def.code,
            severity: def.severity,
            // English prose, for the public API and any non-browser consumer. Documented as
            // English in the open-data contract.
            label: def.label,
            detail: def.detail(health, project, now),
            // The same facts as data, so the interface can render them in the reader's
            // language. Cameroon is officially bilingual and the francophone regions are the
            // majority, so a flag that can only be phrased in English is a flag most of the
            // country cannot read. The UI renders from `code` + `params`, never from `detail`.
            params: def.params ? def.params(health, project, now) : {}
        }))
        .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
};

/**
 * attachFlags
 * Decorates rows in place with `health` and `flags`. Called for every project the API
 * returns so no consumer has to recompute the verdict.
 */
export const attachFlags = (projects, now = Date.now()) => {
    for (const project of projects) {
        project.health = computeHealth(project, now);
        project.flags = computeFlags(project, now);
    }
    return projects;
};

/**
 * SQL predicates, so filtering happens in the database rather than by downloading every
 * project and discarding most of them — on a metered mobile connection that is the
 * difference between a usable query and an unaffordable one.
 *
 * These MUST stay equivalent to the `test` functions above. They are duplicated logic and
 * that is a real cost, accepted because the alternative is a full table scan in JavaScript
 * on every request.
 *
 * `no_evidence` is deliberately absent: it needs the project_images join, and approximating
 * it here would make the filter disagree with the badges on the cards it returns.
 */
const SQL_OVER_BUDGET = `(p.budget > 0 AND p.spent > p.budget)`;
const SQL_SPENDING_AHEAD = `(p.budget > 0 AND (p.progress - ((p.spent / p.budget) * 100)) < ${VARIANCE_CRITICAL})`;
const SQL_PAST_DUE = `(p.completion_date IS NOT NULL AND p.completion_date < CURDATE() AND p.status <> 'Completed')`;
const SQL_STALLED = `(p.status = 'Stalled')`;
// Mirrors the exemptions in the `dormant` test above: completed and stalled projects are
// expected to be quiet, and work that has not started cannot be behind on reporting.
const SQL_DORMANT = `(
    p.status NOT IN ('Completed', 'Stalled')
    AND (p.start_date IS NULL OR p.start_date <= CURDATE())
    AND p.updated_at < DATE_SUB(NOW(), INTERVAL ${DORMANT_DAYS} DAY)
)`;

const SQL_PAYMENT_MISMATCH = `EXISTS (
    SELECT 1 FROM project_payments pp WHERE pp.project_id = p.id
    AND pp.affirmed_at IS NOT NULL AND pp.amount_affirmed_xaf < pp.amount_xaf
)`;
const SQL_PAYMENT_UNCONFIRMED = `EXISTS (
    SELECT 1 FROM project_payments pp WHERE pp.project_id = p.id
    AND pp.affirmed_at IS NULL AND pp.initiated_at < DATE_SUB(NOW(), INTERVAL ${AFFIRM_DAYS} DAY)
)`;
const SQL_CONTRACTOR_UNVERIFIED = `(p.contractor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM contractor_profiles cp WHERE cp.user_id = p.contractor_id AND cp.status = 'VERIFIED'
))`;

/** Money is gone or unaccounted for. `?flagged=critical` */
export const CRITICAL_SQL = `(${SQL_OVER_BUDGET} OR ${SQL_SPENDING_AHEAD} OR ${SQL_PAYMENT_MISMATCH} OR ${SQL_CONTRACTOR_UNVERIFIED})`;

/**
 * At least one flag of any severity. `?flagged=true`
 *
 * This previously matched only the critical money conditions, so the filter returned
 * nothing while the cards it was meant to filter visibly carried warning badges. "Flagged"
 * has to mean what a reader assumes it means.
 */
export const FLAGGED_SQL = `(${CRITICAL_SQL} OR ${SQL_PAST_DUE} OR ${SQL_STALLED} OR ${SQL_DORMANT} OR ${SQL_PAYMENT_UNCONFIRMED})`;

export const THRESHOLDS = { VARIANCE_WATCH, VARIANCE_CRITICAL, DORMANT_DAYS, AFFIRM_DAYS };
