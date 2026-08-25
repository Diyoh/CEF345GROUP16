/**
 * ACCESS CODE REGRESSION TESTS
 *
 * Access codes are the entire authorization boundary: possessing one grants a role,
 * including ADMIN. These tests guard the properties that make guessing infeasible.
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../config/db.js', () => ({
    default: { query: jest.fn() }
}));

const { generateAccessCode } = await import('../controllers/adminController.js');
const pool = (await import('../config/db.js')).default;

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const ADMIN = { id: 'adm1', name: 'Admin', role: 'ADMIN' };

beforeEach(() => {
    jest.clearAllMocks();
    // Uniqueness probe finds nothing; the INSERT resolves.
    pool.query.mockResolvedValue([[], []]);
});

const generate = async (role = 'CONTRACTOR') => {
    const res = makeRes();
    await generateAccessCode({ body: { role }, user: ADMIN }, res);
    return res;
};

describe('generateAccessCode', () => {
    test('rejects a missing role instead of throwing a 500', async () => {
        const res = makeRes();
        await generateAccessCode({ body: {}, user: ADMIN }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        // The old code did role.substring(0,5) on undefined -> TypeError -> 500.
        expect(res.status).not.toHaveBeenCalledWith(500);
    });

    test('rejects a role outside the enum', async () => {
        const res = makeRes();
        await generateAccessCode({ body: { role: 'SUPERUSER' }, user: ADMIN }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const writes = pool.query.mock.calls.filter(([sql]) => /INSERT/i.test(sql));
        expect(writes).toHaveLength(0);
    });

    test('does not leak the granted role in the code', async () => {
        const res = await generate('PLATFORM_ADMIN');
        const { code } = res.json.mock.calls[0][0].data;

        // The old format was `ADMIN-XXXXXX`, telling an attacker which codes were worth guessing.
        expect(code).not.toMatch(/ADMIN/i);
        expect(code).not.toMatch(/CONTR/i);
        expect(code).not.toMatch(/DEVEL/i);
    });

    test('uses an unambiguous alphabet and a long enough code', async () => {
        const res = await generate();
        const { code } = res.json.mock.calls[0][0].data;

        expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
        // No 0/O or 1/I/L: these are transcribed by hand and typed on a phone.
        expect(code).not.toMatch(/[01OIL]/);
    });

    test('generates distinct codes across many calls', async () => {
        const seen = new Set();
        for (let i = 0; i < 200; i++) {
            const res = await generate();
            seen.add(res.json.mock.calls[0][0].data.code);
        }
        // Math.random collisions and predictability were the original defect.
        expect(seen.size).toBe(200);
    });

    test('persists the code with the requesting user as issuer', async () => {
        const res = await generate('CONTRACTOR');
        const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO access_codes/i.test(sql));

        expect(insert).toBeDefined();
        // Params: code, role, entity_id, generated_by_user_id.
        expect(insert[1][1]).toBe('CONTRACTOR');
        expect(insert[1][2]).toBeNull();
        expect(insert[1][3]).toBe('adm1');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('retries when a generated code already exists', async () => {
        let call = 0;
        pool.query.mockImplementation((sql) => {
            if (/SELECT code FROM access_codes/i.test(sql)) {
                call += 1;
                return Promise.resolve([call === 1 ? [{ code: 'TAKEN' }] : [], []]);
            }
            return Promise.resolve([[], []]);
        });

        const res = await generate();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(call).toBeGreaterThan(1);
    });
});
