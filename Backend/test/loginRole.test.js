/**
 * DECLARED ROLE AT LOGIN
 *
 * The login form asks who you are and the server checks the answer. Rules:
 *   - a declared role that does not match the account is refused even with
 *     correct credentials, and only AFTER the password check, so the message
 *     cannot be used to probe accounts without knowing the password
 *   - a matching declaration signs in
 *   - an omitted role still signs in (mobile clients and older callers)
 *   - an unknown role string is a 400, not a silent pass
 */

process.env.JWT_SECRET = 'test-secret';

import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

const PASSWORD_HASH = bcrypt.hashSync('password', 4);

const mockPool = { query: jest.fn() };
jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: (work) => work(mockPool),
}));

const { login } = await import('../controllers/authController.js');

const CONTRACTOR_ROW = {
    id: 'u2',
    name: 'BTP Cameroun S.A.',
    email: 'contact@btpcameroun.cm',
    role: 'CONTRACTOR',
    password_hash: PASSWORD_HASH,
};

const makeRes = () => {
    const res = { statusCode: 200, body: null, cookies: [] };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    res.cookie = (...args) => { res.cookies.push(args); return res; };
    return res;
};

beforeEach(() => {
    mockPool.query.mockReset();
    mockPool.query.mockResolvedValue([[CONTRACTOR_ROW], []]);
});

describe('login role declaration', () => {
    it('refuses a mismatched role even with correct credentials', async () => {
        const res = makeRes();
        await login({ body: { email: CONTRACTOR_ROW.email, password: 'password', role: 'PLATFORM_ADMIN' } }, res);
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/not registered under the role/);
        expect(res.cookies).toHaveLength(0); // no session was created
    });

    it('checks the password BEFORE the role, so the mismatch message needs credentials', async () => {
        const res = makeRes();
        await login({ body: { email: CONTRACTOR_ROW.email, password: 'wrong', role: 'PLATFORM_ADMIN' } }, res);
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
    });

    it('signs in when the declaration matches', async () => {
        const res = makeRes();
        await login({ body: { email: CONTRACTOR_ROW.email, password: 'password', role: 'CONTRACTOR' } }, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.cookies.length).toBeGreaterThan(0);
    });

    it('still signs in with no role declared, for mobile and older clients', async () => {
        const res = makeRes();
        await login({ body: { email: CONTRACTOR_ROW.email, password: 'password' } }, res);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('rejects an unknown role string outright', async () => {
        const res = makeRes();
        await login({ body: { email: CONTRACTOR_ROW.email, password: 'password', role: 'SUPERUSER' } }, res);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Unknown role');
    });
});
