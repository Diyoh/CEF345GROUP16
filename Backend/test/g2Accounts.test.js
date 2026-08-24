/**
 * PHASE G2 REGRESSION: entity accounts, PCN issuance, contractor verification.
 *
 * These are the accounts that will move records of money in G3, so the negative
 * cases are the point: a code without an institution mints nothing, an entity
 * admin cannot reach past their institution, verification belongs to MINTP, and
 * an unverified contractor cannot be put in charge of public works.
 */

import { jest } from '@jest/globals';

// register signs a session token on success; the suite needs a secret to sign with.
process.env.JWT_SECRET = 'test-secret';

const mockPool = { query: jest.fn() };

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: (work) => work(mockPool),
}));

jest.unstable_mockModule('../utils/fileHandler.js', () => ({
    saveBase64Image: jest.fn(),
}));

const { register } = await import('../controllers/authController.js');
const { generateAccessCode } = await import('../controllers/adminController.js');
const contractorService = await import('../services/contractorService.js');
const projectService = await import('../services/projectService.js');
const pool = mockPool;

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
};

const PLATFORM = { id: 'adm1', name: 'Admin', role: 'PLATFORM_ADMIN' };
const MINTP_ADMIN = { id: 'ent1', name: 'Works Admin', role: 'ENTITY_ADMIN', entity_id: 'e-mintp', entity_code: 'MINTP' };
const COUNCIL_ADMIN = { id: 'ent2', name: 'Bamenda Admin', role: 'ENTITY_ADMIN', entity_id: 'e-bam', entity_code: 'NW-BAMENDA-I' };

beforeEach(() => jest.clearAllMocks());

describe('registration with an entity-bound code', () => {
    const routeRegister = (codeRow) => {
        pool.query.mockImplementation((sql) => {
            if (/FROM access_codes WHERE code/i.test(sql)) return Promise.resolve([[codeRow], []]);
            if (/SELECT email FROM users/i.test(sql)) return Promise.resolve([[], []]);
            if (/SELECT id FROM users WHERE id LIKE/i.test(sql)) return Promise.resolve([[], []]);
            return Promise.resolve([[], []]);
        });
    };

    const submit = async () => {
        const res = makeRes();
        await register(
            { body: { name: 'Bamenda Council', email: 'x@bamenda.cm', password: 'longenough', accessCode: 'AAAAA-AAAAA' } },
            res
        );
        return res;
    };

    test('an ENTITY_ADMIN account is born bound to its institution, with a PCN', async () => {
        routeRegister({ role: 'ENTITY_ADMIN', entity_id: 'e-bam' });
        const res = await submit();

        const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO users/i.test(sql));
        // Params: id, name, email, hash, role, entity_id, pcn_hash.
        expect(insert[1][0]).toBe('ent1');
        expect(insert[1][5]).toBe('e-bam');
        expect(insert[1][6]).toEqual(expect.stringMatching(/^\$2/)); // a bcrypt hash, never the clear PCN

        const payload = res.json.mock.calls[0][0].data;
        expect(payload.pcn).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
        expect(payload.entityId).toBe('e-bam');
    });

    test('an ENTITY_ADMIN code without an institution mints nothing', async () => {
        routeRegister({ role: 'ENTITY_ADMIN', entity_id: null });
        const res = await submit();

        expect(res.status).toHaveBeenCalledWith(400);
        const inserts = pool.query.mock.calls.filter(([sql]) => /INSERT INTO users/i.test(sql));
        expect(inserts).toHaveLength(0);
    });

    test('a contractor gets a PCN and opens with a pending verification file', async () => {
        routeRegister({ role: 'CONTRACTOR', entity_id: null });
        const res = await submit();

        const profile = pool.query.mock.calls.find(([sql]) => /INSERT INTO contractor_profiles/i.test(sql));
        expect(profile).toBeDefined();
        expect(res.json.mock.calls[0][0].data.pcn).toMatch(/-/);
    });

    test('a developer account gets no PCN: it never touches money', async () => {
        routeRegister({ role: 'DEVELOPER_ADMIN', entity_id: null });
        const res = await submit();

        expect(res.json.mock.calls[0][0].data.pcn).toBeUndefined();
        const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO users/i.test(sql));
        expect(insert[1][6]).toBeNull();
    });
});

