/**
 * HIERARCHY REGRESSION
 *
 * The placement rules from the architecture plan:
 *   a council project covers its own council, nothing else
 *   a ministerial project covers one or more regions, or the national root alone
 *
 * Wrong placement is wrong public record, so the rejects matter as much as the
 * accepts, and every hierarchy move must land in the audit log.
 */

import { jest } from '@jest/globals';

const mockPool = { query: jest.fn() };

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: (work) => work(mockPool),
}));

jest.unstable_mockModule('../utils/fileHandler.js', () => ({
    saveBase64Image: jest.fn(),
}));

const projectService = await import('../services/projectService.js');
const entityService = await import('../services/entityService.js');
const pool = mockPool;

const ADMIN = { id: 'adm1', name: 'Admin User', role: 'PLATFORM_ADMIN' };
const CONTRACTOR = { id: 'con1', name: 'BTP Cameroun S.A.', role: 'CONTRACTOR' };

const ENTITIES = {
    cmr: { id: 'e-cmr', type: 'NATIONAL', code: 'CMR' },
    minfi: { id: 'e-minfi', type: 'MINISTRY', code: 'MINFI' },
    mintp: { id: 'e-mintp', type: 'MINISTRY', code: 'MINTP' },
    nw: { id: 'e-nw', type: 'REGION', code: 'NW' },
    sw: { id: 'e-sw', type: 'REGION', code: 'SW' },
    bamenda: { id: 'e-bam', type: 'COUNCIL', code: 'NW-BAMENDA-I' },
    buea: { id: 'e-buea', type: 'COUNCIL', code: 'SW-BUEA' },
};
const byId = Object.fromEntries(Object.values(ENTITIES).map((e) => [e.id, e]));

const PROJECT = {
    id: 'proj-1',
    title: 'Ring Road',
    contractor_id: 'con1',
    owner_entity_id: null,
    budget: 1000, spent: 100, progress: 10, status: 'Ongoing',
};

/**
 * SQL-pattern router so multi-step service flows run against canned data.
 * project_areas is STATEFUL: the audit log reads the areas back after writing
 * them inside the same transaction, so the double has to remember its inserts.
 */
let areaState = [];

const mockDb = () => {
    areaState = [];
    pool.query.mockImplementation((sql, params = []) => {
        if (/INSERT INTO project_areas/i.test(sql)) {
            areaState.push(params[1]);
            return Promise.resolve([{}, []]);
        }
        if (/DELETE FROM project_areas/i.test(sql)) {
            areaState = [];
            return Promise.resolve([{}, []]);
        }
        if (/FROM users u\s+LEFT JOIN contractor_profiles/i.test(sql)) {
            // Assignment requires a VERIFIED contractor since G2.
            return Promise.resolve([[{ id: 'con1', role: 'CONTRACTOR', status: 'VERIFIED' }], []]);
        }
        if (/SELECT id, type, code FROM gov_entities WHERE id = \?/i.test(sql)) {
            const hit = byId[params[0]];
            return Promise.resolve([hit ? [hit] : [], []]);
        }
        if (/SELECT id, type, code FROM gov_entities WHERE id IN/i.test(sql)) {
            return Promise.resolve([params.map((p) => byId[p]).filter(Boolean), []]);
        }
        if (/SELECT e\.code FROM project_areas/i.test(sql)) {
            const codes = areaState.map((id) => ({ code: byId[id]?.code })).filter((r) => r.code);
            return Promise.resolve([codes, []]);
        }
        if (/SELECT e\.code FROM projects p JOIN gov_entities/i.test(sql)) {
            return Promise.resolve([[], []]);
        }
        if (/COUNT\(\*\) AS existing/i.test(sql)) {
            return Promise.resolve([[{ existing: 0 }], []]);
        }
        if (/SELECT p\.\*, u\.name AS contractorName/i.test(sql)) {
            return Promise.resolve([[{ ...PROJECT }], []]);
        }
        return Promise.resolve([[], []]);
    });
};

const areaInserts = () =>
    pool.query.mock.calls
        .filter(([sql]) => /INSERT INTO project_areas/i.test(sql))
        .map(([, params]) => params[1]);

const loggedFields = () =>
    pool.query.mock.calls
        .filter(([sql]) => /INSERT INTO project_changes/i.test(sql))
        .map(([, params]) => ({ field: params[5], oldValue: params[6], newValue: params[7] }));

beforeEach(() => {
    jest.clearAllMocks();
    mockDb();
});

const createWith = (ownership) =>
    projectService.createProject({
        body: {
            title: 'X', description: 'Y', location: 'Bamenda', region: 'North West',
            contractorId: 'con1', ...ownership,
        },
        files: [],
    });

