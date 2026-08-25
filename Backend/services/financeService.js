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
import { recordChanges } from './projectService.js';

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
    let alloc;

    await withTransaction(async (tx) => {
        const [allocs] = await tx.query(
            'SELECT id, to_entity_id, fiscal_year, amount_xaf FROM allocations WHERE id = ? FOR UPDATE',
            [allocationId]
        );
        alloc = allocs[0];
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

    return { id, allocationId, toEntityId: alloc.to_entity_id, amountXaf: amount, ledgerSeq: ledger.seq };
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

/**
 * The owning institution records a payment to its project's contractor.
 * Initiation is a claim, not a fact: the fact arrives when the contractor
 * affirms what they received, and the platform publishes the difference.
 */
export const initiatePayment = async ({ actor, projectId, amountXaf, note, password, pcn }) => {
    requireOwnEntity(actor);
    await verifySecondFactor(actor, { password, pcn });

    const amount = parseAmount(amountXaf, 'Payment');
    const id = randomUUID();
    let result;

    await withTransaction(async (tx) => {
        const [rows] = await tx.query(
            `SELECT p.id, p.title, p.owner_entity_id, p.contractor_id, cp.status AS contractor_status
             FROM projects p
             LEFT JOIN contractor_profiles cp ON cp.user_id = p.contractor_id
             WHERE p.id = ? FOR UPDATE`,
            [projectId]
        );
        const project = rows[0];
        if (!project) throw notFound('Project not found');
        if (project.owner_entity_id !== actor.entity_id) {
            throw forbidden('You can only pay contractors on projects owned by your institution');
        }
        if (!project.contractor_id) throw badRequest('This project has no assigned contractor to pay');
        if (project.contractor_status !== 'VERIFIED') {
            throw forbidden('This contractor has not been verified by the Ministry of Public Works');
        }

        await tx.query(
            `INSERT INTO project_payments (id, project_id, payer_entity_id, contractor_id, amount_xaf, note, initiated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, projectId, actor.entity_id, project.contractor_id, amount, note || null, actor.id]
        );
        const ledger = await appendEntry(tx, {
            entryType: 'payment.initiated',
            refTable: 'project_payments',
            refId: id,
            actor,
            amountXaf: amount,
            data: { projectId, projectTitle: project.title, contractorId: project.contractor_id, note: note || null },
        });
        result = { id, projectId, contractorId: project.contractor_id, amountXaf: amount, ledgerSeq: ledger.seq };
    });

    return result;
};

/**
 * The contractor affirms what actually arrived, exactly once per payment.
 * This is also the moment the project's spent figure moves: it becomes the sum
 * of affirmed amounts, recomputed here and logged in project_changes, so the
 * public number and its provenance land in one transaction.
 */
export const affirmPayment = async ({ actor, paymentId, amountAffirmedXaf, password, pcn }) => {
    if (actor?.role !== 'CONTRACTOR') throw forbidden('Only the paid contractor can affirm a payment');
    await verifySecondFactor(actor, { password, pcn });

    const affirmed = Number(amountAffirmedXaf);
    if (!Number.isFinite(affirmed) || affirmed < 0) {
        throw badRequest('Affirmed amount must be zero or a positive amount in FCFA');
    }

    let result;
    await withTransaction(async (tx) => {
        const [rows] = await tx.query(
            'SELECT id, project_id, payer_entity_id, contractor_id, amount_xaf, affirmed_at FROM project_payments WHERE id = ? FOR UPDATE',
            [paymentId]
        );
        const payment = rows[0];
        if (!payment) throw notFound('Payment not found');
        if (payment.contractor_id !== actor.id) throw forbidden('Only the paid contractor can affirm this payment');
        if (payment.affirmed_at !== null) throw badRequest('This payment has already been affirmed');

        await tx.query(
            'UPDATE project_payments SET amount_affirmed_xaf = ?, affirmed_at = NOW() WHERE id = ?',
            [affirmed, paymentId]
        );

        // Derive spent from what contractors affirm, never from what anyone types.
        const [projects] = await tx.query(
            'SELECT spent FROM projects WHERE id = ? FOR UPDATE',
            [payment.project_id]
        );
        const oldSpent = Number(projects[0]?.spent || 0);
        const [sums] = await tx.query(
            'SELECT COALESCE(SUM(amount_affirmed_xaf), 0) AS affirmed FROM project_payments WHERE project_id = ? AND affirmed_at IS NOT NULL',
            [payment.project_id]
        );
        const newSpent = Number(sums[0].affirmed);
        await tx.query('UPDATE projects SET spent = ? WHERE id = ?', [newSpent, payment.project_id]);
        if (newSpent !== oldSpent) {
            await recordChanges({
                tx,
                projectId: payment.project_id,
                actor,
                changes: [{ field: 'spent', oldValue: String(oldSpent), newValue: String(newSpent) }],
            });
        }

        const gap = Math.round((Number(payment.amount_xaf) - affirmed) * 100) / 100;
        const ledger = await appendEntry(tx, {
            entryType: 'payment.affirmed',
            refTable: 'project_payments',
            refId: paymentId,
            actor,
            amountXaf: affirmed,
            data: { projectId: payment.project_id, paidXaf: Number(payment.amount_xaf), affirmedXaf: affirmed, gapXaf: gap },
        });
        result = {
            id: paymentId,
            projectId: payment.project_id,
            payerEntityId: payment.payer_entity_id,
            paidXaf: Number(payment.amount_xaf),
            affirmedXaf: affirmed,
            gapXaf: gap,
            spentXaf: newSpent,
            ledgerSeq: ledger.seq,
        };
    });

    return result;
};

/** A project's payment history: public, like everything else about the money. */
export const listProjectPayments = async (projectId) => {
    const [rows] = await pool.query(
        `SELECT pp.id, pp.amount_xaf, pp.note, pp.initiated_at, pp.amount_affirmed_xaf, pp.affirmed_at,
                e.code AS payer_code, e.name_en AS payer_name_en, e.name_fr AS payer_name_fr,
                u.name AS contractor_name
         FROM project_payments pp
         JOIN gov_entities e ON pp.payer_entity_id = e.id
         JOIN users u ON pp.contractor_id = u.id
         WHERE pp.project_id = ? ORDER BY pp.initiated_at DESC`,
        [projectId]
    );
    return rows;
};

/** The contractor's inbox: what they have been paid, unanswered first. */
export const getContractorPayments = async (actor) => {
    const [rows] = await pool.query(
        `SELECT pp.id, pp.amount_xaf, pp.note, pp.initiated_at, pp.amount_affirmed_xaf, pp.affirmed_at,
                p.title AS project_title,
                e.code AS payer_code, e.name_en AS payer_name_en, e.name_fr AS payer_name_fr
         FROM project_payments pp
         JOIN projects p ON pp.project_id = p.id
         JOIN gov_entities e ON pp.payer_entity_id = e.id
         WHERE pp.contractor_id = ?
         ORDER BY (pp.affirmed_at IS NULL) DESC, pp.initiated_at DESC`,
        [actor.id]
    );
    return rows;
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

    const [payments] = await pool.query(
        `SELECT pp.id, pp.amount_xaf, pp.initiated_at, pp.amount_affirmed_xaf, pp.affirmed_at,
                p.title AS project_title, u.name AS contractor_name
         FROM project_payments pp
         JOIN projects p ON pp.project_id = p.id
         JOIN users u ON pp.contractor_id = u.id
         WHERE pp.payer_entity_id = ?
         ORDER BY pp.initiated_at DESC`,
        [entityId]
    );
    totals.paid_xaf = payments.reduce((s, r) => s + Number(r.amount_xaf), 0);
    totals.paid_affirmed_xaf = payments.reduce((s, r) => s + Number(r.amount_affirmed_xaf || 0), 0);

    return { budgets, income, allocations, payments, totals };
};

/**
 * MINFI's budget oversight: every declared budget on the platform, by
 * institution and year, alongside what MINFI allocated to that institution
 * for the same year and what the institution recorded as its own income.
 * The ministry that funds the system sees the whole book.
 */
export const getAllBudgets = async (actor) => {
    requireMinfi(actor);

    const [rows] = await pool.query(
        `SELECT b.id, b.fiscal_year, b.planned_amount AS planned_amount_xaf, b.note, b.updated_at,
                e.id AS entity_id, e.code AS entity_code, e.type AS entity_type,
                e.name_en AS entity_name_en, e.name_fr AS entity_name_fr,
                (SELECT COALESCE(SUM(a.amount_xaf), 0) FROM allocations a
                    WHERE a.to_entity_id = b.entity_id AND a.fiscal_year = b.fiscal_year) AS allocated_xaf,
                (SELECT COALESCE(SUM(i.amount_xaf), 0) FROM entity_income i
                    WHERE i.entity_id = b.entity_id AND i.fiscal_year = b.fiscal_year) AS income_xaf
         FROM budgets b
         JOIN gov_entities e ON b.entity_id = e.id
         ORDER BY b.fiscal_year DESC, e.type, e.code`
    );
    return { budgets: rows };
};

/**
 * The national money view, public, by fiscal year.
 *
 * Three answers for a citizen: every budget allocation made to every ministry
 * and council (with how much was sent and how much the receiver confirmed),
 * what each institution paid into the government coffers as its own recorded
 * income, and the year-by-year totals. No login: this page IS the product.
 */
export const getPublicMoney = async (fiscalYear) => {
    const [yearRows] = await pool.query(
        `SELECT DISTINCT fiscal_year AS y FROM allocations
         UNION SELECT DISTINCT fiscal_year FROM entity_income
         UNION SELECT DISTINCT fiscal_year FROM budgets
         ORDER BY y DESC`
    );
    const years = yearRows.map((r) => Number(r.y));
    const year = years.includes(Number(fiscalYear)) ? Number(fiscalYear) : (years[0] || new Date().getFullYear());

    // The allocation register: every commitment for the year, receiver named.
    const [allocations] = await pool.query(
        `SELECT a.id, a.fiscal_year, a.amount_xaf, a.purpose, a.created_at,
                e.code AS to_code, e.type AS to_type, e.name_en AS to_name_en, e.name_fr AS to_name_fr,
                COALESCE(SUM(d.amount_xaf), 0) AS disbursed_xaf,
                COALESCE(SUM(d.amount_confirmed_xaf), 0) AS confirmed_xaf,
                SUM(CASE WHEN d.id IS NOT NULL AND d.amount_confirmed_xaf IS NULL THEN 1 ELSE 0 END) AS awaiting_confirmation
         FROM allocations a
         JOIN gov_entities e ON a.to_entity_id = e.id
         LEFT JOIN disbursements d ON d.allocation_id = a.id
         WHERE a.fiscal_year = ?
         GROUP BY a.id, a.fiscal_year, a.amount_xaf, a.purpose, a.created_at, e.code, e.type, e.name_en, e.name_fr
         ORDER BY a.amount_xaf DESC, a.created_at DESC`,
        [year]
    );

    // What each institution paid into the coffers: its recorded income, with
    // the individual lines so a total is never a black box.
    const [incomeRows] = await pool.query(
        `SELECT i.entity_id, i.label, i.amount_xaf, i.created_at,
                e.code AS entity_code, e.type AS entity_type, e.name_en AS entity_name_en, e.name_fr AS entity_name_fr
         FROM entity_income i
         JOIN gov_entities e ON i.entity_id = e.id
         WHERE i.fiscal_year = ?
         ORDER BY e.type, e.code, i.created_at DESC`,
        [year]
    );
    const incomeByEntity = [];
    for (const row of incomeRows) {
        let bucket = incomeByEntity.find((b) => b.entity_id === row.entity_id);
        if (!bucket) {
            bucket = {
                entity_id: row.entity_id,
                entity_code: row.entity_code,
                entity_type: row.entity_type,
                entity_name_en: row.entity_name_en,
                entity_name_fr: row.entity_name_fr,
                total_xaf: 0,
                lines: [],
            };
            incomeByEntity.push(bucket);
        }
        bucket.total_xaf += Number(row.amount_xaf);
        bucket.lines.push({ label: row.label, amount_xaf: Number(row.amount_xaf), created_at: row.created_at });
    }
    incomeByEntity.sort((a, b) => b.total_xaf - a.total_xaf);

    const totals = {
        allocated_xaf: allocations.reduce((t, a) => t + Number(a.amount_xaf), 0),
        disbursed_xaf: allocations.reduce((t, a) => t + Number(a.disbursed_xaf), 0),
        confirmed_xaf: allocations.reduce((t, a) => t + Number(a.confirmed_xaf), 0),
        income_xaf: incomeByEntity.reduce((t, b) => t + b.total_xaf, 0),
    };
    totals.gap_xaf = totals.disbursed_xaf - totals.confirmed_xaf;

    return { year, years, allocations, income: incomeByEntity, totals };
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
