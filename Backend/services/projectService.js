/**
 * PROJECT SERVICE
 *
 * ALL business rules for projects live here — never in routes, never in controllers.
 *
 * WHY:
 * A rule that lives in a controller is only enforced for the one route that happens
 * to call it. A rule that lives in a service is enforced for every caller, forever.
 * The contractor-ownership rule below is the clearest example: the frontend used to
 * "enforce" it by filtering the project list, which meant the API itself would happily
 * let any contractor edit any project by ID.
 *
 * This module knows about the database and the domain. It does NOT know about HTTP —
 * it throws AppError, and the controller turns that into a status code.
 */

import { randomUUID } from 'crypto';
import pool, { withTransaction } from '../config/db.js';
import { AppError, badRequest, forbidden, notFound } from '../utils/AppError.js';
import { saveBase64Image } from '../utils/fileHandler.js';
import { attachFlags, FLAGGED_SQL, CRITICAL_SQL } from './projectFlags.js';

/** Valid values for projects.status — must stay in sync with the ENUM in schema.sql */
export const PROJECT_STATUSES = ['Planned', 'Ongoing', 'Stalled', 'Completed'];

/**
 * WHO MAY CHANGE WHAT
 *
 * A contractor reports on work: progress, money spent, status, narrative, photos.
 * A contractor may NOT re-scope the project — they cannot change the budget they are
 * measured against, retitle the project, or reassign it to someone else.
 */
const CONTRACTOR_EDITABLE_FIELDS = ['status', 'progress', 'spent', 'description'];

/** An admin owns the definition of the project itself, so they may edit everything. */
const ADMIN_EDITABLE_FIELDS = [
    ...CONTRACTOR_EDITABLE_FIELDS,
    'title', 'location', 'region', 'budget', 'contractorId', 'startDate', 'completionDate'
];

/** Maps an API field name to its database column. */
const COLUMN_BY_FIELD = {
    status: 'status',
    progress: 'progress',
    spent: 'spent',
    description: 'description',
    title: 'title',
    location: 'location',
    region: 'region',
    budget: 'budget',
    contractorId: 'contractor_id',
    startDate: 'start_date',
    completionDate: 'completion_date'
};

// ---------------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------------

/**
 * Requests arrive as JSON (contractor dashboard) or as multipart FormData
 * (admin dashboard), and FormData delivers every value as a string.
 * So numeric fields must be coerced before they are checked.
 */
const toNumber = (value, fieldName) => {
    const parsed = Number(value);
    if (value === '' || value === null || Number.isNaN(parsed)) {
        throw badRequest(`${fieldName} must be a number`);
    }
    return parsed;
};

const requireText = (value, fieldName) => {
    const text = String(value ?? '').trim();
    if (!text) throw badRequest(`${fieldName} is required`);
    return text;
};

/**
 * validateField
 * Normalises and range-checks a single field. Throws on anything invalid.
 */
const validateField = (field, rawValue) => {
    switch (field) {
        case 'progress': {
            const progress = toNumber(rawValue, 'Progress');
            if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
                throw badRequest('Progress must be a whole number between 0 and 100');
            }
            return progress;
        }

        case 'spent': {
            const spent = toNumber(rawValue, 'Amount spent');
            if (spent < 0) throw badRequest('Amount spent cannot be negative');
            // NOTE: spending MORE than the budget is deliberately allowed.
            // Overspend is exactly the kind of thing this platform exists to make
            // visible — blocking it would just push it off the record.
            return spent;
        }

        case 'budget': {
            const budget = toNumber(rawValue, 'Budget');
            if (budget < 0) throw badRequest('Budget cannot be negative');
            return budget;
        }

        case 'status': {
            const status = String(rawValue);
            if (!PROJECT_STATUSES.includes(status)) {
                throw badRequest(`Status must be one of: ${PROJECT_STATUSES.join(', ')}`);
            }
            return status;
        }

        case 'title':
        case 'location':
        case 'region':
            return requireText(rawValue, field);

        case 'description':
            // May be blank — a contractor clearing their note is legitimate.
            return String(rawValue ?? '');

        case 'startDate':
        case 'completionDate':
            return rawValue || null;

        case 'contractorId':
            return rawValue || null;

        default:
            return rawValue;
    }
};

