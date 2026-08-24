/**
 * FINANCE SERVICE
 *
 * The money core of the governance plan, phase G3.
 *
 * PRINCIPLES, straight from the request:
 *   - The Ministry of Finance allocates. Nobody else creates allocations or
 *     records disbursements, not even the platform administrator: separation of
 *     duties beats operator convenience here.
 *   - Every money hop is a pair of records. MINFI records what it sent; the
 *     receiving institution separately confirms what arrived. The gap between
 *     the two numbers is computed, never editable.
 *   - Every mutation here passes the second factor (password + PCN) and writes
 *     a ledger entry in the same transaction. If the ledger write fails, the
 *     money row does not exist.
 *
 * Budgets are the one mutable record (a planned figure gets revised), and the
 * ledger records each revision with its old and new values, so mutability
 * costs no history.
 */

import { randomUUID } from 'crypto';
import pool, { withTransaction } from '../config/db.js';
import { badRequest, forbidden, notFound } from '../utils/AppError.js';
import { verifySecondFactor } from './secondFactor.js';
import { appendEntry } from './ledgerService.js';

/* ------------------------------------------------------------------ guards */

const requireMinfi = (actor) => {
    if (actor?.role === 'ENTITY_ADMIN' && actor.entity_code === 'MINFI') return;
    throw forbidden('Only the Ministry of Finance can perform this action');
};

const requireOwnEntity = (actor) => {
    if (actor?.role === 'ENTITY_ADMIN' && actor.entity_id) return;
    throw forbidden('Only an institution administrator can perform this action');
};

const parseAmount = (value, label) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw badRequest(`${label} must be a positive amount in FCFA`);
    if (n > 1e15) throw badRequest(`${label} is implausibly large`);
    return Math.round(n * 100) / 100;
};

const parseYear = (value) => {
    const y = Number(value) || new Date().getFullYear();
    if (!Number.isInteger(y) || y < 2020 || y > 2100) throw badRequest('Fiscal year is out of range');
    return y;
};

/* -------------------------------------------------------------- mutations */

