/**
 * FINANCIAL LEDGER PROPERTIES
 *
 * The ledger's promise is tamper-evidence. These tests exercise the promise
 * directly: entries chain from a public genesis constant, any edit to a stored
 * entry is detected by verification, a sequence gap is detected, a forged
 * signature is detected, and an entry cannot be written outside a transaction.
 *
 * The database is a stateful in-memory array so the very same service code
 * that runs in production computes and verifies the hashes here.
 */

process.env.JWT_SECRET = 'test-secret';
process.env.LEDGER_HMAC_KEY = 'test-ledger-key';

import { jest } from '@jest/globals';

const rows = [];

const mockPool = {
    query: jest.fn((sql, params) => {
        if (/ORDER BY seq DESC LIMIT 1/i.test(sql)) {
            const last = rows[rows.length - 1];
            return Promise.resolve([last ? [last] : [], []]);
        }
        if (/INSERT INTO ledger_entries/i.test(sql)) {
            const [seq, occurred_at, entry_type, ref_table, ref_id, actor_user_id, actor_entity_id, amount_xaf, details_json, prev_hash, entry_hash, signature] = params;
            rows.push({ seq, occurred_at, entry_type, ref_table, ref_id, actor_user_id, actor_entity_id, amount_xaf, details_json, prev_hash, entry_hash, signature });
            return Promise.resolve([{ affectedRows: 1 }, []]);
        }
        if (/SELECT \* FROM ledger_entries ORDER BY seq ASC/i.test(sql)) {
            return Promise.resolve([rows.map((r) => ({ ...r })), []]);
        }
        return Promise.resolve([[], []]);
    }),
};

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: (work) => work(mockPool),
}));

const ledger = await import('../services/ledgerService.js');

const ACTOR = { id: 'ent1', entity_id: 'e-minfi' };

const append = (overrides = {}) =>
    ledger.appendEntry(mockPool, {
        entryType: 'allocation.created',
        refTable: 'allocations',
        refId: 'a1',
        actor: ACTOR,
        amountXaf: 500,
        data: { fiscalYear: 2026 },
        ...overrides,
    });

beforeEach(() => {
    rows.length = 0;
});

describe('the chain', () => {
    it('starts from the public genesis constant', async () => {
        const first = await append();
        expect(first.seq).toBe(1);
        expect(rows[0].prev_hash).toBe(ledger.GENESIS_HASH);
    });

    it('links every entry to the hash of the one before it', async () => {
        await append();
        await append({ refId: 'a2' });
        await append({ refId: 'a3' });
        expect(rows[1].prev_hash).toBe(rows[0].entry_hash);
        expect(rows[2].prev_hash).toBe(rows[1].entry_hash);
        expect(await ledger.verifyChain()).toMatchObject({ ok: true, entries: 3, headSeq: 3 });
    });

    it('refuses to write outside a transaction', async () => {
        await expect(ledger.appendEntry(null, {})).rejects.toThrow(/requires the transaction/);
    });
});

describe('verification detects', () => {
    it('an edited payload', async () => {
        await append();
        await append({ refId: 'a2' });
        rows[0].details_json = rows[0].details_json.replace('500', '400');
        expect(await ledger.verifyChain()).toMatchObject({ ok: false, brokenAtSeq: 1, problem: expect.stringMatching(/hash/) });
    });

    it('a removed entry (sequence gap)', async () => {
        await append();
        await append({ refId: 'a2' });
        await append({ refId: 'a3' });
        rows.splice(1, 1);
        expect(await ledger.verifyChain()).toMatchObject({ ok: false, brokenAtSeq: 3 });
    });

    it('a rebuilt chain signed without the real key', async () => {
        await append();
        // An attacker with database access recomputes a consistent hash chain
        // for an altered amount, but cannot produce the HMAC without the key.
        const payload = JSON.parse(rows[0].details_json);
        payload.amountXaf = 5;
        const forgedJson = JSON.stringify(payload);
        rows[0].details_json = forgedJson;
        rows[0].amount_xaf = 5;
        rows[0].entry_hash = ledger.hashEntry(1, rows[0].prev_hash, forgedJson);
        rows[0].signature = 'f'.repeat(64);
        expect(await ledger.verifyChain()).toMatchObject({ ok: false, brokenAtSeq: 1, problem: expect.stringMatching(/signature/) });
    });

    it('queryable columns quietly diverging from the signed payload', async () => {
        await append();
        rows[0].entry_type = 'income.recorded';
        expect(await ledger.verifyChain()).toMatchObject({ ok: false, brokenAtSeq: 1, problem: expect.stringMatching(/diverge/) });
    });
});
