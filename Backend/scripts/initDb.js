/**
 * DATABASE BOOTSTRAP
 *
 * Creates every table, index and trigger in an EMPTY database from Database/schema.sql.
 *
 * WHY THIS EXISTS:
 * The project was tied to one hosted database that someone had set up by hand. When that
 * instance goes away — or when a teammate clones the repo, or CI needs a throwaway database
 * — there was no scripted path from "empty MySQL" to "working schema". The .sql file existed
 * but you had to know to pipe it through a client that may not be installed.
 *
 * This uses the application's own connection pool, so it targets whatever Backend/.env
 * points at. No hardcoded host, no separate credentials.
 *
 * Full setup of a replacement database:
 *
 *     cd Backend
 *     npm run db:init      # tables, indexes, triggers from schema.sql
 *     npm run migrate      # records the migration baseline
 *     npm run seed         # optional demo data
 *
 * SAFE TO RE-RUN: schema.sql uses CREATE TABLE IF NOT EXISTS and DROP TRIGGER IF EXISTS
 * throughout, and objects that already exist are tolerated and reported. It does NOT drop
 * or modify existing tables, so it will never destroy data — but it also will not upgrade an
 * out-of-date schema. That is what `npm run migrate` is for.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { splitStatements } from '../utils/sqlStatements.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'Database', 'schema.sql');

/** Errors meaning "this object is already there" — expected on a re-run. */
const BENIGN = new Set([
    'ER_TABLE_EXISTS_ERROR',
    'ER_DUP_KEYNAME',
    'ER_DUP_FIELDNAME',
    'ER_TRG_ALREADY_EXISTS',
]);

const run = async () => {
    if (!fs.existsSync(SCHEMA_PATH)) {
        console.error(`Schema not found at ${SCHEMA_PATH}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const statements = splitStatements(sql);

    console.log(`\nApplying Database/schema.sql — ${statements.length} statement(s)\n`);

    let created = 0;
    let skipped = 0;

    for (const statement of statements) {
        const label = statement.split('\n').find((l) => l.trim() && !l.trim().startsWith('--')) || statement;

        try {
            await pool.query(statement);
            created++;
            console.log(`  ok    ${label.trim().slice(0, 88)}`);
        } catch (error) {
            if (BENIGN.has(error.code)) {
                skipped++;
                console.log(`  skip  ${label.trim().slice(0, 70)}  (already present)`);
                continue;
            }
            console.error(`\n  FAILED: ${label.trim().slice(0, 120)}`);
            console.error(`  ${error.code || ''} ${error.message}\n`);
            throw error;
        }
    }

    // Confirm the result rather than trusting that the statements did what they claim.
    const [tables] = await pool.query('SHOW TABLES');
    const [triggers] = await pool.query(
        `SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
         WHERE EVENT_OBJECT_TABLE = 'project_changes' AND TRIGGER_SCHEMA = DATABASE()`
    );

    console.log(`\n${created} applied, ${skipped} already present.`);
    console.log(`Tables: ${tables.map((t) => Object.values(t)[0]).join(', ')}`);
    console.log(`Audit-log triggers: ${triggers.map((t) => t.TRIGGER_NAME).join(', ') || 'NONE — the audit log is not protected'}`);
    console.log('\nNext: npm run migrate   (then optionally npm run seed)\n');
};

run()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error('Bootstrap aborted:', error.message);
        try { await pool.end(); } catch { /* already closed */ }
        process.exit(1);
    });
