/**
 * PROJECT SERVICE TESTS
 *
 * These cover the rules that protect the integrity of the platform's data.
 * Note that none of them start a server or touch HTTP — that is the point of
 * keeping business rules in a service rather than in a controller.
 */

import { jest } from '@jest/globals';

// Mock external dependencies BEFORE importing the module under test.
const mockPool = { query: jest.fn() };

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    // Runs the work immediately against the mocked pool. Commit/rollback semantics are a
    // database behaviour, not a unit-testable one; what matters here is that every write
    // inside the callback still lands on the same executor.
    withTransaction: (work) => work(mockPool)
}));

jest.unstable_mockModule('../utils/fileHandler.js', () => ({
    saveBase64Image: jest.fn()
}));

const projectService = await import('../services/projectService.js');
const { assertCanEditProject, updateProject, PROJECT_STATUSES } = projectService;
const pool = (await import('../config/db.js')).default;

const ADMIN = { id: 'adm1', name: 'Admin User', role: 'PLATFORM_ADMIN' };
const CONTRACTOR_A = { id: 'con1', name: 'Contractor A', role: 'CONTRACTOR' };
const CONTRACTOR_B = { id: 'con2', name: 'Contractor B', role: 'CONTRACTOR' };
const DEVELOPER = { id: 'dev1', name: 'Dev Admin', role: 'DEVELOPER_ADMIN' };

// A project assigned to CONTRACTOR_A.
const PROJECT = {
    id: 'proj-1',
    title: 'Bamenda Ring Road',
    contractor_id: 'con1',
    budget: 1000,
    spent: 200,
    progress: 30,
    status: 'Ongoing'
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('assertCanEditProject', () => {
    test('allows a contractor to edit a project assigned to them', () => {
        expect(() => assertCanEditProject(CONTRACTOR_A, PROJECT)).not.toThrow();
    });

    test('REJECTS a contractor editing a project assigned to someone else', () => {
        expect(() => assertCanEditProject(CONTRACTOR_B, PROJECT))
            .toThrow('You can only update projects assigned to you');
    });

    test('rejection carries a 403 status', () => {
        try {
            assertCanEditProject(CONTRACTOR_B, PROJECT);
            throw new Error('should have thrown');
        } catch (error) {
            expect(error.statusCode).toBe(403);
        }
    });

    test('allows an admin to edit any project', () => {
        expect(() => assertCanEditProject(ADMIN, PROJECT)).not.toThrow();
    });

    test('rejects roles that have no business editing projects', () => {
        expect(() => assertCanEditProject(DEVELOPER, PROJECT)).toThrow(/cannot modify projects/);
    });

    test('rejects a missing actor', () => {
        expect(() => assertCanEditProject(null, PROJECT)).toThrow('Not authorized');
    });
});

describe('updateProject', () => {
    /** findProjectRow() is the first query the service makes. */
    const mockProjectLookup = (project = PROJECT) => {
        pool.query.mockResolvedValue([[project], []]);
    };

    test('blocks a contractor from updating a project they are not assigned to', async () => {
        mockProjectLookup();

        await expect(updateProject({
            actor: CONTRACTOR_B,
            projectId: 'proj-1',
            body: { progress: 90 }
        })).rejects.toThrow('You can only update projects assigned to you');

        // Nothing was written.
        const writes = pool.query.mock.calls.filter(([sql]) => /UPDATE|INSERT/i.test(sql));
        expect(writes).toHaveLength(0);
    });

    test('returns 404 for a project that does not exist', async () => {
        pool.query.mockResolvedValue([[], []]);

        await expect(updateProject({
            actor: ADMIN,
            projectId: 'missing',
            body: { progress: 10 }
        })).rejects.toMatchObject({ statusCode: 404 });
    });

    test('rejects progress above 100', async () => {
        mockProjectLookup();

        await expect(updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { progress: 150 }
        })).rejects.toThrow('Progress must be a whole number between 0 and 100');
    });

    test('rejects negative spending', async () => {
        mockProjectLookup();

        await expect(updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { spent: -500 }
        })).rejects.toThrow('Amount spent cannot be negative');
    });

    test('rejects a status outside the allowed set', async () => {
        mockProjectLookup();

        await expect(updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { status: 'Abandoned' }
        })).rejects.toThrow(/Status must be one of/);
    });

    test('ALLOWS spending to exceed the budget — overspend must stay visible', async () => {
        mockProjectLookup();

        await updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { spent: 5000 } // budget is 1000
        });

        const update = pool.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE projects SET'));
        expect(update).toBeDefined();
        expect(update[1]).toContain(5000);
    });

    test('ignores fields a contractor is not allowed to change', async () => {
        mockProjectLookup();

        await updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { progress: 50, budget: 999999, title: 'Renamed', contractorId: 'con2' }
        });

        const [sql, params] = pool.query.mock.calls.find(([q]) => q.startsWith('UPDATE projects SET'));

        expect(sql).toContain('progress = ?');
        expect(sql).not.toContain('budget = ?');
        expect(sql).not.toContain('title = ?');
        expect(sql).not.toContain('contractor_id = ?');
        expect(params).toEqual([50, 'proj-1']);
    });

    test('lets an admin change project scope fields', async () => {
        mockProjectLookup();

        await updateProject({
            actor: ADMIN,
            projectId: 'proj-1',
            body: { title: 'Renamed Road', budget: 2000 }
        });

        const [sql] = pool.query.mock.calls.find(([q]) => q.startsWith('UPDATE projects SET'));
        expect(sql).toContain('title = ?');
        expect(sql).toContain('budget = ?');
    });

    test('rejects an update that carries no valid fields', async () => {
        mockProjectLookup();

        await expect(updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { somethingIrrelevant: true }
        })).rejects.toThrow('No valid fields to update');
    });

    test('coerces numeric strings from multipart form submissions', async () => {
        mockProjectLookup();

        await updateProject({
            actor: CONTRACTOR_A,
            projectId: 'proj-1',
            body: { progress: '75', spent: '450' } // FormData delivers strings
        });

        const [, params] = pool.query.mock.calls.find(([q]) => q.startsWith('UPDATE projects SET'));
        expect(params).toContain(75);
        expect(params).toContain(450);
    });
});

describe('PROJECT_STATUSES', () => {
    test('matches the ENUM defined in the database schema', () => {
        expect(PROJECT_STATUSES).toEqual(['Planned', 'Ongoing', 'Stalled', 'Completed']);
    });
});
