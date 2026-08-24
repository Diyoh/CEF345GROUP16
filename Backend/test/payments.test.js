/**
 * PROJECT PAYMENT RULES (phase G4)
 *
 * The last hop of the money. Invariants:
 *   - only the owning institution pays, only its own project, only a VERIFIED contractor
 *   - only the paid contractor affirms, exactly once, any amount including less
 *   - affirmation derives the project's spent figure and logs the change in
 *     project_changes, in the same transaction as the ledger entry
 */

process.env.JWT_SECRET = 'test-secret';
process.env.LEDGER_HMAC_KEY = 'test-ledger-key';

import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

const PASSWORD_HASH = bcrypt.hashSync('password', 4);
const PCN_HASH = bcrypt.hashSync('AB23CD45EF67', 4);
const GOOD_2FA = { password: 'password', pcn: 'AB23-CD45-EF67' };

const COUNCIL = { id: 'ent3', name: 'Bamenda I Desk', role: 'ENTITY_ADMIN', entity_id: 'e-bam1', entity_code: 'NW-BAMENDA-I' };
const CONTRACTOR = { id: 'u2', name: 'BTP Cameroun S.A.', role: 'CONTRACTOR' };

const db = {
    projectRow: { id: 'p1', title: 'Market Rehab', owner_entity_id: 'e-bam1', contractor_id: 'u2', contractor_status: 'VERIFIED' },
    paymentRow: null,
    projectSpent: 0,
    affirmedSum: 0,
    writes: [],
};

const route = (sql, params) => {
    if (/SELECT password_hash, pcn_hash FROM users/i.test(sql)) return [[{ password_hash: PASSWORD_HASH, pcn_hash: PCN_HASH }]];
    if (/FROM projects p\s+LEFT JOIN contractor_profiles/i.test(sql)) return [db.projectRow ? [db.projectRow] : []];
    if (/FROM project_payments WHERE id = \? FOR UPDATE/i.test(sql)) return [db.paymentRow ? [db.paymentRow] : []];
    if (/SELECT spent FROM projects WHERE id = \? FOR UPDATE/i.test(sql)) return [[{ spent: db.projectSpent }]];
    if (/SUM\(amount_affirmed_xaf\), 0\) AS affirmed/i.test(sql)) return [[{ affirmed: db.affirmedSum }]];
    if (/ORDER BY seq DESC LIMIT 1/i.test(sql)) return [[]];
    if (/^INSERT|^UPDATE/i.test(sql.trim())) {
        db.writes.push({ sql: sql.trim().replace(/\s+/g, ' '), params });
        return [{ affectedRows: 1 }];
    }
    return [[]];
};

const mockPool = { query: jest.fn((sql, params) => Promise.resolve([...route(sql, params), []])) };

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: async (work) => work(mockPool),
}));

const finance = await import('../services/financeService.js');

beforeEach(() => {
    db.projectRow = { id: 'p1', title: 'Market Rehab', owner_entity_id: 'e-bam1', contractor_id: 'u2', contractor_status: 'VERIFIED' };
    db.paymentRow = null;
    db.projectSpent = 0;
    db.affirmedSum = 0;
    db.writes.length = 0;
});

describe('initiating a payment', () => {
    const input = { projectId: 'p1', amountXaf: 60000000, note: 'First tranche', ...GOOD_2FA };

    it('lets the owning institution pay its verified contractor', async () => {
        const out = await finance.initiatePayment({ actor: COUNCIL, ...input });
        expect(out.amountXaf).toBe(60000000);
        expect(out.ledgerSeq).toBe(1);
        const tables = db.writes.map((w) => w.sql.split(' ')[2]);
        expect(tables).toEqual(['project_payments', 'ledger_entries']);
    });

    it('refuses a project owned by another institution', async () => {
        db.projectRow.owner_entity_id = 'e-other';
        await expect(finance.initiatePayment({ actor: COUNCIL, ...input }))
            .rejects.toThrow(/owned by your institution/);
    });

    it('refuses a project with no contractor', async () => {
        db.projectRow.contractor_id = null;
        await expect(finance.initiatePayment({ actor: COUNCIL, ...input }))
            .rejects.toThrow(/no assigned contractor/);
    });

    it('refuses an unverified contractor even on an owned project', async () => {
        db.projectRow.contractor_status = 'PENDING';
        await expect(finance.initiatePayment({ actor: COUNCIL, ...input }))
            .rejects.toThrow(/not been verified/);
    });
});

describe('affirming a payment', () => {
    beforeEach(() => {
        db.paymentRow = { id: 'pay1', project_id: 'p1', contractor_id: 'u2', amount_xaf: 60000000, affirmed_at: null };
    });

    it('belongs to the paid contractor alone', async () => {
        db.paymentRow.contractor_id = 'u3';
        await expect(finance.affirmPayment({ actor: CONTRACTOR, paymentId: 'pay1', amountAffirmedXaf: 60000000, ...GOOD_2FA }))
            .rejects.toThrow(/paid contractor/);
    });

    it('refuses every non-contractor role, entity admins included', async () => {
        await expect(finance.affirmPayment({ actor: COUNCIL, paymentId: 'pay1', amountAffirmedXaf: 60000000, ...GOOD_2FA }))
            .rejects.toThrow(/paid contractor/);
    });

    it('happens exactly once', async () => {
        db.paymentRow.affirmed_at = '2026-08-01';
        await expect(finance.affirmPayment({ actor: CONTRACTOR, paymentId: 'pay1', amountAffirmedXaf: 60000000, ...GOOD_2FA }))
            .rejects.toThrow(/already been affirmed/);
    });

    it('publishes the gap and derives spent from affirmed payments', async () => {
        db.projectSpent = 0;
        db.affirmedSum = 45000000; // sum AFTER this affirmation, as the DB would return
        const out = await finance.affirmPayment({ actor: CONTRACTOR, paymentId: 'pay1', amountAffirmedXaf: 45000000, ...GOOD_2FA });

        expect(out.gapXaf).toBe(15000000);
        expect(out.spentXaf).toBe(45000000);

        // spent moved through an UPDATE and its provenance landed in project_changes.
        const spentUpdate = db.writes.find((w) => w.sql.startsWith('UPDATE projects SET spent'));
        expect(spentUpdate.params).toEqual([45000000, 'p1']);
        const audit = db.writes.find((w) => w.sql.includes('INSERT INTO project_changes'));
        expect(audit.params).toContain('spent');
        expect(audit.params).toContain('45000000');
        const ledgerWrite = db.writes.find((w) => w.sql.includes('ledger_entries'));
        expect(ledgerWrite.params.join('|')).toContain('payment.affirmed');
    });

    it('does not write an audit row when spent is unchanged', async () => {
        db.projectSpent = 45000000;
        db.affirmedSum = 45000000;
        await finance.affirmPayment({ actor: CONTRACTOR, paymentId: 'pay1', amountAffirmedXaf: 0, ...GOOD_2FA });
        expect(db.writes.find((w) => w.sql.includes('project_changes'))).toBeUndefined();
    });
});