// ---------------------------------------------------------------------------
// AUTHORIZATION RULES
// ---------------------------------------------------------------------------

/**
 * assertCanEditProject
 *
 * THE RULE: a contractor may only touch a project that is assigned to them.
 *
 * This is the single most important rule in the system. The platform's whole
 * credibility rests on "the progress report came from the contractor doing the work" —
 * if any contractor can write to any project, the data means nothing.
 */
export const assertCanEditProject = (actor, project) => {
    if (!actor) throw forbidden('Not authorized');

    if (actor.role === 'PLATFORM_ADMIN') return; // Platform operations oversee everything.

    // An entity administrator manages the projects their institution owns, and
    // exactly those. Legacy projects without an owner stay platform-managed.
    if (actor.role === 'ENTITY_ADMIN') {
        if (!project.owner_entity_id || project.owner_entity_id !== actor.entity_id) {
            throw forbidden('You can only manage projects owned by your institution');
        }
        return;
    }

    if (actor.role === 'CONTRACTOR') {
        if (project.contractor_id !== actor.id) {
            throw forbidden('You can only update projects assigned to you');
        }
        return;
    }

    throw forbidden(`Role ${actor.role} cannot modify projects`);
};

// ---------------------------------------------------------------------------
// DATA HELPERS
// ---------------------------------------------------------------------------

/**
 * attachImages
 *
 * Loads images for a whole page of projects in ONE query instead of one query
 * per project. With the database in another country, N round trips at ~200ms each
 * is the difference between a page that loads and a page that times out.
 */
const attachImages = async (projects) => {
    if (projects.length === 0) return projects;

    const ids = projects.map(p => p.id);
    const placeholders = ids.map(() => '?').join(',');

    const [rows] = await pool.query(
        `SELECT project_id, image_url
         FROM project_images
         WHERE project_id IN (${placeholders})
         ORDER BY is_main_cover DESC, uploaded_at ASC`,
        ids
    );

    const imagesByProject = new Map();
    for (const row of rows) {
        if (!imagesByProject.has(row.project_id)) imagesByProject.set(row.project_id, []);
        imagesByProject.get(row.project_id).push(row.image_url);
    }

    // Always set an array — the frontend reads project.images.length unguarded.
    for (const project of projects) {
        project.images = imagesByProject.get(project.id) || [];
    }

    return projects;
};

// ---------------------------------------------------------------------------
// HIERARCHY: OWNERSHIP, AREAS, DECORATION
// ---------------------------------------------------------------------------

/**
 * attachEntities
 * Decorates a page of projects with their owner entity and area entities, two
 * batched queries for the whole page, same pattern as attachImages. Fields are
 * additive: legacy rows without an owner simply carry null and an empty list.
 */
const attachEntities = async (projects) => {
    if (projects.length === 0) return projects;

    // parent_code rides along so a council resolves to its region without another
    // query: it is what lets a region filter catch council-owned work.
    const ownerIds = [...new Set(projects.map(p => p.owner_entity_id).filter(Boolean))];
    const ownersById = new Map();
    if (ownerIds.length > 0) {
        const [rows] = await pool.query(
            `SELECT e.id, e.type, e.code, e.name_en, e.name_fr, pe.code AS parent_code
             FROM gov_entities e
             LEFT JOIN gov_entities pe ON e.parent_id = pe.id
             WHERE e.id IN (${ownerIds.map(() => '?').join(',')})`,
            ownerIds
        );
        for (const row of rows) ownersById.set(row.id, row);
    }

    const projectIds = projects.map(p => p.id);
    const areasByProject = new Map();
    const [areaRows] = await pool.query(
        `SELECT pa.project_id, e.id, e.type, e.code, e.name_en, e.name_fr, pe.code AS parent_code
         FROM project_areas pa
         JOIN gov_entities e ON pa.entity_id = e.id
         LEFT JOIN gov_entities pe ON e.parent_id = pe.id
         WHERE pa.project_id IN (${projectIds.map(() => '?').join(',')})
         ORDER BY e.name_en`,
        projectIds
    );
    for (const row of areaRows) {
        if (!areasByProject.has(row.project_id)) areasByProject.set(row.project_id, []);
        const { project_id, ...entity } = row;
        areasByProject.get(row.project_id).push(entity);
    }

    for (const project of projects) {
        project.ownerEntity = ownersById.get(project.owner_entity_id) || null;
        project.areas = areasByProject.get(project.id) || [];
    }

    return projects;
};

