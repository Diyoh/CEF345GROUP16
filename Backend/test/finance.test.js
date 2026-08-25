/**
 * FINANCE RULES
 *
 * Who may move money, what the second factor demands, and which invariants the
 * service holds: MINFI-only allocation, no self-allocation, disbursements
 * capped by the commitment, confirmation belonging to the receiving
 * institution and happening once, and a ledger entry landing in the same
 * transaction as every money row.
 */

process.env.JWT_SECRET = 'test-secret';
process.env.LEDGER_HMAC_KEY = 'test-ledger-key';

import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

const PASSWORD_HASH = bcrypt.hashSync('password', 4);
const PCN_HASH = bcrypt.hashSync('AB23CD45EF67', 4);

const MINFI = { id: 'ent1', role: 'ENTITY_ADMIN', entity_id: 'e-minfi', entity_code: 'MINFI' };
const COUNCIL = { id: 'ent3', role: 'ENTITY_ADMIN', entity_id: 'e-bam1', entity_code: 'NW-BAMENDA-I' };
const PLATFORM = { id: 'adm1', role: 'PLATFORM_ADMIN', entity_id: null };

const GOOD_2FA = { password: 'password', pcn: 'AB23-CD45-EF67' };

/** Scripted database: each test sets the rows the queries should find. */
const db = {
    userRow: { password_hash: PASSWORD_HASH, pcn_hash: PCN_HASH },
    entityRow: { id: 'e-bam1', code: 'NW-BAMENDA-I', type: 'COUNCIL' },
    allocationRow: null,
    disbursementRow: null,
    disbursedSum: 0,
    budgetRow: null,
    inserts: [],
};

const route = (sql, params) => {
    if (/SELECT password_hash, pcn_hash FROM users/i.test(sql)) return [db.userRow ? [db.userRow] : []];
    if (/FROM gov_entities WHERE id = \?/i.test(sql)) return [db.entityRow ? [db.entityRow] : []];
    if (/FROM allocations WHERE id = \? FOR UPDATE/i.test(sql)) return [db.allocationRow ? [db.allocationRow] : []];
    if (/SUM\(amount_xaf\), 0\) AS sent/i.test(sql)) return [[{ sent: db.disbursedSum }]];
    if (/FROM disbursements d JOIN allocations a/i.test(sql)) return [db.disbursementRow ? [db.disbursementRow] : []];
    if (/FROM budgets WHERE entity_id = \? AND fiscal_year = \? FOR UPDATE/i.test(sql)) return [db.budgetRow ? [db.budgetRow] : []];
    if (/ORDER BY seq DESC LIMIT 1/i.test(sql)) return [[]];
    if (/^INSERT|^UPDATE/i.test(sql.trim())) {
        db.inserts.push({ sql: sql.trim(), params });
        return [{ affectedRows: 1 }];
    }
    return [[]];
};

let inTransaction = 0;
const mockPool = { query: jest.fn((sql, params) => Promise.resolve([...route(sql, params), []])) };

jest.unstable_mockModule('../config/db.js', () => ({
    default: mockPool,
    withTransaction: async (work) => {
        inTransaction += 1;
        return work(mockPool);
    },
}));

const finance = await import('../services/financeService.js');

beforeEach(() => {
    db.userRow = { password_hash: PASSWORD_HASH, pcn_hash: PCN_HASH };
    db.entityRow = { id: 'e-bam1', code: 'NW-BAMENDA-I', type: 'COUNCIL' };
    db.allocationRow = null;
    db.disbursementRow = null;
    db.disbursedSum = 0;
    db.budgetRow = null;
    db.inserts.length = 0;
    inTransaction = 0;
});

const ALLOC_INPUT = { toEntityId: 'e-bam1', fiscalYear: 2026, amountXaf: 500000000, purpose: 'Road maintenance', ...GOOD_2FA };

describe('who may move money', () => {
    it('lets a MINFI administrator allocate', async () => {
        const out = await finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT });
        expect(out.amountXaf).toBe(500000000);
        expect(out.ledgerSeq).toBe(1);
    });

    it('refuses every other institution', async () => {
        await expect(finance.createAllocation({ actor: COUNCIL, ...ALLOC_INPUT }))
            .rejects.toThrow(/Ministry of Finance/);
    });

    it('refuses even the platform administrator (separation of duties)', async () => {
        await expect(finance.createAllocation({ actor: PLATFORM, ...ALLOC_INPUT }))
            .rejects.toThrow(/Ministry of Finance/);
    });
});

