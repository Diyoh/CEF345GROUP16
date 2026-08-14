/**
 * ANOMALY FLAG REGRESSION
 *
 * These flags are the platform making a claim about a real company's conduct. Two failure
 * modes matter and they are not symmetric:
 *
 *   - A missed flag hides a problem.
 *   - A WRONG flag accuses an innocent contractor, and one of those costs the platform the
 *     credibility that makes every other flag worth reading.
 *
 * So the negative cases below matter at least as much as the positive ones.
 */

import { computeHealth, computeFlags, THRESHOLDS } from '../services/projectFlags.js';

const NOW = new Date('2026-08-14T00:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

const project = (over = {}) => ({
    id: 'p1',
    status: 'Ongoing',
    budget: 1000,
    spent: 500,
    progress: 50,
    images: ['/a.jpg'],
    updated_at: daysAgo(1),
    completion_date: null,
    ...over
});

const codes = (p) => computeFlags(p, NOW).map((f) => f.code);

describe('computeHealth', () => {
    test('burn and variance are points of build minus points of spend', () => {
        const h = computeHealth(project({ budget: 1000, spent: 800, progress: 20 }), NOW);
        expect(h.burn).toBe(80);
        expect(h.variance).toBe(-60);
        expect(h.band).toBe('critical');
    });

    test('a project with no budget does not divide by zero', () => {
        const h = computeHealth(project({ budget: 0, spent: 0, progress: 0 }), NOW);
        expect(h.burn).toBe(0);
        expect(h.band).toBe('balance');
    });

    test('progress is clamped to the 0-100 range', () => {
        expect(computeHealth(project({ progress: 150 }), NOW).progress).toBe(100);
        expect(computeHealth(project({ progress: -20 }), NOW).progress).toBe(0);
    });
});

describe('flags that should fire', () => {
    test('over budget', () => {
        expect(codes(project({ budget: 1000, spent: 1200 }))).toContain('over_budget');
    });

    test('spending far ahead of building', () => {
        expect(codes(project({ budget: 1000, spent: 800, progress: 20 })))
            .toContain('spending_ahead_of_build');
    });

    test('past its completion date', () => {
        expect(codes(project({ completion_date: '2026-01-01' }))).toContain('past_due');
    });

    test('reported as stalled', () => {
        expect(codes(project({ status: 'Stalled' }))).toContain('stalled');
    });

    test('dormant beyond the threshold', () => {
        expect(codes(project({ updated_at: daysAgo(THRESHOLDS.DORMANT_DAYS + 1) })))
            .toContain('dormant');
    });

    test('substantial progress claimed with no photographs', () => {
        expect(codes(project({ progress: 60, images: [] }))).toContain('no_evidence');
    });
});

describe('flags that must NOT fire — the expensive mistakes', () => {
    test('a healthy project carries no flags at all', () => {
        expect(codes(project())).toEqual([]);
    });

    test('a project spending slightly ahead is not called critical', () => {
        // 55% spent against 50% built: ahead, but well inside normal variation.
        const result = codes(project({ budget: 1000, spent: 550, progress: 50 }));
        expect(result).not.toContain('spending_ahead_of_build');
    });

    test('an over-budget project is not ALSO flagged for spending ahead', () => {
        // Two flags for the same money would read as two separate problems.
        const result = codes(project({ budget: 1000, spent: 1500, progress: 10 }));
        expect(result).toContain('over_budget');
        expect(result).not.toContain('spending_ahead_of_build');
        expect(result).not.toContain('spending_ahead_watch');
    });

    test('a completed project past its date is not "past due"', () => {
        const result = codes(project({ status: 'Completed', completion_date: '2020-01-01', progress: 100 }));
        expect(result).not.toContain('past_due');
    });

    test('a completed project is not "dormant" for being quiet', () => {
        const result = codes(project({
            status: 'Completed',
            progress: 100,
            spent: 1000,
            updated_at: daysAgo(400)
        }));
        expect(result).not.toContain('dormant');
    });

    test('an early-stage project without photos is not accused of hiding evidence', () => {
        expect(codes(project({ progress: 5, images: [] }))).not.toContain('no_evidence');
    });

    test('a project that has spent nothing is not flagged', () => {
        expect(codes(project({ spent: 0, progress: 0 }))).toEqual([]);
    });
});

describe('noise suppression — flags must stay worth reading', () => {
    test('a stalled project is not ALSO flagged dormant', () => {
        // "This is stalled" and "this is not being updated" are the same finding stated
        // twice. Two badges for one problem is how flags become wallpaper.
        const result = codes(project({ status: 'Stalled', updated_at: daysAgo(200) }));
        expect(result).toContain('stalled');
        expect(result).not.toContain('dormant');
    });

    test('work that has not started yet is not flagged dormant', () => {
        // A project approved months ahead of its start date would otherwise be flagged from
        // the day it was created, for failing to report on work nobody expected yet.
        const result = codes(project({
            status: 'Planned',
            start_date: daysAgo(-45),   // starts in 45 days
            updated_at: daysAgo(200)
        }));
        expect(result).not.toContain('dormant');
    });

    test('a started, quiet, in-flight project IS still flagged dormant', () => {
        // The exemptions must not swallow the real case.
        const result = codes(project({
            status: 'Ongoing',
            start_date: daysAgo(200),
            updated_at: daysAgo(200)
        }));
        expect(result).toContain('dormant');
    });

    test('a realistic healthy portfolio produces no flags', () => {
        const healthy = [
            project({ budget: 85e9, spent: 44e9, progress: 55, completion_date: daysAgo(-300), start_date: daysAgo(400) }),
            project({ status: 'Completed', budget: 12e9, spent: 11.5e9, progress: 100, completion_date: daysAgo(200) }),
            project({ status: 'Planned', budget: 250e6, spent: 0, progress: 0, start_date: daysAgo(-45), completion_date: daysAgo(-400) })
        ];
        expect(healthy.flatMap(codes)).toEqual([]);
    });
});

describe('flag payloads', () => {
    test('every flag carries the figures that triggered it', () => {
        const flags = computeFlags(project({ budget: 1000, spent: 800, progress: 20 }), NOW);
        const flag = flags.find((f) => f.code === 'spending_ahead_of_build');

        expect(flag.detail).toMatch(/80%/);
        expect(flag.detail).toMatch(/20%/);
        // A reader must be able to disagree without trusting us.
        expect(flag.label).not.toMatch(/fraud|corrupt|steal|theft/i);
    });

    test('critical flags sort ahead of warnings', () => {
        const flags = computeFlags(
            project({ budget: 1000, spent: 1200, status: 'Stalled', completion_date: '2020-01-01' }),
            NOW
        );
        expect(flags[0].severity).toBe('critical');
        expect(flags.at(-1).severity).toBe('warning');
    });

    test('a malformed row yields no flags instead of throwing', () => {
        expect(() => computeFlags({}, NOW)).not.toThrow();
        expect(() => computeFlags({ budget: 'abc', spent: null, images: null }, NOW)).not.toThrow();
    });
});