/** Multipart forms deliver the area list as a JSON string; JSON bodies as an array. */
const parseAreaIds = (raw) => {
    if (raw === undefined || raw === null || raw === '') return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [String(raw)];
    }
};

/**
 * resolveOwnershipAndAreas
 *
 * THE RULES, from the architecture plan:
 *   council owner   covers exactly its own council, nothing else
 *   ministry owner  covers one or more regions, or the national root alone
 *
 * Everything else is a request shaped wrong, rejected before anything writes.
 */
const resolveOwnershipAndAreas = async (ownerEntityId, rawAreaIds) => {
    const [ownerRows] = await pool.query(
        'SELECT id, type, code FROM gov_entities WHERE id = ?',
        [ownerEntityId]
    );
    if (ownerRows.length === 0) throw badRequest('Owner entity does not exist');

    const owner = ownerRows[0];
    if (owner.type !== 'COUNCIL' && owner.type !== 'MINISTRY') {
        throw badRequest('A project is owned by a council or a ministry');
    }

    const requested = parseAreaIds(rawAreaIds);

    if (owner.type === 'COUNCIL') {
        const foreign = requested.filter(id => id !== owner.id);
        if (foreign.length > 0) {
            throw badRequest('A council project covers its own council only');
        }
        return { owner, areaIds: [owner.id] };
    }

    if (requested.length === 0) {
        throw badRequest('A ministerial project must state the regions it covers, or the national root');
    }

    const [areaRows] = await pool.query(
        `SELECT id, type, code FROM gov_entities WHERE id IN (${requested.map(() => '?').join(',')})`,
        requested
    );
    if (areaRows.length !== requested.length) {
        throw badRequest('An area entity does not exist');
    }

    const national = areaRows.filter(a => a.type === 'NATIONAL');
    const nonRegion = areaRows.filter(a => a.type !== 'REGION' && a.type !== 'NATIONAL');
    if (nonRegion.length > 0) {
        throw badRequest('Ministerial project areas are regions, or the national root');
    }
    if (national.length > 0 && areaRows.length > 1) {
        throw badRequest('A national project covers the national root alone');
    }

    return { owner, areaIds: areaRows.map(a => a.id) };
};

/**
 * assertAssignableContractor
 *
 * The G2 rule from the plan: only a contractor VERIFIED by the Ministry of
 * Public Works can be put in charge of public works. An unverified assignment
 * is refused with the reason, not silently allowed and flagged later.
 */
const assertAssignableContractor = async (contractorId) => {
    const [rows] = await pool.query(
        `SELECT u.id, u.role, cp.status
         FROM users u
         LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
         WHERE u.id = ?`,
        [contractorId]
    );
    if (rows.length === 0) throw badRequest('Assigned contractor does not exist');
    if (rows[0].role !== 'CONTRACTOR') throw badRequest('Assigned user is not a contractor');
    if (rows[0].status !== 'VERIFIED') {
        throw badRequest('This contractor has not been verified by the Ministry of Public Works yet');
    }
};

/** Current area codes of a project, for the audit log's old value. */
const getAreaCodes = async (projectId, db = pool) => {
    const [rows] = await db.query(
        `SELECT e.code FROM project_areas pa JOIN gov_entities e ON pa.entity_id = e.id
         WHERE pa.project_id = ? ORDER BY e.code`,
        [projectId]
    );
    return rows.map(r => r.code);
};

