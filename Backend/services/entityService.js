/**
 * ENTITY SERVICE
 *
 * Read-side of the administrative hierarchy: the tree for the public governance
 * browser and single-entity profiles. Writes happen only through the seed script
 * (reference data) and, from phase G2 on, through entity administration.
 *
 * The hierarchy is depth two by design (councils under regions, everything else
 * under the national root), so every query here is a plain join, never recursive.
 */

import pool from '../config/db.js';
import { notFound } from '../utils/AppError.js';

const ENTITY_COLUMNS = 'id, type, code, name_en, name_fr, parent_id';

/**
 * Distinct project involvement per entity.
 *
 * A council-owned project appears both as owner and as its own area row, so a
 * naive owner-count plus area-count would count it twice. The UNION dedupes the
 * (entity, project) pairs before counting.
 */
const projectCountsByEntity = async () => {
    const [rows] = await pool.query(`
        SELECT entity_id, COUNT(*) AS n FROM (
            SELECT owner_entity_id AS entity_id, id AS project_id
            FROM projects WHERE owner_entity_id IS NOT NULL
            UNION
            SELECT entity_id, project_id FROM project_areas
        ) involvement
        GROUP BY entity_id
    `);

    const counts = new Map();
    for (const row of rows) counts.set(row.entity_id, Number(row.n));
    return counts;
};

/**
 * The full tree for the governance browser: ministries flat, regions with their
 * councils nested, each carrying a project count. Region counts roll their
 * councils up, because "projects in the North-West" includes the work its
 * councils commissioned. Council areas and region areas never overlap on the
 * same project (a council project's area is the council, a ministerial one's is
 * the region), so the rollup is a plain sum without double counting.
 */
export const getEntityTree = async () => {
    const [entities] = await pool.query(
        `SELECT ${ENTITY_COLUMNS} FROM gov_entities ORDER BY type, name_en`
    );
    const counts = await projectCountsByEntity();

    const decorate = (e) => ({ ...e, project_count: counts.get(e.id) || 0 });

    const national = entities.filter((e) => e.type === 'NATIONAL').map(decorate)[0] || null;
    const ministries = entities.filter((e) => e.type === 'MINISTRY').map(decorate);
    const councils = entities.filter((e) => e.type === 'COUNCIL').map(decorate);

    const regions = entities
        .filter((e) => e.type === 'REGION')
        .map((region) => {
            const own = counts.get(region.id) || 0;
            const children = councils.filter((c) => c.parent_id === region.id);
            const rolledUp = children.reduce((sum, c) => sum + c.project_count, own);
            return { ...region, project_count: rolledUp, councils: children };
        });

    return { national, ministries, regions };
};

/** One entity by its stable public code, or 404. */
export const getEntityByCode = async (code) => {
    const [rows] = await pool.query(
        `SELECT ${ENTITY_COLUMNS} FROM gov_entities WHERE code = ?`,
        [String(code || '').toUpperCase()]
    );
    if (rows.length === 0) throw notFound('Entity not found');
    return rows[0];
};

/**
 * The ids a project query should match for this entity.
 * A region speaks for its councils; everything else speaks for itself.
 */
export const entityScopeIds = async (entity) => {
    if (entity.type !== 'REGION') return [entity.id];

    const [children] = await pool.query(
        'SELECT id FROM gov_entities WHERE parent_id = ?',
        [entity.id]
    );
    return [entity.id, ...children.map((c) => c.id)];
};

/** Profile payload for the entity page: the entity, its parent, its children. */
export const getEntityProfile = async (code) => {
    const entity = await getEntityByCode(code);

    let parent = null;
    if (entity.parent_id) {
        const [rows] = await pool.query(
            `SELECT ${ENTITY_COLUMNS} FROM gov_entities WHERE id = ?`,
            [entity.parent_id]
        );
        parent = rows[0] || null;
    }

    const [children] = await pool.query(
        `SELECT ${ENTITY_COLUMNS} FROM gov_entities WHERE parent_id = ? ORDER BY name_en`,
        [entity.id]
    );

    const counts = await projectCountsByEntity();

    return {
        entity,
        parent,
        children: children.map((c) => ({ ...c, project_count: counts.get(c.id) || 0 })),
    };
};
