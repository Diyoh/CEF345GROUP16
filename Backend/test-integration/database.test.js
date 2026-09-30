/**
 * INTEGRATION TESTS AGAINST A REAL MYSQL
 *
 * The unit tests mock the database, so they cannot see the guarantees that live
 * in MySQL itself: the append-only triggers, the transactions that tie a money
 * row to its ledger entry, and the schema the migrations produce. These tests
 * run the real services against a database built the way every environment
 * builds one: db:init, migrate, seed:entities, seed.
 *
 * Run with `npm run test:integration` and DB_* pointing at a disposable database.
 * The tests add rows (allocations, disbursements, ledger entries) and never
 * delete them, because the ledger cannot be deleted from. Never point them at
 * a database you care about.
 */

process.env.LEDGER_HMAC_KEY = process.env.LEDGER_HMAC_KEY || 'integration-ledger-key';

const { default: pool } = await import('../config/db.js');
const ledger = await import('../services/ledgerService.js');
const finance = await import('../services/financeService.js');

// Seeded demo credentials (see README, "Demo accounts").
const PASSWORD = 'password';
const PCN = 'AB23-CD45-EF67';

/** Loads an actor exactly as authMiddleware.protect builds req.user. */
const actorByEmail = async (email) => {
    const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.entity_id,
                e.code AS entity_code, e.type AS entity_type
         FROM users u LEFT JOIN gov_entities e ON u.entity_id = e.id
         WHERE u.email = ?`,
        [email]
    );
    if (!rows[0]) throw new Error(`Seeded user ${email} is missing: run the seed scripts first`);
    return rows[0];
};

const ledgerCount = async () => {
    const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM ledger_entries');
    return Number(row.n);
};

let minfi;
let council;

beforeAll(async () => {
    minfi = await actorByEmail('finance@minfi.cm');
    council = await actorByEmail('council@bamenda1.cm');
});

afterAll(async () => {
    await pool.end();
});

describe('schema', () => {
    test('every migration file is recorded as applied', async () => {
        const { readdirSync } = await import('fs');
        const files = readdirSync(new URL('../../Database/migrations/', import.meta.url))
            .filter((f) => /^\d{3}_.*\.sql$/.test(f));
        const [rows] = await pool.query('SELECT filename FROM schema_migrations');
        const applied = new Set(rows.map((r) => r.filename));
        expect(files.filter((f) => !applied.has(f))).toEqual([]);
    });
});

describe('append-only audit tables', () => {
    test.each([
        ['UPDATE ledger_entries SET amount_xaf = 1 WHERE seq = 1', /append-only|cannot/i],
        ['DELETE FROM ledger_entries WHERE seq = 1', /append-only|cannot/i],
        ['UPDATE project_changes SET field = field', /append-only|cannot/i],
        ['DELETE FROM project_changes', /append-only|cannot/i],
    ])('rejects: %s', async (sql, message) => {
        if (/project_changes/.test(sql)) {
            const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM project_changes');
            // The triggers fire per row, so an empty table cannot prove anything.
            if (Number(row.n) === 0) {
                await pool.query(
                    `INSERT INTO project_changes (id, project_id, actor_name, actor_role, field, old_value, new_value)
                     SELECT UUID(), id, 'integration test', 'SYSTEM', 'status', NULL, status FROM projects LIMIT 1`
                );
            }
        }
        await expect(pool.query(sql)).rejects.toThrow(message);
    });
});

describe('financial ledger', () => {
    test('the seeded chain verifies', async () => {
        const result = await ledger.verifyChain();
        expect(result).toMatchObject({ ok: true });
        expect(result.entries).toBeGreaterThan(0);
    });

    test('allocate, send and confirm: each step is one ledger entry and the gap is published', async () => {
        const before = await ledgerCount();

        const allocation = await finance.createAllocation({
            actor: minfi, toEntityId: council.entity_id, fiscalYear: new Date().getFullYear(),
            amountXaf: 1000000, purpose: 'Integration test allocation', password: PASSWORD, pcn: PCN,
        });
        const sent = await finance.createDisbursement({
            actor: minfi, allocationId: allocation.id, amountXaf: 600000, password: PASSWORD, pcn: PCN,
        });
        const confirmed = await finance.confirmDisbursement({
            actor: council, disbursementId: sent.id, amountConfirmedXaf: 550000, password: PASSWORD, pcn: PCN,
        });

        expect(confirmed).toMatchObject({ sentXaf: 600000, confirmedXaf: 550000, gapXaf: 50000 });
        expect(await ledgerCount()).toBe(before + 3);
        expect(sent.ledgerSeq).toBe(allocation.ledgerSeq + 1);
        expect(confirmed.ledgerSeq).toBe(sent.ledgerSeq + 1);
        expect(await ledger.verifyChain()).toMatchObject({ ok: true });
    });

    test('a refused disbursement leaves neither a money row nor a ledger entry', async () => {
        const allocation = await finance.createAllocation({
            actor: minfi, toEntityId: council.entity_id, fiscalYear: new Date().getFullYear(),
            amountXaf: 100000, purpose: 'Integration test overspend', password: PASSWORD, pcn: PCN,
        });
        const before = await ledgerCount();

        await expect(finance.createDisbursement({
            actor: minfi, allocationId: allocation.id, amountXaf: 100001, password: PASSWORD, pcn: PCN,
        })).rejects.toThrow('exceed the allocated amount');

        const [rows] = await pool.query('SELECT id FROM disbursements WHERE allocation_id = ?', [allocation.id]);
        expect(rows).toEqual([]);
        expect(await ledgerCount()).toBe(before);
    });

    test('a wrong confirmation number is refused before anything is written', async () => {
        const before = await ledgerCount();
        await expect(finance.createAllocation({
            actor: minfi, toEntityId: council.entity_id, fiscalYear: new Date().getFullYear(),
            amountXaf: 1000, purpose: 'Should never exist', password: PASSWORD, pcn: 'ZZZZ-ZZZZ-ZZZZ',
        })).rejects.toThrow('do not match');
        expect(await ledgerCount()).toBe(before);
    });

    test('only the receiving institution can confirm, and only once', async () => {
        const allocation = await finance.createAllocation({
            actor: minfi, toEntityId: council.entity_id, fiscalYear: new Date().getFullYear(),
            amountXaf: 5000, purpose: 'Integration test confirm rules', password: PASSWORD, pcn: PCN,
        });
        const sent = await finance.createDisbursement({
            actor: minfi, allocationId: allocation.id, amountXaf: 5000, password: PASSWORD, pcn: PCN,
        });

        await expect(finance.confirmDisbursement({
            actor: minfi, disbursementId: sent.id, amountConfirmedXaf: 5000, password: PASSWORD, pcn: PCN,
        })).rejects.toThrow('Only the receiving institution');

        await finance.confirmDisbursement({
            actor: council, disbursementId: sent.id, amountConfirmedXaf: 5000, password: PASSWORD, pcn: PCN,
        });
        await expect(finance.confirmDisbursement({
            actor: council, disbursementId: sent.id, amountConfirmedXaf: 5000, password: PASSWORD, pcn: PCN,
        })).rejects.toThrow('already been confirmed');
    });
});