/** Fetches one project row (with contractor name) or null. */
const findProjectRow = async (id) => {
    const [rows] = await pool.query(
        `SELECT p.*, u.name AS contractorName
         FROM projects p
         LEFT JOIN users u ON p.contractor_id = u.id
         WHERE p.id = ?`,
        [id]
    );
    return rows[0] || null;
};

/**
 * saveImages
 *
 * Persists uploaded files (already on Cloudinary via multer) and any Base64
 * payloads from the legacy JSON path. Returns how many were stored.
 *
 * `db` is the query executor — pass the transaction connection when inside one, otherwise
 * these inserts run outside the transaction and cannot be rolled back with it.
 */
const saveImages = async ({ projectId, files = [], base64Images = [], markFirstAsCover = false, db = pool }) => {
    let stored = 0;

    for (const file of files) {
        const imageUrl = file.path || file.secure_url;
        if (!imageUrl) continue;
        await db.query(
            'INSERT INTO project_images (id, project_id, image_url, is_main_cover) VALUES (?, ?, ?, ?)',
            [randomUUID(), projectId, imageUrl, markFirstAsCover && stored === 0]
        );
        stored++;
    }

    for (const base64 of base64Images) {
        const imageUrl = await saveBase64Image(base64, 'projects');
        if (!imageUrl) continue;
        await db.query(
            'INSERT INTO project_images (id, project_id, image_url, is_main_cover) VALUES (?, ?, ?, ?)',
            [randomUUID(), projectId, imageUrl, markFirstAsCover && stored === 0]
        );
        stored++;
    }

    return stored;
};

// ---------------------------------------------------------------------------
// AUDIT LOG
// ---------------------------------------------------------------------------

/**
 * Renders a stored value for the log. Dates become ISO days and money/percentages become
 * plain strings, so a row stays readable years later regardless of driver type mapping.
 */
const renderValue = (value) => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value);
};

/**
 * diffFields
 *
 * Compares the stored row against the validated updates and returns only the fields that
 * ACTUALLY changed. Logging a no-op edit would bury the real changes in noise, and a
 * history full of "progress 30 -> 30" trains readers to stop reading it.
 *
 * Comparison is on rendered strings because the driver returns DECIMAL as Number, DATE as
 * Date and everything else as strings, while updates arrive as coerced numbers or strings.
 */
const diffFields = (project, updates) => {
    const changes = [];

    for (const [field, nextValue] of Object.entries(updates)) {
        const column = COLUMN_BY_FIELD[field];
        const previous = renderValue(project[column]);
        const next = renderValue(nextValue);

        if (previous !== next) {
            changes.push({ field, oldValue: previous, newValue: next });
        }
    }

    return changes;
};

/**
 * recordChanges
 *
 * Appends to the immutable log. `tx` is required, not optional: a log row written outside
 * the transaction that changed the figure could survive a rollback, or be lost while the
 * change committed. Either way the record would lie.
 *
 * actor_name and actor_role are stored, not referenced, so renaming or deleting a user
 * cannot retroactively rewrite who did what.
 */