describe('the second factor', () => {
    it('rejects a wrong PCN without saying which factor failed', async () => {
        await expect(finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT, pcn: 'WRONG-WRONG-WRNG' }))
            .rejects.toThrow(/do not match our records/);
    });

    it('rejects a wrong password with the identical message', async () => {
        await expect(finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT, password: 'nope' }))
            .rejects.toThrow(/do not match our records/);
    });

    it('accepts the PCN with or without its display grouping', async () => {
        const out = await finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT, pcn: 'ab23cd45ef67' });
        expect(out.ledgerSeq).toBe(1);
    });

    it('refuses an account that was never issued a PCN', async () => {
        db.userRow = { password_hash: PASSWORD_HASH, pcn_hash: null };
        await expect(finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT }))
            .rejects.toThrow(/no confirmation number/);
    });
});

describe('allocation invariants', () => {
    it('never lets MINFI allocate to itself', async () => {
        db.entityRow = { id: 'e-minfi', code: 'MINFI', type: 'MINISTRY' };
        await expect(finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT, toEntityId: 'e-minfi' }))
            .rejects.toThrow(/cannot allocate to itself/);
    });

    it('requires a stated purpose and a positive amount', async () => {
        await expect(finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT, purpose: '  ' }))
            .rejects.toThrow(/purpose/);
        await expect(finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT, amountXaf: -5 }))
            .rejects.toThrow(/positive amount/);
    });

    it('writes the money row and its ledger entry in one transaction', async () => {
        await finance.createAllocation({ actor: MINFI, ...ALLOC_INPUT });
        expect(inTransaction).toBe(1);
        const tables = db.inserts.map((q) => q.sql.split(/\s+/)[2]);
        expect(tables).toEqual(['allocations', 'ledger_entries']);
    });
});

describe('disbursement invariants', () => {
    beforeEach(() => {
        db.allocationRow = { id: 'a1', to_entity_id: 'e-bam1', fiscal_year: 2026, amount_xaf: 500000000 };
    });

    it('caps total disbursements at the allocated amount', async () => {
        db.disbursedSum = 400000000;
        await expect(finance.createDisbursement({ actor: MINFI, allocationId: 'a1', amountXaf: 200000000, ...GOOD_2FA }))
            .rejects.toThrow(/exceed the allocated amount/);
    });

    it('records a disbursement within the commitment', async () => {
        db.disbursedSum = 0;
        const out = await finance.createDisbursement({ actor: MINFI, allocationId: 'a1', amountXaf: 300000000, ...GOOD_2FA });
        expect(out.amountXaf).toBe(300000000);
    });
});

describe('confirmation of receipt', () => {
    beforeEach(() => {
        db.disbursementRow = { id: 'd1', amount_xaf: 300000000, amount_confirmed_xaf: null, to_entity_id: 'e-bam1' };
    });

    it('belongs to the receiving institution alone', async () => {
        db.disbursementRow.to_entity_id = 'e-other';
        await expect(finance.confirmDisbursement({ actor: COUNCIL, disbursementId: 'd1', amountConfirmedXaf: 300000000, ...GOOD_2FA }))
            .rejects.toThrow(/receiving institution/);
    });

    it('records the confirmed amount and publishes the gap', async () => {
        const out = await finance.confirmDisbursement({ actor: COUNCIL, disbursementId: 'd1', amountConfirmedXaf: 250000000, ...GOOD_2FA });
        expect(out.gapXaf).toBe(50000000);
    });

    it('happens exactly once', async () => {
        db.disbursementRow.amount_confirmed_xaf = 250000000;
        await expect(finance.confirmDisbursement({ actor: COUNCIL, disbursementId: 'd1', amountConfirmedXaf: 300000000, ...GOOD_2FA }))
            .rejects.toThrow(/already been confirmed/);
    });
});

describe('budgets and income', () => {
    it('logs a budget revision with its old and new figures', async () => {
        db.budgetRow = { id: 'b1', planned_amount: 100 };
        const out = await finance.setBudget({ actor: COUNCIL, fiscalYear: 2026, plannedAmountXaf: 150, ...GOOD_2FA });
        expect(out.revisedFromXaf).toBe(100);
        const ledgerInsert = db.inserts.find((q) => q.sql.includes('ledger_entries'));
        expect(ledgerInsert.params.join('|')).toContain('budget.revised');
    });

    it('requires income to state its source', async () => {
        await expect(finance.recordIncome({ actor: COUNCIL, fiscalYear: 2026, label: ' ', amountXaf: 10, ...GOOD_2FA }))
            .rejects.toThrow(/where it came from/);
    });
});