describe('placement rules on create', () => {
    test('a council project defaults its area to the council itself', async () => {
        await createWith({ ownerEntityId: ENTITIES.bamenda.id });
        expect(areaInserts()).toEqual([ENTITIES.bamenda.id]);
    });

    test('a council project cannot claim another area', async () => {
        await expect(createWith({
            ownerEntityId: ENTITIES.bamenda.id,
            areaEntityIds: [ENTITIES.sw.id],
        })).rejects.toThrow('covers its own council only');
    });

    test('a ministerial project must state its coverage', async () => {
        await expect(createWith({ ownerEntityId: ENTITIES.mintp.id }))
            .rejects.toThrow('must state the regions it covers');
    });

    test('a ministerial road can cross several regions', async () => {
        await createWith({
            ownerEntityId: ENTITIES.mintp.id,
            areaEntityIds: [ENTITIES.nw.id, ENTITIES.sw.id],
        });
        expect(areaInserts().sort()).toEqual([ENTITIES.nw.id, ENTITIES.sw.id].sort());
    });

    test('a national project covers the national root alone', async () => {
        await createWith({
            ownerEntityId: ENTITIES.minfi.id,
            areaEntityIds: [ENTITIES.cmr.id],
        });
        expect(areaInserts()).toEqual([ENTITIES.cmr.id]);
    });

    test('national root mixed with regions is rejected', async () => {
        await expect(createWith({
            ownerEntityId: ENTITIES.mintp.id,
            areaEntityIds: [ENTITIES.cmr.id, ENTITIES.nw.id],
        })).rejects.toThrow('national root alone');
    });

    test('a council cannot be a ministerial project area', async () => {
        await expect(createWith({
            ownerEntityId: ENTITIES.mintp.id,
            areaEntityIds: [ENTITIES.bamenda.id],
        })).rejects.toThrow('regions, or the national root');
    });

    test('a region cannot own a project', async () => {
        await expect(createWith({ ownerEntityId: ENTITIES.nw.id }))
            .rejects.toThrow('owned by a council or a ministry');
    });

    test('multipart JSON strings for areas are accepted', async () => {
        await createWith({
            ownerEntityId: ENTITIES.mintp.id,
            areaEntityIds: JSON.stringify([ENTITIES.nw.id]),
        });
        expect(areaInserts()).toEqual([ENTITIES.nw.id]);
    });

    test('a request without ownership behaves exactly as before', async () => {
        await createWith({});
        expect(areaInserts()).toEqual([]);
    });
});

describe('placement rules on update', () => {
    test('an admin move writes ownerEntity and areas to the audit log', async () => {
        await projectService.updateProject({
            actor: ADMIN,
            projectId: 'proj-1',
            body: { ownerEntityId: ENTITIES.mintp.id, areaEntityIds: [ENTITIES.nw.id, ENTITIES.sw.id] },
        });

        const fields = loggedFields();
        expect(fields.map((f) => f.field)).toEqual(expect.arrayContaining(['ownerEntity', 'areas']));
        const owner = fields.find((f) => f.field === 'ownerEntity');
        expect(owner.newValue).toBe('MINTP');
    });

    test('a contractor cannot move a project in the hierarchy', async () => {
        // Ownership fields from a contractor are ignored, exactly like budget or title,
        // and with no other change the request is refused as empty.
        await expect(projectService.updateProject({
            actor: CONTRACTOR,
            projectId: 'proj-1',
            body: { ownerEntityId: ENTITIES.mintp.id, areaEntityIds: [ENTITIES.nw.id] },
        })).rejects.toThrow('No valid fields to update');

        expect(areaInserts()).toEqual([]);
    });
});

describe('entity tree', () => {
    test('nests councils under regions and rolls project counts up', async () => {
        pool.query.mockImplementation((sql) => {
            if (/FROM gov_entities ORDER BY/i.test(sql)) {
                return Promise.resolve([[
                    { id: 'e-cmr', type: 'NATIONAL', code: 'CMR', name_en: 'Cameroon', name_fr: 'Cameroun', parent_id: null },
                    { id: 'e-mintp', type: 'MINISTRY', code: 'MINTP', name_en: 'Public Works', name_fr: 'Travaux publics', parent_id: 'e-cmr' },
                    { id: 'e-nw', type: 'REGION', code: 'NW', name_en: 'North-West', name_fr: 'Nord-Ouest', parent_id: 'e-cmr' },
                    { id: 'e-bam', type: 'COUNCIL', code: 'NW-BAMENDA-I', name_en: 'Bamenda I', name_fr: 'Bamenda I', parent_id: 'e-nw' },
                ], []]);
            }
            if (/GROUP BY entity_id/i.test(sql)) {
                return Promise.resolve([[
                    { entity_id: 'e-mintp', n: 3 },
                    { entity_id: 'e-nw', n: 2 },
                    { entity_id: 'e-bam', n: 1 },
                ], []]);
            }
            return Promise.resolve([[], []]);
        });

        const tree = await entityService.getEntityTree();

        expect(tree.ministries[0].project_count).toBe(3);
        expect(tree.regions[0].councils).toHaveLength(1);
        // Region shows its own ministerial coverage plus its councils' work.
        expect(tree.regions[0].project_count).toBe(3);
        expect(tree.regions[0].councils[0].project_count).toBe(1);
    });

    test('a region speaks for its councils in project scoping', async () => {
        pool.query.mockImplementation((sql) => {
            if (/WHERE parent_id = \?/i.test(sql)) {
                return Promise.resolve([[{ id: 'e-bam' }, { id: 'e-ndop' }], []]);
            }
            return Promise.resolve([[], []]);
        });

        const ids = await entityService.entityScopeIds({ id: 'e-nw', type: 'REGION' });
        expect(ids).toEqual(['e-nw', 'e-bam', 'e-ndop']);

        const self = await entityService.entityScopeIds({ id: 'e-bam', type: 'COUNCIL' });
        expect(self).toEqual(['e-bam']);
    });
});
