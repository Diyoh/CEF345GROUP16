/**
 * SECOND FACTOR FOR FINANCIAL ACTIONS
 *
 * Every action that touches money is confirmed with the actor's password AND
 * their Private Confirmation Number, entered together at the moment of the
 * action. A hijacked session alone cannot move money; a leaked password alone
 * cannot either.
 *
 * The failure message never says which factor was wrong: naming the wrong one
 * would let an attacker validate a stolen password against the PCN prompt.
 */

import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { badRequest, forbidden } from '../utils/AppError.js';

/** PCNs are shown grouped (XXXX-XXXX-XXXX); accept them however they were kept. */
export const normalizePcn = (pcn) => String(pcn || '').replace(/[\s-]/g, '').toUpperCase();

export const verifySecondFactor = async (actor, { password, pcn }) => {
    if (!password || !pcn) throw badRequest('Your password and confirmation number are both required');

    const [rows] = await pool.query(
        'SELECT password_hash, pcn_hash FROM users WHERE id = ?',
        [actor.id]
    );
    const row = rows[0];
    if (!row) throw forbidden('Not authorized');
    if (!row.pcn_hash) throw forbidden('Your account has no confirmation number. Contact the platform administrator.');

    const passwordOk = await bcrypt.compare(String(password), row.password_hash);
    const pcnOk = await bcrypt.compare(normalizePcn(pcn), row.pcn_hash);
    if (!passwordOk || !pcnOk) {
        throw forbidden('The password and confirmation number do not match our records');
    }
};
