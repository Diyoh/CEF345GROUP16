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

    if (actor.role === 'ADMIN') return; // Admins oversee every project.

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
export const listProjects = async ({ status, search, limit = 10, page = 1 } = {}) => {
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

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, offset);

    const [projects] = await pool.query(query, params);
    return attachImages(projects);
};

/**
 * getProjectDetail
 * Public read of a single project, including its images and timeline.
 */
export const getProjectDetail = async (id) => {
    const project = await findProjectRow(id);
    if (!project) throw notFound('Project not found');

    await attachImages([project]);

    const [updates] = await pool.query(
        'SELECT * FROM project_updates WHERE project_id = ? ORDER BY update_date DESC',
        [project.id]
    );
    project.updates = updates;

    return project;
};

/**
 * createProject
 * Admin-only. Validates the definition, then stores it.
 */
export const createProject = async ({ body = {}, files = [] }) => {
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
        const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [contractorId]);
        if (rows.length === 0) throw badRequest('Assigned contractor does not exist');
        if (rows[0].role !== 'CONTRACTOR') throw badRequest('Assigned user is not a contractor');
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
                (id, title, description, location, region, budget, status, contractor_id, start_date, completion_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectId, title, description, location, region, budget, status, contractorId, startDate, completionDate]
        );

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
        const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [updates.contractorId]);
        if (rows.length === 0) throw badRequest('Assigned contractor does not exist');
        if (rows[0].role !== 'CONTRACTOR') throw badRequest('Assigned user is not a contractor');
    }

    const fields = Object.keys(updates);
    if (fields.length > 0) {
        const assignments = fields.map(field => `${COLUMN_BY_FIELD[field]} = ?`).join(', ');
        const params = fields.map(field => updates[field]);
        params.push(projectId);
        await pool.query(`UPDATE projects SET ${assignments} WHERE id = ?`, params);
    }

    const base64Images = collectBase64Images(body);
    const hasNewImages = files.length > 0 || base64Images.length > 0;

    if (hasNewImages) {
        // A project only ever needs a cover assigned if it does not already have one,
        // otherwise added photos join the gallery without displacing the cover.
        const [[{ existing }]] = await pool.query(
            'SELECT COUNT(*) AS existing FROM project_images WHERE project_id = ?',
            [projectId]
        );

        await saveImages({
            projectId,
            files,
            base64Images,
            markFirstAsCover: existing === 0
        });
    }

    if (fields.length === 0 && !hasNewImages) {
        throw badRequest('No valid fields to update');
    }

    return getProjectDetail(projectId);
};

/**
 * deleteProject
 * Admin-only. Images, comments and timeline rows cascade via foreign keys.
 */
export const deleteProject = async (projectId) => {
    const project = await findProjectRow(projectId);
    if (!project) throw notFound('Project not found');

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
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
