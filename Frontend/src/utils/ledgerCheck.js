/**
 * INDEPENDENT LEDGER CHECK, IN THE BROWSER
 *
 * The server can verify its own ledger, but a citizen should not have to take
 * the server's word for it. This module downloads every entry and recomputes
 * the chain here, with the browser's own SHA-256, from nothing but public data
 * and a public constant. It mirrors Backend/services/ledgerService.js:
 *
 *   genesis    = sha256('BUILDRIGHT-LEDGER-GENESIS')
 *   entry_hash = sha256(`${seq}|${prev_hash}|${details_json}`)
 *
 * What it proves: the entries form an unbroken chain from genesis to the
 * published head, no entry was edited, inserted or removed, and the queryable
 * columns agree with the hashed payload.
 *
 * What it cannot prove: the signatures. Those are keyed HMACs and the key must
 * stay secret, so only the server's own check covers them. A server that
 * rebuilt the whole chain would pass this check but change the head, which is
 * why the page tells people to write the head down.
 */

const encoder = new TextEncoder();

export const sha256Hex = async (text) => {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(text));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

export const genesisHash = () => sha256Hex('BUILDRIGHT-LEDGER-GENESIS');

const PAGE_SIZE = 100; // the server's maximum

/**
 * Pages backwards from the head to entry 1.
 * fetchPage(limit, before) resolves to entries newest first, as the API returns them.
 */
export const fetchAllEntries = async (fetchPage, headSeq) => {
    const all = [];
    let before = headSeq + 1;
    while (before > 1) {
        const page = await fetchPage(PAGE_SIZE, before);
        if (!page.length) break;
        all.push(...page);
        before = Math.min(...page.map((e) => Number(e.seq)));
    }
    return all.sort((a, b) => Number(a.seq) - Number(b.seq));
};

/**
 * Recomputes the chain. Returns { ok, entries, headSeq, headHash } or
 * { ok: false, brokenAtSeq, problem }, where problem is a stable code the page
 * translates.
 */
export const checkChain = async (entries, head) => {
    let prevHash = await genesisHash();
    let expectedSeq = 1;

    for (const entry of entries) {
        const seq = Number(entry.seq);
        const fail = (problem) => ({ ok: false, entries: entries.length, brokenAtSeq: seq, problem });

        if (seq !== expectedSeq) return fail('gap');
        if (entry.prevHash !== prevHash) return fail('link');
        if (await sha256Hex(`${seq}|${entry.prevHash}|${entry.detailsJson}`) !== entry.entryHash) return fail('hash');

        let payload;
        try { payload = JSON.parse(entry.detailsJson); } catch { return fail('payload'); }
        const amount = entry.amountXaf === null || entry.amountXaf === undefined ? null : Number(entry.amountXaf);
        if (payload.type !== entry.entryType || payload.refTable !== entry.refTable
            || payload.refId !== entry.refId || payload.amountXaf !== amount
            || (payload.actorEntityId ?? null) !== (entry.actorEntityId ?? null)) {
            return fail('columns');
        }

        prevHash = entry.entryHash;
        expectedSeq = seq + 1;
    }

    const headSeq = expectedSeq - 1;
    if (head && (Number(head.seq) !== headSeq || (headSeq > 0 && head.entryHash !== prevHash))) {
        return { ok: false, entries: entries.length, brokenAtSeq: Number(head.seq), problem: 'head' };
    }
    return { ok: true, entries: entries.length, headSeq, headHash: prevHash };
};