const recordChanges = async ({ tx, projectId, actor, changes }) => {
    if (!changes || changes.length === 0) return 0;

    for (const change of changes) {
        await tx.query(
            `INSERT INTO project_changes
                (id, project_id, actor_id, actor_name, actor_role, field, old_value, new_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                randomUUID(),
                projectId,
                actor?.id || null,
                actor?.name || 'Unknown',
                actor?.role || 'UNKNOWN',
                change.field,
                change.oldValue,
                change.newValue
            ]
        );
    }

    return changes.length;
};

/**
 * listProjectChanges
 * Public read of a project's change history, newest first.
 */
export const listProjectChanges = async (projectId, limit = 50) => {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const [rows] = await pool.query(
        `SELECT id, field, old_value, new_value, actor_name, actor_role, changed_at
         FROM project_changes
         WHERE project_id = ?
         ORDER BY changed_at DESC, id DESC
         LIMIT ?`,
        [projectId, safeLimit]
    );

    return rows;
};

/**
 * collectBase64Images
 *
 * The contractor dashboard sends `images` containing BOTH already-stored URLs and
 * newly captured Base64 photos; the older path used a separate `newImages` key.
 * Only genuine Base64 payloads are new — re-saving an http URL would duplicate the row.
 */
const collectBase64Images = (body) => {
    const candidates = [
        ...(Array.isArray(body.newImages) ? body.newImages : []),
        ...(Array.isArray(body.images) ? body.images : [])
    ];
    return candidates.filter(value => typeof value === 'string' && value.startsWith('data:image'));
};

// ---------------------------------------------------------------------------
// USE CASES
// ---------------------------------------------------------------------------

/**
 * listProjects
 * Public read. Supports status filter, text search and pagination.
 */
export const listProjects = async ({ status, search, flagged, entityIds, limit = 10, page = 1 } = {}) => {
    // Clamp pagination so a bad/hostile query can't ask for the entire table.
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    let query = `
        SELECT p.*, u.name AS contractorName
        FROM projects p
        LEFT JOIN users u ON p.contractor_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
        if (!PROJECT_STATUSES.includes(status)) throw badRequest('Unknown status filter');
        query += ' AND p.status = ?';
        params.push(status);
    }

    if (search) {
        query += ' AND (p.title LIKE ? OR p.location LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    // Filtering in the database rather than client-side: on a metered mobile connection,
    // downloading every project to find the few that matter is the difference between a
    // usable query and an unaffordable one.
    //   ?flagged=true      any flag (matches what the badges show)
    //   ?flagged=critical  money gone or unaccounted for
    if (flagged === 'critical') {
        query += ` AND ${CRITICAL_SQL}`;
    } else if (flagged === 'true' || flagged === true) {
        query += ` AND ${FLAGGED_SQL}`;
    }

    // Scope to an entity and, for a region, its councils: owned by any of them, or
    // covering any of them as an area. Used by the public entity pages.
    if (Array.isArray(entityIds) && entityIds.length > 0) {
        const marks = entityIds.map(() => '?').join(',');
        query += ` AND (p.owner_entity_id IN (${marks})
            OR EXISTS (SELECT 1 FROM project_areas pa WHERE pa.project_id = p.id AND pa.entity_id IN (${marks})))`;
        params.push(...entityIds, ...entityIds);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, offset);

    const [projects] = await pool.query(query, params);
    await attachImages(projects);
    await attachEntities(projects);
    // Flags need the images array, so this must follow attachImages.
    return attachFlags(projects);
};

/**
 * getProjectDetail
 * Public read of a single project, including its images and timeline.
 */
export const getProjectDetail = async (id) => {
    const project = await findProjectRow(id);
    if (!project) throw notFound('Project not found');

    await attachImages([project]);
    await attachEntities([project]);

    const [updates] = await pool.query(
        'SELECT * FROM project_updates WHERE project_id = ? ORDER BY update_date DESC',
        [project.id]
    );
    project.updates = updates;

    // The system-written record of what actually changed, alongside the contractor-written
    // narrative above it. Capped so a heavily edited project cannot bloat the response.
    project.changes = await listProjectChanges(project.id, 50);

    attachFlags([project]);

    return project;
};

/**
 * createProject
 * Admin-only. Validates the definition, then stores it.
 */
export const createProject = async ({ actor = null, body = {}, files = [] }) => {
    const title = validateField('title', body.title);
    const description = validateField('description', body.description);
    const location = validateField('location', body.location);
    const region = validateField('region', body.region);
    const budget = body.budget === undefined ? 0 : validateField('budget', body.budget);
    const status = body.status === undefined ? 'Planned' : validateField('status', body.status);
    const contractorId = validateField('contractorId', body.contractorId);
    const startDate = validateField('startDate', body.startDate);
    const completionDate = validateField('completionDate', body.completionDate);

    // A project must be assigned to a real contractor — otherwise nobody is
    // accountable for it and it can never be updated.
    if (contractorId) {
        await assertAssignableContractor(contractorId);
    }

    // Hierarchy placement is optional during the transition: a request without an
    // owner behaves exactly as before, so nothing existing breaks. An entity
    // administrator does not get the choice: whatever the request says, their
    // projects belong to their institution.
    const ownerEntityId = actor && actor.role === 'ENTITY_ADMIN'
        ? actor.entity_id
        : body.ownerEntityId;

    let ownership = null;
    if (ownerEntityId) {
        ownership = await resolveOwnershipAndAreas(ownerEntityId, body.areaEntityIds);
    }

    // Generate the id here rather than with SQL UUID(). Doing it in the database
    // meant we had to re-SELECT the row by title afterwards to learn its id —
    // which returns the WRONG row whenever two projects share a title.
    const projectId = randomUUID();

    // The project and its photos are one unit. A failure partway through the image loop
    // previously left a published project carrying only some of its evidence — in a
    // transparency product that is a quietly wrong public record, not a cosmetic glitch.
    await withTransaction(async (tx) => {
        await tx.query(
            `INSERT INTO projects
                (id, title, description, location, region, budget, status, contractor_id, start_date, completion_date, owner_entity_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectId, title, description, location, region, budget, status, contractorId, startDate, completionDate, ownership ? ownership.owner.id : null]
        );

        if (ownership) {
            for (const areaId of ownership.areaIds) {
                await tx.query(
                    'INSERT INTO project_areas (project_id, entity_id) VALUES (?, ?)',
                    [projectId, areaId]
                );
            }
        }

        await saveImages({
            projectId,
            files,
            base64Images: collectBase64Images(body),
            markFirstAsCover: true,
            db: tx
        });
    });

    // Return the stored row, not the request body — so clients and socket
    // listeners receive the real persisted state.
    return getProjectDetail(projectId);
};

/**
 * updateProject
 * Used by contractors (own projects) and admins (any project).
 */
export const updateProject = async ({ actor, projectId, body = {}, files = [] }) => {
    const project = await findProjectRow(projectId);
    if (!project) throw notFound('Project not found');

    // Rule enforced here, in one place, for every caller.
    assertCanEditProject(actor, project);

    const editableFields = actor.role === 'CONTRACTOR'
        ? CONTRACTOR_EDITABLE_FIELDS
        : ADMIN_EDITABLE_FIELDS;

    // Whitelist: silently ignore anything the caller is not allowed to set,
    // rather than trusting the shape of the request body.
    const updates = {};
    for (const field of editableFields) {
        if (body[field] !== undefined && body[field] !== null) {
            updates[field] = validateField(field, body[field]);
        }
    }

    if (updates.contractorId) {
        await assertAssignableContractor(updates.contractorId);
    }

    const fields = Object.keys(updates);
    const base64Images = collectBase64Images(body);
    const hasNewImages = files.length > 0 || base64Images.length > 0;

    // Hierarchy placement: contractors report figures, they do not move a project
    // between owners. An entity administrator may redraw areas but cannot hand
    // the project to another institution. Validated before the transaction opens.
    let ownership = null;
    if (actor.role !== 'CONTRACTOR' && body.ownerEntityId) {
        ownership = await resolveOwnershipAndAreas(body.ownerEntityId, body.areaEntityIds);

        if (actor.role === 'ENTITY_ADMIN' && ownership.owner.id !== actor.entity_id) {
            throw forbidden('You cannot move a project to another institution');
        }
    }

    if (fields.length === 0 && !hasNewImages && !ownership) {
        throw badRequest('No valid fields to update');
    }

    // The row update and its audit rows are ONE unit. If the log write fails the figure
    // change is rolled back with it — a changed number with no record of who changed it is
    // worse than a rejected edit, because it is indistinguishable from the original value.
    await withTransaction(async (tx) => {
        if (fields.length > 0) {
            const changes = diffFields(project, updates);

            const assignments = fields.map(field => `${COLUMN_BY_FIELD[field]} = ?`).join(', ');
            const params = fields.map(field => updates[field]);
            params.push(projectId);
            await tx.query(`UPDATE projects SET ${assignments} WHERE id = ?`, params);

            await recordChanges({ tx, projectId, actor, changes });
        }

        if (ownership) {
            // The move itself is a figure change: who runs a project and where it
            // happens are exactly the facts an auditor reads back. Old values are
            // captured inside the transaction so the log can never skew.
            const oldAreaCodes = await getAreaCodes(projectId, tx);
            const [oldOwnerRows] = await tx.query(
                'SELECT e.code FROM projects p JOIN gov_entities e ON p.owner_entity_id = e.id WHERE p.id = ?',
                [projectId]
            );
            const oldOwnerCode = oldOwnerRows.length > 0 ? oldOwnerRows[0].code : null;

            await tx.query('UPDATE projects SET owner_entity_id = ? WHERE id = ?', [
                ownership.owner.id, projectId,
            ]);
            await tx.query('DELETE FROM project_areas WHERE project_id = ?', [projectId]);
            for (const areaId of ownership.areaIds) {
                await tx.query('INSERT INTO project_areas (project_id, entity_id) VALUES (?, ?)', [
                    projectId, areaId,
                ]);
            }

            const newAreaCodes = await getAreaCodes(projectId, tx);
            const entityChanges = [];
            if (oldOwnerCode !== ownership.owner.code) {
                entityChanges.push({ field: 'ownerEntity', oldValue: oldOwnerCode, newValue: ownership.owner.code });
            }
            if (oldAreaCodes.join(',') !== newAreaCodes.join(',')) {
                entityChanges.push({ field: 'areas', oldValue: oldAreaCodes.join(', ') || null, newValue: newAreaCodes.join(', ') });
            }
            await recordChanges({ tx, projectId, actor, changes: entityChanges });
        }

        if (hasNewImages) {
            // A project only ever needs a cover assigned if it does not already have one,
            // otherwise added photos join the gallery without displacing the cover.
            const [[{ existing }]] = await tx.query(
                'SELECT COUNT(*) AS existing FROM project_images WHERE project_id = ?',
                [projectId]
            );

            const stored = await saveImages({
                projectId,
                files,
                base64Images,
                markFirstAsCover: existing === 0,
                db: tx
            });

            // Photos are evidence, so adding them is itself an auditable act.
            if (stored > 0) {
                await recordChanges({
                    tx,
                    projectId,
                    actor,
                    changes: [{
                        field: 'images',
                        oldValue: String(existing),
                        newValue: String(existing + stored)
                    }]
                });
            }
        }
    });

    return getProjectDetail(projectId);
};

/**
 * deleteProject
 * Admin-only. Images, comments and timeline rows cascade via foreign keys.
 */
export const deleteProject = async ({ actor, projectId }) => {
    const project = await findProjectRow(projectId);
    if (!project) throw notFound('Project not found');

    // Same scope rule as editing: an institution deletes only its own record,
    // and the deletion still lands in the audit log either way.
    assertCanEditProject(actor, project);

    // The audit log no longer cascades with the project (migration 004), so the history
    // survives — and the deletion itself is recorded as the final entry. Removing a project
    // is the most consequential act available to an admin; it should not be the one thing
    // that leaves no trace.
    await withTransaction(async (tx) => {
        await recordChanges({
            tx,
            projectId,
            actor,
            changes: [{
                field: 'project',
                oldValue: project.title,
                newValue: 'deleted'
            }]
        });

        await tx.query('DELETE FROM projects WHERE id = ?', [projectId]);
    });

    return { id: projectId };
};

/**
 * addTimelineUpdate
 * Appends to the project's public history. Same ownership rule as editing —
 * a contractor cannot post progress notes onto someone else's project.
 */
export const addTimelineUpdate = async ({ actor, projectId, message, date }) => {
    const project = await findProjectRow(projectId);
    if (!project) throw notFound('Project not found');

    assertCanEditProject(actor, project);

    const text = requireText(message, 'Update message');

    await pool.query(
        'INSERT INTO project_updates (id, project_id, message, author_name, update_date) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), projectId, text, actor.name, date || new Date().toISOString().split('T')[0]]
    );

    return getProjectDetail(projectId);
};
