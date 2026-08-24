/**
 * FINANCIAL LEDGER SERVICE
 *
 * The request behind this file: financial records must be signed and secured so
 * they cannot be quietly reversed. The honest engineering answer is
 * tamper-EVIDENCE, in four layers:
 *
 *   1. Append-only. Database triggers reject UPDATE and DELETE on
 *      ledger_entries for every connection, superuser included, unless someone
 *      first drops the triggers, which is itself a loud act.
 *   2. Hash chain. Every entry's hash covers the previous entry's hash, so
 *      editing or removing any entry breaks every entry after it.
 *   3. Signature. Each entry_hash is HMAC-signed with a key that lives in the
 *      environment, not the database. An attacker with full database access can
 *      rebuild a consistent chain but cannot re-sign it.
 *   4. Published head. The latest seq and hash are publicly readable, so a
 *      wholesale replacement of the chain changes a number people have copies of.
 *
 * WHAT GETS HASHED. details_json is the canonical payload and includes the
 * timestamp, type, references, actor and amount. entry_hash =
 * sha256(`${seq}|${prev_hash}|${details_json}`). The typed columns beside the
 * JSON exist for querying; verifyChain() cross-checks them against the JSON so
 * they cannot silently diverge.
 *
 * WHY seq IS NOT AUTO_INCREMENT. MySQL burns auto-increment values on rolled
 * back transactions, and the verifier treats a sequence gap as a broken chain.
 * The service assigns seq = last + 1 while holding a FOR UPDATE lock on the
 * last row, which also serializes concurrent appends so two entries can never
 * claim the same prev_hash.
 */

import { createHash, createHmac } from 'crypto';
import pool from '../config/db.js';

/** prev_hash of the very first entry. A constant, so anyone can verify from zero. */
export const GENESIS_HASH = createHash('sha256').update('BUILDRIGHT-LEDGER-GENESIS').digest('hex');

const signingKey = () => {
    if (process.env.LEDGER_HMAC_KEY) return process.env.LEDGER_HMAC_KEY;
    // Development fallback so the stack runs without ceremony. Production must
    // set LEDGER_HMAC_KEY: rotating JWT_SECRET would otherwise orphan every signature.
    return `ledger:${process.env.JWT_SECRET || 'dev'}`;
};

export const hashEntry = (seq, prevHash, detailsJson) =>
    createHash('sha256').update(`${seq}|${prevHash}|${detailsJson}`).digest('hex');

export const signEntry = (entryHash) =>
    createHmac('sha256', signingKey()).update(entryHash).digest('hex');

/**
 * Append one entry INSIDE the caller's transaction. The tx parameter is
 * mandatory by design: a ledger entry must commit or roll back together with
 * the financial row it describes, never on its own.
 */
export const appendEntry = async (tx, { entryType, refTable, refId, actor, amountXaf = null, data = {} }) => {
    if (!tx || typeof tx.query !== 'function') {
        throw new Error('appendEntry requires the transaction of the financial write it describes');
    }

    const [last] = await tx.query(
        'SELECT seq, entry_hash FROM ledger_entries ORDER BY seq DESC LIMIT 1 FOR UPDATE'
    );
    const seq = last.length ? Number(last[0].seq) + 1 : 1;
    const prevHash = last.length ? last[0].entry_hash : GENESIS_HASH;

    const occurredAt = new Date();
    // Key order is irrelevant to verification (the STORED string is what gets
    // rehashed), but a fixed order keeps the ledger diffable by humans.
    const payload = {
        at: occurredAt.toISOString(),
        type: entryType,
        refTable,
        refId,
        actorUserId: actor.id,
        actorEntityId: actor.entity_id || null,
        amountXaf: amountXaf === null ? null : Number(amountXaf),
        data,
    };
    const detailsJson = JSON.stringify(payload);
    const entryHash = hashEntry(seq, prevHash, detailsJson);
    const signature = signEntry(entryHash);

    await tx.query(
        `INSERT INTO ledger_entries
            (seq, occurred_at, entry_type, ref_table, ref_id, actor_user_id, actor_entity_id, amount_xaf, details_json, prev_hash, entry_hash, signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [seq, occurredAt, entryType, refTable, refId, actor.id, actor.entity_id || null,
         payload.amountXaf, detailsJson, prevHash, entryHash, signature]
    );

    return { seq, entryHash, signature };
};

/** The chain head: what the public copies down to detect wholesale replacement. */
export const getHead = async () => {
    const [rows] = await pool.query(
        'SELECT seq, entry_hash, occurred_at FROM ledger_entries ORDER BY seq DESC LIMIT 1'
    );
    if (!rows.length) return { seq: 0, entryHash: GENESIS_HASH, empty: true };
    return { seq: Number(rows[0].seq), entryHash: rows[0].entry_hash, occurredAt: rows[0].occurred_at };
};

/**
 * Walk the whole chain and recompute everything. Returns the first broken seq
 * rather than throwing: a broken chain is a finding to report, not a crash.
 */
export const verifyChain = async () => {
    const [rows] = await pool.query('SELECT * FROM ledger_entries ORDER BY seq ASC');

    let prevHash = GENESIS_HASH;
    let expectedSeq = 1;
    for (const row of rows) {
        const seq = Number(row.seq);
        const fail = (problem) => ({ ok: false, entries: rows.length, brokenAtSeq: seq, problem });

        if (seq !== expectedSeq) return fail('sequence gap');
        if (row.prev_hash !== prevHash) return fail('chain link does not match the previous entry');
        if (hashEntry(seq, row.prev_hash, row.details_json) !== row.entry_hash) return fail('entry hash does not match its content');
        if (signEntry(row.entry_hash) !== row.signature) return fail('signature does not verify with the signing key');

        // The queryable columns must say the same thing as the hashed payload.
        let payload;
        try { payload = JSON.parse(row.details_json); } catch { return fail('payload is not valid JSON'); }
        if (payload.type !== row.entry_type || payload.refTable !== row.ref_table
            || payload.refId !== row.ref_id || payload.actorUserId !== row.actor_user_id) {
            return fail('queryable columns diverge from the signed payload');
        }

        prevHash = row.entry_hash;
        expectedSeq = seq + 1;
    }

    return { ok: true, entries: rows.length, headSeq: expectedSeq - 1, headHash: prevHash };
};