describe('entity-bound access codes', () => {
    test('an ENTITY_ADMIN code must name its institution', async () => {
        const res = makeRes();
        await generateAccessCode({ body: { role: 'ENTITY_ADMIN' }, user: PLATFORM }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('the named institution must be a ministry or a council', async () => {
        pool.query.mockResolvedValue([[{ id: 'e-nw', type: 'REGION' }], []]);
        const res = makeRes();
        await generateAccessCode({ body: { role: 'ENTITY_ADMIN', entityId: 'e-nw' }, user: PLATFORM }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('a valid institution lands in the stored code', async () => {
        pool.query.mockImplementation((sql) => {
            if (/SELECT id, type FROM gov_entities/i.test(sql)) {
                return Promise.resolve([[{ id: 'e-bam', type: 'COUNCIL' }], []]);
            }
            return Promise.resolve([[], []]);
        });
        const res = makeRes();
        await generateAccessCode({ body: { role: 'ENTITY_ADMIN', entityId: 'e-bam' }, user: PLATFORM }, res);

        const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO access_codes/i.test(sql));
        expect(insert[1][2]).toBe('e-bam');
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

describe('contractor verification power', () => {
    test('belongs to MINTP and platform operations, nobody else', () => {
        expect(() => contractorService.assertCanVerify(MINTP_ADMIN)).not.toThrow();
        expect(() => contractorService.assertCanVerify(PLATFORM)).not.toThrow();
        expect(() => contractorService.assertCanVerify(COUNCIL_ADMIN))
            .toThrow('Ministry of Public Works');
        expect(() => contractorService.assertCanVerify({ role: 'CONTRACTOR' })).toThrow();
    });

    test('a rejection must state its reason', async () => {
        pool.query.mockResolvedValue([[{ user_id: 'con9' }], []]);
        await expect(contractorService.decide({
            actor: MINTP_ADMIN, userId: 'con9', decision: 'REJECTED', reason: '  ',
        })).rejects.toThrow('must state its reason');
    });

    test('a decision records who made it', async () => {
        pool.query.mockResolvedValue([[{ user_id: 'con9' }], []]);
        await contractorService.decide({
            actor: MINTP_ADMIN, userId: 'con9', decision: 'VERIFIED',
        });
        const update = pool.query.mock.calls.find(([sql]) => /UPDATE contractor_profiles/i.test(sql));
        expect(update[1]).toEqual(['VERIFIED', 'ent1', null, 'con9']);
    });

    test('identity edits after verification reopen the review', async () => {
        pool.query.mockImplementation((sql) => {
            if (/SELECT status FROM contractor_profiles/i.test(sql)) {
                return Promise.resolve([[{ status: 'VERIFIED' }], []]);
            }
            return Promise.resolve([[], []]);
        });
        await contractorService.saveProfile('con9', { companyName: 'New Name SARL' });
        const update = pool.query.mock.calls.find(([sql]) => /UPDATE contractor_profiles/i.test(sql));
        expect(update[0]).toContain("status = 'PENDING'");
    });
});

describe('entity administrators and projects', () => {
    const BAM_PROJECT = { id: 'p-bam', title: 'Market', owner_entity_id: 'e-bam', contractor_id: 'con1' };
    const MINTP_PROJECT = { id: 'p-road', title: 'Road', owner_entity_id: 'e-mintp', contractor_id: 'con1' };

    test('may manage their own institution\'s projects and no others', () => {
        expect(() => projectService.assertCanEditProject(COUNCIL_ADMIN, BAM_PROJECT)).not.toThrow();
        expect(() => projectService.assertCanEditProject(COUNCIL_ADMIN, MINTP_PROJECT))
            .toThrow('owned by your institution');
    });

    test('legacy unowned projects stay out of entity hands', () => {
        expect(() => projectService.assertCanEditProject(COUNCIL_ADMIN, { owner_entity_id: null }))
            .toThrow('owned by your institution');
    });

    test('whatever the request says, their new project belongs to their institution', async () => {
        pool.query.mockImplementation((sql, params = []) => {
            if (/FROM users u\s+LEFT JOIN contractor_profiles/i.test(sql)) {
                return Promise.resolve([[{ id: 'con1', role: 'CONTRACTOR', status: 'VERIFIED' }], []]);
            }
            if (/SELECT id, type, code FROM gov_entities WHERE id = \?/i.test(sql)) {
                return Promise.resolve([[{ id: params[0], type: 'COUNCIL', code: 'NW-BAMENDA-I' }], []]);
            }
            if (/SELECT p\.\*, u\.name AS contractorName/i.test(sql)) {
                return Promise.resolve([[BAM_PROJECT], []]);
            }
            return Promise.resolve([[], []]);
        });

        await projectService.createProject({
            actor: COUNCIL_ADMIN,
            body: {
                title: 'X', description: 'Y', location: 'Bamenda', region: 'North West',
                ownerEntityId: 'e-mintp', // ignored: the actor's institution wins
            },
            files: [],
        });

        const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO projects/i.test(sql));
        expect(insert[1][10]).toBe('e-bam');
    });

    test('an unverified contractor cannot be put in charge of public works', async () => {
        pool.query.mockImplementation((sql) => {
            if (/FROM users u\s+LEFT JOIN contractor_profiles/i.test(sql)) {
                return Promise.resolve([[{ id: 'con2', role: 'CONTRACTOR', status: 'PENDING' }], []]);
            }
            return Promise.resolve([[], []]);
        });

        await expect(projectService.createProject({
            actor: PLATFORM,
            body: { title: 'X', description: 'Y', location: 'B', region: 'North West', contractorId: 'con2' },
            files: [],
        })).rejects.toThrow('not been verified by the Ministry of Public Works');
    });
});
