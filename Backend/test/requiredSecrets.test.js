/**
 * Production must refuse to boot on missing, placeholder or weak secrets, and
 * the ledger must never sign with the development fallback key in production.
 */

import { findSecretProblems } from '../config/requiredSecrets.js';

const strong = (c) => c.repeat(40);

describe('findSecretProblems', () => {
    test('development requires nothing', () => {
        expect(findSecretProblems({ NODE_ENV: 'development' })).toEqual([]);
        expect(findSecretProblems({})).toEqual([]);
    });

    test('production with distinct strong secrets passes', () => {
        expect(findSecretProblems({
            NODE_ENV: 'production', JWT_SECRET: strong('a'), LEDGER_HMAC_KEY: strong('b'),
        })).toEqual([]);
    });

    test('production flags missing secrets', () => {
        const problems = findSecretProblems({ NODE_ENV: 'production' });
        expect(problems).toContain('JWT_SECRET is not set');
        expect(problems).toContain('LEDGER_HMAC_KEY is not set');
    });

    test('production flags example values and short values', () => {
        const problems = findSecretProblems({
            NODE_ENV: 'production', JWT_SECRET: 'your_super_secret_jwt_key', LEDGER_HMAC_KEY: 'short',
        });
        expect(problems).toContain('JWT_SECRET still holds the example value');
        expect(problems).toContain('LEDGER_HMAC_KEY is shorter than 32 characters');
    });

    test('production flags a ledger key equal to the JWT secret', () => {
        expect(findSecretProblems({
            NODE_ENV: 'production', JWT_SECRET: strong('a'), LEDGER_HMAC_KEY: strong('a'),
        })).toContain('LEDGER_HMAC_KEY must differ from JWT_SECRET');
    });
});

describe('ledger signing key', () => {
    const saved = { ...process.env };
    afterEach(() => { process.env = { ...saved }; });

    test('signEntry refuses the development fallback in production', async () => {
        const { signEntry } = await import('../services/ledgerService.js');
        delete process.env.LEDGER_HMAC_KEY;
        process.env.NODE_ENV = 'production';
        expect(() => signEntry('abc')).toThrow('LEDGER_HMAC_KEY must be set in production');
    });

    test('signEntry falls back outside production', async () => {
        const { signEntry } = await import('../services/ledgerService.js');
        delete process.env.LEDGER_HMAC_KEY;
        process.env.NODE_ENV = 'development';
        expect(signEntry('abc')).toMatch(/^[0-9a-f]{64}$/);
    });
});
