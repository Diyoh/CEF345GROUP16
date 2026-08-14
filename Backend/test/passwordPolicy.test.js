/**
 * PASSWORD POLICY REGRESSION
 *
 * The API previously accepted any string on change-password, including a single
 * character. These accounts can alter the public spending record, so the floor has to be
 * enforced server-side where no client can bypass it.
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../config/db.js', () => ({
    default: { query: jest.fn() },
    withTransaction: (work) => work({ query: jest.fn() })
}));

const { changePassword } = await import('../controllers/authController.js');
const pool = (await import('../config/db.js')).default;

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const req = (newPassword) => ({
    body: { currentPassword: 'password', newPassword },
    user: { id: 'con1' }
});

beforeEach(() => jest.clearAllMocks());

describe('changePassword policy', () => {
    test.each([
        ['too short', 'abc'],
        ['exactly one under the floor', '1234567'],
        ['empty', ''],
        ['undefined', undefined],
        ['only spaces', '        ']
    ])('rejects a password that is %s', async (_label, value) => {
        const res = makeRes();
        await changePassword(req(value), res);

        expect(res.status).toHaveBeenCalledWith(400);
        // Rejected before any database work — no hash computed, no row touched.
        const writes = pool.query.mock.calls.filter(([sql]) => /UPDATE users/i.test(sql));
        expect(writes).toHaveLength(0);
    });

    test('a rejection is a 400, never a 500', async () => {
        const res = makeRes();
        await changePassword(req('short'), res);

        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, error: expect.stringContaining('8 characters') })
        );
    });

    test('an acceptable password proceeds to the credential check', async () => {
        // User lookup returns nothing, so the handler stops at "user not found" — which is
        // proof the policy gate let it through rather than short-circuiting.
        pool.query.mockResolvedValue([[], []]);

        const res = makeRes();
        await changePassword(req('a-long-enough-password'), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
