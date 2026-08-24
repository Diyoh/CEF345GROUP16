/**
 * AUDIT LOG REGRESSION
 *
 * The product's claim is that its figures can be trusted. That claim rests on a change
 * being impossible to make without a record of who made it and what it replaced.
 *
 * Properties asserted here:
 *   - every changed field produces exactly one log row
 *   - the row carries the OLD value, not just the new one
 *   - unchanged fields produce no row (a noisy log is an unread log)
 *   - the actor is recorded by value, so renaming a user cannot rewrite history
 *   - the log write happens on the same executor as the UPDATE, inside one transaction
 */

import { jest } from '@jest/globals';

const mockPool = { query: jest.fn() };
let transactionUsed = false;

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: (work) => {
        transactionUsed = true;
        return work(mockPool);
    }
}));

jest.unstable_mockModule('../utils/fileHandler.js', () => ({
    saveBase64Image: jest.fn()
}));

const { updateProject } = await import('../services/projectService.js');
const pool = (await import('../config/db.js')).default;

const CONTRACTOR = { id: 'con1', name: 'BTP Cameroun S.A.', role: 'CONTRACTOR' };
const ADMIN = { id: 'adm1', name: 'Admin User', role: 'PLATFORM_ADMIN' };

const PROJECT = {
    id: 'proj-1',
    title: 'Bamenda Ring Road',
    contractor_id: 'con1',
    budget: 1000,
    spent: 200,
    progress: 30,
    status: 'Ongoing',
    description: 'Ongoing works.'
};

/** Every query resolves with the project row; enough for the paths under test. */
const mockDb = (project = PROJECT) => {
    pool.query.mockImplementation((sql) => {
        if (/COUNT\(\*\) AS existing/i.test(sql)) return Promise.resolve([[{ existing: 0 }], []]);
        return Promise.resolve([[project], []]);
    });
};

const logRows = () =>
    pool.query.mock.calls
        .filter(([sql]) => /INSERT INTO project_changes/i.test(sql))
        .map(([, params]) => ({
            projectId: params[1],
            actorId: params[2],
            actorName: params[3],
            actorRole: params[4],
            field: params[5],
            oldValue: params[6],
            newValue: params[7]
        }));

beforeEach(() => {
    jest.clearAllMocks();
    transactionUsed = false;
    mockDb();
});

describe('change logging', () => {
    test('records old and new values for a progress change', async () => {
        await updateProject({ actor: CONTRACTOR, projectId: 'proj-1', body: { progress: 45 } });

        const rows = logRows();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            field: 'progress',
            oldValue: '30',
            newValue: '45',
            projectId: 'proj-1'
        });
    });

    test('captures a figure being revised DOWNWARD, the case the log exists for', async () => {
        await updateProject({ actor: CONTRACTOR, projectId: 'proj-1', body: { progress: 10 } });

        const rows = logRows();
        expect(rows[0].oldValue).toBe('30');
        expect(rows[0].newValue).toBe('10');
    });

    test('writes one row per changed field', async () => {
        await updateProject({
            actor: CONTRACTOR,
            projectId: 'proj-1',
            body: { progress: 45, spent: 500, status: 'Stalled' }
        });

        expect(logRows().map((r) => r.field).sort()).toEqual(['progress', 'spent', 'status']);
    });

    test('does not log a field submitted with its existing value', async () => {
        await updateProject({
            actor: CONTRACTOR,
            projectId: 'proj-1',
            body: { progress: 30, spent: 500 } // progress unchanged
        });

        const fields = logRows().map((r) => r.field);
        expect(fields).toEqual(['spent']);
    });

    test('records the actor by value so history survives a rename', async () => {
        await updateProject({ actor: CONTRACTOR, projectId: 'proj-1', body: { progress: 45 } });

        expect(logRows()[0]).toMatchObject({
            actorId: 'con1',
            actorName: 'BTP Cameroun S.A.',
            actorRole: 'CONTRACTOR'
        });
    });

    test('logs admin scope changes too', async () => {
        await updateProject({ actor: ADMIN, projectId: 'proj-1', body: { budget: 5000 } });

        expect(logRows()[0]).toMatchObject({
            field: 'budget',
            oldValue: '1000',
            newValue: '5000',
            actorRole: 'PLATFORM_ADMIN'
        });
    });

    test('the update and its log rows run inside one transaction', async () => {
        await updateProject({ actor: CONTRACTOR, projectId: 'proj-1', body: { progress: 45 } });

        expect(transactionUsed).toBe(true);

        // The UPDATE must precede the log write on the same executor.
        const order = pool.query.mock.calls.map(([sql]) => sql);
        const updateAt = order.findIndex((sql) => sql.startsWith('UPDATE projects SET'));
        const logAt = order.findIndex((sql) => /INSERT INTO project_changes/i.test(sql));

        expect(updateAt).toBeGreaterThanOrEqual(0);
        expect(logAt).toBeGreaterThan(updateAt);
    });

    test('a rejected update writes nothing at all', async () => {
        await expect(
            updateProject({
                actor: { id: 'con2', name: 'Other', role: 'CONTRACTOR' },
                projectId: 'proj-1',
                body: { progress: 99 }
            })
        ).rejects.toThrow('You can only update projects assigned to you');

        expect(logRows()).toHaveLength(0);
        expect(transactionUsed).toBe(false);
    });

    test('an invalid value is rejected before anything is logged', async () => {
        await expect(
            updateProject({ actor: CONTRACTOR, projectId: 'proj-1', body: { progress: 150 } })
        ).rejects.toThrow(/between 0 and 100/);

        expect(logRows()).toHaveLength(0);
    });
});

describe('deletion logging', () => {
    test('records the deletion before removing the project', async () => {
        const { deleteProject } = await import('../services/projectService.js');
        await deleteProject({ actor: ADMIN, projectId: 'proj-1' });

        const rows = logRows();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            field: 'project',
            oldValue: 'Bamenda Ring Road',
            newValue: 'deleted',
            actorName: 'Admin User'
        });

        // The log row must be written BEFORE the row disappears, or the audit trail for a
        // deleted project would be missing its final and most consequential entry.
        const order = pool.query.mock.calls.map(([sql]) => sql);
        const logAt = order.findIndex((sql) => /INSERT INTO project_changes/i.test(sql));
        const deleteAt = order.findIndex((sql) => /DELETE FROM projects/i.test(sql));
        expect(logAt).toBeGreaterThanOrEqual(0);
        expect(deleteAt).toBeGreaterThan(logAt);
    });
});
