/**
 * CONTRACTOR VERIFICATION SERVICE
 *
 * The request that created this phase: every contractor must own an account with
 * the necessary documentation, confirmed by the ministry in charge of public
 * works. So verification is not a platform-admin convenience switch: the power
 * belongs to MINTP, and the service checks the actor's institution, not just
 * their role.
 *
 * A profile that changes its identity fields after verification drops back to
 * PENDING, because what MINTP approved is the documentation, not the account.
 */

import { randomUUID } from 'crypto';
import pool from '../config/db.js';
import { badRequest, forbidden, notFound } from '../utils/AppError.js';

export const CONTRACTOR_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

/** Verification power: MINTP's administrators, plus platform operations. */
export const assertCanVerify = (actor) => {
    if (!actor) throw forbidden('Not authorized');
    if (actor.role === 'PLATFORM_ADMIN') return;
    if (actor.role === 'ENTITY_ADMIN' && actor.entity_code === 'MINTP') return;
    throw forbidden('Contractor verification belongs to the Ministry of Public Works');
};

/** A contractor's own profile, with documents. Creates nothing. */
export const getProfile = async (userId) => {
    const [profiles] = await pool.query(
        'SELECT * FROM contractor_profiles WHERE user_id = ?',
        [userId]
    );
    const profile = profiles[0] || null;

    const [documents] = await pool.query(
        'SELECT id, label, file_url, uploaded_at FROM contractor_documents WHERE user_id = ? ORDER BY uploaded_at DESC',
        [userId]
    );

    return { profile, documents };
};

/**
 * Create or update the contractor's own profile.
 * Identity edits after verification re-open the review.
 */
export const saveProfile = async (userId, { companyName, rccmNumber, taxpayerNumber }) => {
    const name = String(companyName || '').trim();
    if (!name) throw badRequest('Company name is required');

    const [existing] = await pool.query(
        'SELECT status FROM contractor_profiles WHERE user_id = ?',
        [userId]
    );

    if (existing.length === 0) {
        await pool.query(
            'INSERT INTO contractor_profiles (user_id, company_name, rccm_number, taxpayer_number) VALUES (?, ?, ?, ?)',
            [userId, name, rccmNumber || null, taxpayerNumber || null]
        );
    } else {
        // Back to PENDING on identity change: the approved thing no longer exists.
        await pool.query(
            `UPDATE contractor_profiles
             SET company_name = ?, rccm_number = ?, taxpayer_number = ?,
                 status = 'PENDING', verified_by = NULL, verified_at = NULL, rejection_reason = NULL
             WHERE user_id = ?`,
            [name, rccmNumber || null, taxpayerNumber || null, userId]
        );
    }

    return getProfile(userId);
};

/** Attach one document (already uploaded through the image pipeline). */
export const addDocument = async (userId, { label, fileUrl }) => {
    const text = String(label || '').trim();
    if (!text) throw badRequest('A document needs a label saying what it is');
    if (!fileUrl) throw badRequest('No file was uploaded');

    await pool.query(
        'INSERT INTO contractor_documents (id, user_id, label, file_url) VALUES (?, ?, ?, ?)',
        [randomUUID(), userId, text, fileUrl]
    );

    return getProfile(userId);
};

/** The MINTP queue: everything awaiting a decision, documents inline. */
export const listQueue = async (actor) => {
    assertCanVerify(actor);

    const [rows] = await pool.query(
        `SELECT cp.user_id, cp.company_name, cp.rccm_number, cp.taxpayer_number, cp.status,
                u.name AS applicant_name, u.email AS applicant_email
         FROM contractor_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.status = 'PENDING'
         ORDER BY u.created_at ASC`
    );

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.user_id);
    const [docs] = await pool.query(
        `SELECT id, user_id, label, file_url FROM contractor_documents
         WHERE user_id IN (${ids.map(() => '?').join(',')})
         ORDER BY uploaded_at DESC`,
        ids
    );

    const docsByUser = new Map();
    for (const d of docs) {
        if (!docsByUser.has(d.user_id)) docsByUser.set(d.user_id, []);
        docsByUser.get(d.user_id).push(d);
    }

    return rows.map((r) => ({ ...r, documents: docsByUser.get(r.user_id) || [] }));
};

/**
 * The decision. VERIFIED or REJECTED, a rejection carries its reason, and the
 * decider is recorded on the row. From phase G3 this also writes a ledger entry.
 */
export const decide = async ({ actor, userId, decision, reason }) => {
    assertCanVerify(actor);

    if (decision !== 'VERIFIED' && decision !== 'REJECTED') {
        throw badRequest('Decision must be VERIFIED or REJECTED');
    }
    const why = String(reason || '').trim();
    if (decision === 'REJECTED' && !why) {
        throw badRequest('A rejection must state its reason');
    }

    const [profiles] = await pool.query(
        'SELECT user_id FROM contractor_profiles WHERE user_id = ?',
        [userId]
    );
    if (profiles.length === 0) throw notFound('Contractor profile not found');

    await pool.query(
        `UPDATE contractor_profiles
         SET status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ?
         WHERE user_id = ?`,
        [decision, actor.id, decision === 'REJECTED' ? why : null, userId]
    );

    return getProfile(userId);
};
