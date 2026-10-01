import { describe, test, expect } from 'vitest';
import { sha256Hex, genesisHash, checkChain, fetchAllEntries } from '../utils/ledgerCheck';

/** Builds a valid chain the same way the backend does. */
const buildChain = async (count) => {
    const entries = [];
    let prev = await genesisHash();
    for (let seq = 1; seq <= count; seq += 1) {
        const payload = { at: '2026-01-01T00:00:00.000Z', type: 'allocation.created', refTable: 'allocations', refId: `a${seq}`, actorUserId: 'u1', actorEntityId: null, amountXaf: seq * 1000, data: {} };
        const detailsJson = JSON.stringify(payload);
        const entryHash = await sha256Hex(`${seq}|${prev}|${detailsJson}`);
        entries.push({ seq, prevHash: prev, entryHash, detailsJson, entryType: payload.type, refTable: payload.refTable, refId: payload.refId, amountXaf: payload.amountXaf });
        prev = entryHash;
    }
    return entries;
};

const headOf = (entries) => ({ seq: entries.length, entryHash: entries[entries.length - 1].entryHash });

describe('ledger check in the browser', () => {
    test('genesis matches the backend constant', async () => {
        // GENESIS_HASH from Backend/services/ledgerService.js
        expect(await genesisHash()).toBe('951fb8039147831bdbb46cf74c00ab58aaaebb455df37c8ddc58368c6d2e33e4');
        expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    });

    test('an intact chain passes and reports its head', async () => {
        const chain = await buildChain(5);
        expect(await checkChain(chain, headOf(chain))).toMatchObject({ ok: true, entries: 5, headSeq: 5 });
    });

    test('an edited amount inside the payload breaks the hash', async () => {
        const chain = await buildChain(4);
        chain[2].detailsJson = chain[2].detailsJson.replace('"amountXaf":3000', '"amountXaf":3');
        chain[2].amountXaf = 3;
        expect(await checkChain(chain, headOf(chain))).toMatchObject({ ok: false, brokenAtSeq: 3, problem: 'hash' });
    });

    test('a column that disagrees with the payload is caught', async () => {
        const chain = await buildChain(3);
        chain[1].amountXaf = 999;
        expect(await checkChain(chain, headOf(chain))).toMatchObject({ ok: false, brokenAtSeq: 2, problem: 'columns' });
    });

    test('a removed entry is a gap', async () => {
        const chain = await buildChain(4);
        chain.splice(1, 1);
        expect(await checkChain(chain, headOf(chain))).toMatchObject({ ok: false, brokenAtSeq: 3, problem: 'gap' });
    });

    test('a head that does not match the chain is reported', async () => {
        const chain = await buildChain(3);
        expect(await checkChain(chain, { seq: 3, entryHash: 'f'.repeat(64) })).toMatchObject({ ok: false, problem: 'head' });
    });

    test('fetchAllEntries pages back to entry 1 and returns them in order', async () => {
        const chain = await buildChain(250);
        const calls = [];
        const fetchPage = async (limit, before) => {
            calls.push(before);
            return chain.filter((e) => e.seq < before).reverse().slice(0, limit);
        };
        const all = await fetchAllEntries(fetchPage, 250);
        expect(all.map((e) => e.seq)).toEqual(chain.map((e) => e.seq));
        expect(calls).toEqual([251, 151, 51]);
    });
});