/** MINFI commits money to a ministry or council for a fiscal year. */
export const createAllocation = async ({ actor, toEntityId, fiscalYear, amountXaf, purpose, password, pcn }) => {
    requireMinfi(actor);
    await verifySecondFactor(actor, { password, pcn });

    const amount = parseAmount(amountXaf, 'Allocation');
    const year = parseYear(fiscalYear);
    const why = String(purpose || '').trim();
    if (!why) throw badRequest('An allocation must state its purpose');

    const [targets] = await pool.query(
        "SELECT id, code, type FROM gov_entities WHERE id = ? AND type IN ('MINISTRY', 'COUNCIL')",
        [toEntityId]
    );
    const target = targets[0];
    if (!target) throw notFound('Receiving institution not found');
    if (target.id === actor.entity_id) throw badRequest('The Ministry of Finance cannot allocate to itself');

    const id = randomUUID();
    let ledger;
    await withTransaction(async (tx) => {
        await tx.query(
            `INSERT INTO allocations (id, from_entity_id, to_entity_id, fiscal_year, amount_xaf, purpose, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, actor.entity_id, target.id, year, amount, why, actor.id]
        );
        ledger = await appendEntry(tx, {
            entryType: 'allocation.created',
            refTable: 'allocations',
            refId: id,
            actor,
            amountXaf: amount,
            data: { toEntity: target.code, fiscalYear: year, purpose: why },
        });
    });

    return { id, toEntityId: target.id, fiscalYear: year, amountXaf: amount, purpose: why, ledgerSeq: ledger.seq };
};

/** MINFI records money actually sent against an allocation. */
export const createDisbursement = async ({ actor, allocationId, amountXaf, password, pcn }) => {
    requireMinfi(actor);
    await verifySecondFactor(actor, { password, pcn });

    const amount = parseAmount(amountXaf, 'Disbursement');
    const id = randomUUID();
    let ledger;

    await withTransaction(async (tx) => {
        const [allocs] = await tx.query(
            'SELECT id, to_entity_id, fiscal_year, amount_xaf FROM allocations WHERE id = ? FOR UPDATE',
            [allocationId]
        );
        const alloc = allocs[0];
        if (!alloc) throw notFound('Allocation not found');

        // A disbursement beyond the commitment is almost always a typo; and if
        // it is real, the honest record is a bigger allocation first.
        const [sums] = await tx.query(
            'SELECT COALESCE(SUM(amount_xaf), 0) AS sent FROM disbursements WHERE allocation_id = ?',
            [allocationId]
        );
        if (Number(sums[0].sent) + amount > Number(alloc.amount_xaf)) {
            throw badRequest('This disbursement would exceed the allocated amount');
        }

        await tx.query(
            'INSERT INTO disbursements (id, allocation_id, amount_xaf, sent_by) VALUES (?, ?, ?, ?)',
            [id, allocationId, amount, actor.id]
        );
        ledger = await appendEntry(tx, {
            entryType: 'disbursement.sent',
            refTable: 'disbursements',
            refId: id,
            actor,
            amountXaf: amount,
            data: { allocationId, fiscalYear: alloc.fiscal_year },
        });
    });

    return { id, allocationId, amountXaf: amount, ledgerSeq: ledger.seq };
};

/**
 * The receiving institution confirms what actually arrived. The confirmed
 * amount is theirs to state: the gap against what MINFI sent is the published
 * finding, in either direction.
 */
export const confirmDisbursement = async ({ actor, disbursementId, amountConfirmedXaf, password, pcn }) => {
    requireOwnEntity(actor);
    await verifySecondFactor(actor, { password, pcn });

    const confirmed = Number(amountConfirmedXaf);
    if (!Number.isFinite(confirmed) || confirmed < 0) {
        throw badRequest('Confirmed amount must be zero or a positive amount in FCFA');
    }

    let result;
    await withTransaction(async (tx) => {
        const [rows] = await tx.query(
            `SELECT d.id, d.amount_xaf, d.amount_confirmed_xaf, a.to_entity_id
             FROM disbursements d JOIN allocations a ON d.allocation_id = a.id
             WHERE d.id = ? FOR UPDATE`,
            [disbursementId]
        );
        const disb = rows[0];
        if (!disb) throw notFound('Disbursement not found');
        if (disb.to_entity_id !== actor.entity_id) {
            throw forbidden('Only the receiving institution can confirm this payment');
        }
        if (disb.amount_confirmed_xaf !== null) {
            throw badRequest('This payment has already been confirmed');
        }

        await tx.query(
            'UPDATE disbursements SET amount_confirmed_xaf = ?, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?',
            [confirmed, actor.id, disbursementId]
        );

        const gap = Math.round((Number(disb.amount_xaf) - confirmed) * 100) / 100;
        const ledger = await appendEntry(tx, {
            entryType: 'disbursement.confirmed',
            refTable: 'disbursements',
            refId: disbursementId,
            actor,
            amountXaf: confirmed,
            data: { sentXaf: Number(disb.amount_xaf), confirmedXaf: confirmed, gapXaf: gap },
        });
        result = { id: disbursementId, sentXaf: Number(disb.amount_xaf), confirmedXaf: confirmed, gapXaf: gap, ledgerSeq: ledger.seq };
    });

    return result;
};

/** An institution states (or revises) its planned budget for a year. */
export const setBudget = async ({ actor, fiscalYear, plannedAmountXaf, note, password, pcn }) => {
    requireOwnEntity(actor);
    await verifySecondFactor(actor, { password, pcn });

    const amount = parseAmount(plannedAmountXaf, 'Budget');
    const year = parseYear(fiscalYear);

    let result;
    await withTransaction(async (tx) => {
        const [existing] = await tx.query(
            'SELECT id, planned_amount FROM budgets WHERE entity_id = ? AND fiscal_year = ? FOR UPDATE',
            [actor.entity_id, year]
        );

        if (existing.length) {
            const old = Number(existing[0].planned_amount);
            await tx.query(
                'UPDATE budgets SET planned_amount = ?, note = ?, recorded_by = ? WHERE id = ?',
                [amount, note || null, actor.id, existing[0].id]
            );
            const ledger = await appendEntry(tx, {
                entryType: 'budget.revised',
                refTable: 'budgets',
                refId: existing[0].id,
                actor,
                amountXaf: amount,
                data: { fiscalYear: year, oldPlannedXaf: old, newPlannedXaf: amount, note: note || null },
            });
            result = { id: existing[0].id, fiscalYear: year, plannedAmountXaf: amount, revisedFromXaf: old, ledgerSeq: ledger.seq };
        } else {
            const id = randomUUID();
            await tx.query(
                'INSERT INTO budgets (id, entity_id, fiscal_year, planned_amount, note, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
                [id, actor.entity_id, year, amount, note || null, actor.id]
            );
            const ledger = await appendEntry(tx, {
                entryType: 'budget.set',
                refTable: 'budgets',
                refId: id,
                actor,
                amountXaf: amount,
                data: { fiscalYear: year, note: note || null },
            });
            result = { id, fiscalYear: year, plannedAmountXaf: amount, ledgerSeq: ledger.seq };
        }
    });

    return result;
};

/** An institution records income from its own sources (taxes, fees, grants). */
export const recordIncome = async ({ actor, fiscalYear, label, amountXaf, password, pcn }) => {
    requireOwnEntity(actor);
    await verifySecondFactor(actor, { password, pcn });

    const amount = parseAmount(amountXaf, 'Income');
    const year = parseYear(fiscalYear);
    const what = String(label || '').trim();
    if (!what) throw badRequest('Income must say where it came from');

    const id = randomUUID();
    let ledger;
    await withTransaction(async (tx) => {
        await tx.query(
            'INSERT INTO entity_income (id, entity_id, fiscal_year, label, amount_xaf, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
            [id, actor.entity_id, year, what, amount, actor.id]
        );
        ledger = await appendEntry(tx, {
            entryType: 'income.recorded',
            refTable: 'entity_income',
            refId: id,
            actor,
            amountXaf: amount,
            data: { fiscalYear: year, label: what },
        });
    });

    return { id, fiscalYear: year, label: what, amountXaf: amount, ledgerSeq: ledger.seq };
};

/* ---------------------------------------------------------------- queries */

/** Everything one institution's desk needs: budget, income, incoming money. */
export const getEntityFinance = async (entityId) => {
    const [budgets] = await pool.query(
        'SELECT id, fiscal_year, planned_amount AS planned_amount_xaf, note, updated_at FROM budgets WHERE entity_id = ? ORDER BY fiscal_year DESC',
        [entityId]
    );
    const [income] = await pool.query(
        'SELECT id, fiscal_year, label, amount_xaf, created_at FROM entity_income WHERE entity_id = ? ORDER BY created_at DESC',
        [entityId]
    );
    const [allocations] = await pool.query(
        `SELECT a.id, a.fiscal_year, a.amount_xaf, a.purpose, a.created_at, e.code AS from_code, e.name_en AS from_name_en, e.name_fr AS from_name_fr
         FROM allocations a JOIN gov_entities e ON a.from_entity_id = e.id
         WHERE a.to_entity_id = ? ORDER BY a.created_at DESC`,
        [entityId]
    );

    const allocationIds = allocations.map((a) => a.id);
    let disbursements = [];
    if (allocationIds.length) {
        [disbursements] = await pool.query(
            `SELECT id, allocation_id, amount_xaf, sent_at, amount_confirmed_xaf, confirmed_at
             FROM disbursements WHERE allocation_id IN (?) ORDER BY sent_at ASC`,
            [allocationIds]
        );
    }
    for (const alloc of allocations) {
        alloc.disbursements = disbursements.filter((d) => d.allocation_id === alloc.id);
    }

    const totals = {
        allocated_xaf: allocations.reduce((s, a) => s + Number(a.amount_xaf), 0),
        disbursed_xaf: disbursements.reduce((s, d) => s + Number(d.amount_xaf), 0),
        confirmed_xaf: disbursements.reduce((s, d) => s + Number(d.amount_confirmed_xaf || 0), 0),
        income_xaf: income.reduce((s, r) => s + Number(r.amount_xaf), 0),
        awaiting_confirmation: disbursements.filter((d) => d.amount_confirmed_xaf === null).length,
    };
    totals.gap_xaf = disbursements
        .filter((d) => d.amount_confirmed_xaf !== null)
        .reduce((s, d) => s + (Number(d.amount_xaf) - Number(d.amount_confirmed_xaf)), 0);

    return { budgets, income, allocations, totals };
};

/** MINFI's outbound view: every allocation it made, with confirmation status. */
export const getMinfiOverview = async (actor) => {
    requireMinfi(actor);

    const [allocations] = await pool.query(
        `SELECT a.id, a.fiscal_year, a.amount_xaf, a.purpose, a.created_at,
                e.code AS to_code, e.type AS to_type, e.name_en AS to_name_en, e.name_fr AS to_name_fr,
                COALESCE(SUM(d.amount_xaf), 0) AS disbursed_xaf,
                COALESCE(SUM(d.amount_confirmed_xaf), 0) AS confirmed_xaf,
                SUM(CASE WHEN d.id IS NOT NULL AND d.amount_confirmed_xaf IS NULL THEN 1 ELSE 0 END) AS awaiting_confirmation
         FROM allocations a
         JOIN gov_entities e ON a.to_entity_id = e.id
         LEFT JOIN disbursements d ON d.allocation_id = a.id
         WHERE a.from_entity_id = ?
         GROUP BY a.id, a.fiscal_year, a.amount_xaf, a.purpose, a.created_at, e.code, e.type, e.name_en, e.name_fr
         ORDER BY a.created_at DESC`,
        [actor.entity_id]
    );

    return { allocations };
};
