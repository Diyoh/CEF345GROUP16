/**
 * MIGRATION RUNNER
 *
 * Applies Database/migrations/*.sql in filename order, exactly once each, and records what
 * it did in a `schema_migrations` table.
 *
 * WHY THIS EXISTS:
 * Migrations were previously applied by hand with a tick-box table in a README as the only
 * record of production schema state. That fails in the ordinary way: nobody remembers
 * whether 002 ran on Aiven, re-running is unsafe for some statements, and the README and
 * reality drift apart silently. The database should be the record of its own state.
 *
 * Deliberately NOT a framework. It reuses the application's own connection pool, so if the
 * API can reach the database this can too — same host, port, SSL and credential resolution,
 * with no second config to keep in sync.
 *
 * Usage:
 *   npm run migrate:status   what is applied, what is pending
 *   npm run migrate:dry      print the statements that would run, change nothing
 *   npm run migrate          apply pending migrations
 *
 * NOTE ON TRANSACTIONS: MySQL commits implicitly on DDL, so a migration cannot be rolled
 * back as a unit. That is why each file is recorded only after all of its statements
 * succeed, and why a partially applied file is reported loudly rather than silently marked
 * done — a human has to look at it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pool from '../config/db.js';
import { splitStatements } from '../utils/sqlStatements.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'Database', 'migrations');

/** Errors that mean "this change is already present". Safe to treat as success. */
const ALREADY_APPLIED = new Set([
    'ER_DUP_KEYNAME',      // index exists
    'ER_TABLE_EXISTS_ERROR',
    'ER_DUP_FIELDNAME',    // column exists
    'ER_TRG_ALREADY_EXISTS',
    'ER_CANT_DROP_FIELD_OR_KEY', // dropping something already gone
]);

const ensureTrackingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename VARCHAR(255) PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            statements INT NOT NULL DEFAULT 0
        )
    `);
};

const readMigrations = () => {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map((filename) => {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
            return {
                filename,
                sql,
                checksum: crypto.createHash('sha256').update(sql).digest('hex'),
                statements: splitStatements(sql),
            };
        });
};

const getApplied = async () => {
    const [rows] = await pool.query('SELECT filename, checksum, applied_at FROM schema_migrations');
    return new Map(rows.map((r) => [r.filename, r]));
};

const run = async () => {
    const mode = process.argv[2] || 'apply';

    await ensureTrackingTable();

    const migrations = readMigrations();
    const applied = await getApplied();

    if (migrations.length === 0) {
        console.log('No migration files found in Database/migrations/.');
        return;
    }

    // A file whose contents changed after being applied is a mistake worth shouting about:
    // the database no longer matches what the repo says was run.
    const drifted = migrations.filter(
        (m) => applied.has(m.filename) && applied.get(m.filename).checksum !== m.checksum
    );

    if (drifted.length > 0) {
        console.warn('\n  WARNING — these applied migrations have been edited since they ran:');
        drifted.forEach((m) => console.warn(`   - ${m.filename}`));
        console.warn('  The database does not match the repository. Write a new migration instead.\n');
    }

    const pending = migrations.filter((m) => !applied.has(m.filename));

    if (mode === 'status') {
        console.log('\nMigration status\n');
        for (const m of migrations) {
            const row = applied.get(m.filename);
            const when = row ? new Date(row.applied_at).toISOString().replace('T', ' ').slice(0, 19) : '';
            console.log(`  ${row ? '[applied]' : '[PENDING]'}  ${m.filename}${when ? `   ${when}` : ''}`);
        }
        console.log(`\n${applied.size} applied, ${pending.length} pending.\n`);
        return;
    }

    if (pending.length === 0) {
        console.log('\nDatabase is up to date. Nothing to apply.\n');
        return;
    }

    if (mode === 'dry') {
        console.log(`\nDRY RUN — ${pending.length} migration(s) would be applied. Nothing will change.\n`);
        for (const m of pending) {
            console.log(`--- ${m.filename} (${m.statements.length} statement(s)) ---`);
            m.statements.forEach((s, i) => {
                const firstLine = s.split('\n').find((l) => l.trim() && !l.trim().startsWith('--')) || s;
                console.log(`   ${i + 1}. ${firstLine.trim().slice(0, 110)}`);
            });
        }
        console.log('\nRun `npm run migrate` to apply.\n');
        return;
    }

    console.log(`\nApplying ${pending.length} migration(s)...\n`);

    for (const migration of pending) {
        console.log(`--- ${migration.filename}`);
        let executed = 0;

        for (const statement of migration.statements) {
            try {
                await pool.query(statement);
                executed++;
            } catch (error) {
                if (ALREADY_APPLIED.has(error.code)) {
                    console.log(`    already present (${error.code}), continuing`);
                    executed++;
                    continue;
                }

                console.error(`\n  FAILED in ${migration.filename}, statement ${executed + 1}:`);
                console.error(`  ${statement.slice(0, 300)}`);
                console.error(`  ${error.code || ''} ${error.message}`);
                console.error('\n  This file was NOT recorded as applied. Fix the cause and re-run;');
                console.error('  statements that already succeeded are tolerated on the next attempt.\n');
                throw error;
            }
        }

        await pool.query(
            'INSERT INTO schema_migrations (filename, checksum, statements) VALUES (?, ?, ?)',
            [migration.filename, migration.checksum, executed]
        );

        console.log(`    applied ${executed} statement(s)\n`);
    }

    console.log(`Done. ${pending.length} migration(s) applied.\n`);
};

run()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error('Migration run aborted:', error.message);
        try { await pool.end(); } catch { /* pool may already be closed */ }
        process.exit(1);
    });
