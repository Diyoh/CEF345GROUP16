/**
 * GOVERNMENT ENTITY SEED AND PROJECT BACKFILL
 *
 * Seeds the administrative hierarchy: the national root, the 10 regions, the
 * infrastructure-relevant ministries, and the councils listed in
 * Database/data/councils.csv. Then backfills existing projects into the
 * hierarchy: each project's free-text region string becomes a project_areas row,
 * and projects without an owner get MINTP as a provisional owner, correctable by
 * an administrator later.
 *
 * Unlike seed.js this script is IDEMPOTENT and NON-DESTRUCTIVE. It never deletes
 * anything. Rows are keyed by their unique entity code: an existing code gets its
 * names refreshed, a missing one is inserted. Running it twice is safe, which
 * matters because the council list will be corrected against the official
 * MINDDEVEL register and re-imported.
 *
 * Run: npm run seed:entities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import pool from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COUNCILS_CSV = path.join(__dirname, '..', '..', 'Database', 'data', 'councils.csv');

const REGIONS = [
    { code: 'AD', en: 'Adamawa', fr: 'Adamaoua' },
    { code: 'CE', en: 'Centre', fr: 'Centre' },
    { code: 'EA', en: 'East', fr: 'Est' },
    { code: 'FN', en: 'Far North', fr: 'Extrême-Nord' },
    { code: 'LT', en: 'Littoral', fr: 'Littoral' },
    { code: 'NO', en: 'North', fr: 'Nord' },
    { code: 'NW', en: 'North-West', fr: 'Nord-Ouest' },
    { code: 'SO', en: 'South', fr: 'Sud' },
    { code: 'SW', en: 'South-West', fr: 'Sud-Ouest' },
    { code: 'WE', en: 'West', fr: 'Ouest' },
];

const MINISTRIES = [
    { code: 'MINFI', en: 'Ministry of Finance', fr: 'Ministère des Finances' },
    { code: 'MINTP', en: 'Ministry of Public Works', fr: 'Ministère des Travaux publics' },
    { code: 'MINEE', en: 'Ministry of Water and Energy', fr: "Ministère de l'Eau et de l'Énergie" },
    { code: 'MINSANTE', en: 'Ministry of Public Health', fr: 'Ministère de la Santé publique' },
    { code: 'MINEDUB', en: 'Ministry of Basic Education', fr: "Ministère de l'Éducation de base" },
    { code: 'MINESEC', en: 'Ministry of Secondary Education', fr: 'Ministère des Enseignements secondaires' },
    { code: 'MINHDU', en: 'Ministry of Housing and Urban Development', fr: "Ministère de l'Habitat et du Développement urbain" },
    { code: 'MINT', en: 'Ministry of Transport', fr: 'Ministère des Transports' },
    { code: 'MINADER', en: 'Ministry of Agriculture and Rural Development', fr: "Ministère de l'Agriculture et du Développement rural" },
    { code: 'MINDDEVEL', en: 'Ministry of Decentralisation and Local Development', fr: 'Ministère de la Décentralisation et du Développement local' },
    { code: 'MINEPAT', en: 'Ministry of Economy, Planning and Regional Development', fr: "Ministère de l'Économie, de la Planification et de l'Aménagement du territoire" },
];

/** The exact region strings the legacy projects.region column contains. */
const LEGACY_REGION_TO_CODE = {
    'Adamaoua': 'AD',
    'Centre': 'CE',
    'East': 'EA',
    'Far North': 'FN',
    'Littoral': 'LT',
    'North': 'NO',
    'North West': 'NW',
    'South': 'SO',
    'South West': 'SW',
    'West': 'WE',
};

/**
 * Insert or refresh one entity, keyed by its unique code.
 * Returns the entity id either way, so callers can build the parent map.
 */
const upsertEntity = async ({ type, code, nameEn, nameFr, parentId = null }) => {
    const [existing] = await pool.query('SELECT id FROM gov_entities WHERE code = ?', [code]);

    if (existing.length > 0) {
        await pool.query(
            'UPDATE gov_entities SET name_en = ?, name_fr = ?, parent_id = ? WHERE code = ?',
            [nameEn, nameFr, parentId, code]
        );
        return existing[0].id;
    }

    const id = randomUUID();
    await pool.query(
        'INSERT INTO gov_entities (id, type, code, name_en, name_fr, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
        [id, type, code, nameEn, nameFr, parentId]
    );
    return id;
};

const readCouncilsCsv = () => {
    const raw = fs.readFileSync(COUNCILS_CSV, 'utf8');
    return raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && !line.startsWith('code,'))
        .map((line) => {
            const [code, regionCode, nameEn, nameFr] = line.split(',');
            return { code, regionCode, nameEn, nameFr: nameFr || nameEn };
        });
};

const run = async () => {
    console.log('Seeding government entities (idempotent, nothing is deleted)...');

    const rootId = await upsertEntity({
        type: 'NATIONAL',
        code: 'CMR',
        nameEn: 'Republic of Cameroon',
        nameFr: 'République du Cameroun',
    });

    const regionIds = {};
    for (const r of REGIONS) {
        regionIds[r.code] = await upsertEntity({
            type: 'REGION', code: r.code, nameEn: r.en, nameFr: r.fr, parentId: rootId,
        });
    }

    const ministryIds = {};
    for (const m of MINISTRIES) {
        ministryIds[m.code] = await upsertEntity({
            type: 'MINISTRY', code: m.code, nameEn: m.en, nameFr: m.fr, parentId: rootId,
        });
    }

    const councils = readCouncilsCsv();
    let councilCount = 0;
    let skipped = 0;
    for (const c of councils) {
        const parentId = regionIds[c.regionCode];
        if (!parentId) {
            console.warn(`  skipped council ${c.code}: unknown region ${c.regionCode}`);
            skipped += 1;
            continue;
        }
        await upsertEntity({
            type: 'COUNCIL', code: c.code, nameEn: c.nameEn, nameFr: c.nameFr, parentId,
        });
        councilCount += 1;
    }

    console.log(`Entities in place: 1 national root, ${REGIONS.length} regions, ${MINISTRIES.length} ministries, ${councilCount} councils${skipped ? `, ${skipped} skipped` : ''}.`);

    // Backfill existing projects into the hierarchy. Legacy projects carry only a
    // free-text region; they become MINTP-owned with their region as the area, a
    // provisional mapping an administrator can correct project by project.
    const [orphans] = await pool.query(
        'SELECT id, region FROM projects WHERE owner_entity_id IS NULL'
    );

    let backfilled = 0;
    let unmapped = 0;
    for (const project of orphans) {
        const regionCode = LEGACY_REGION_TO_CODE[String(project.region || '').trim()];
        if (!regionCode) {
            console.warn(`  project ${project.id}: region "${project.region}" has no mapping, left untouched`);
            unmapped += 1;
            continue;
        }

        await pool.query('UPDATE projects SET owner_entity_id = ? WHERE id = ?', [
            ministryIds.MINTP, project.id,
        ]);
        await pool.query(
            'INSERT IGNORE INTO project_areas (project_id, entity_id) VALUES (?, ?)',
            [project.id, regionIds[regionCode]]
        );
        backfilled += 1;
    }

    console.log(`Projects backfilled: ${backfilled} of ${orphans.length}${unmapped ? `, ${unmapped} without a region mapping` : ''}.`);
    console.log('Done.');
};

run()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error('Entity seed failed:', error.message);
        try { await pool.end(); } catch { /* already closed */ }
        process.exit(1);
    });
