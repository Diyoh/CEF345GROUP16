/**
 * PUBLIC OPEN-DATA API
 *
 * A stable, uncredentialed, read-only view of the project register, plus a CSV export.
 *
 * WHY:
 * A transparency platform that can only be read through its own website is a website, not
 * infrastructure. Journalists, NGOs and researchers cannot audit what they cannot download,
 * and the strongest use of this data — cross-referencing budgets against a ministry's own
 * published figures — is work nobody can do inside our UI. The data is already public, so
 * publishing it properly costs almost nothing and multiplies who can act on it.
 *
 * CONTRACT RULES (this is published; other people's code will depend on it):
 *  - Field names here are DECOUPLED from the database columns. Renaming a column must not
 *    break someone's script, so the mapping is explicit in PROJECT_FIELDS below.
 *  - Money is reported in XAF, the ISO code, not the "FCFA" used in the interface. Machine
 *    contexts get the machine name.
 *  - Percentages are plain numbers, never strings with a % sign.
 *  - Dates are ISO-8601 (YYYY-MM-DD), never localised.
 *  - Additive changes only. New fields may appear; existing ones must not change meaning.
 */

import * as projectService from '../services/projectService.js';
import { sendError } from '../utils/AppError.js';
import { toCsv } from '../utils/csv.js';

/** Hard ceiling on one response, so an open endpoint cannot be used to hammer the database. */
const MAX_PAGE_SIZE = 200;
const CSV_MAX_ROWS = 5000;

/**
 * The published field mapping. `key` is what consumers see; `from` reads the internal row.
 * Changing a `key` is a BREAKING change to somebody else's script.
 */
const PROJECT_FIELDS = [
    { key: 'id', header: 'id', from: (p) => p.id },
    { key: 'title', header: 'title', from: (p) => p.title },
    { key: 'status', header: 'status', from: (p) => p.status },
    { key: 'region', header: 'region', from: (p) => p.region },
    { key: 'location', header: 'location', from: (p) => p.location },
    { key: 'contractor', header: 'contractor', from: (p) => p.contractorName || null },
    { key: 'budget_xaf', header: 'budget_xaf', from: (p) => Number(p.budget) || 0 },
    { key: 'spent_xaf', header: 'spent_xaf', from: (p) => Number(p.spent) || 0 },
    { key: 'budget_spent_percent', header: 'budget_spent_percent', from: (p) => p.health.burn },
    { key: 'work_completed_percent', header: 'work_completed_percent', from: (p) => p.health.progress },
    // The headline number: points of build minus points of spend. Negative means money is
    // moving faster than work. This single column is what makes the export worth publishing.
    { key: 'variance_points', header: 'variance_points', from: (p) => p.health.variance },
    { key: 'flags', header: 'flags', from: (p) => p.flags.map((f) => f.code).join(' ') },
    { key: 'start_date', header: 'start_date', from: (p) => isoDate(p.startDate || p.start_date) },
    { key: 'completion_date', header: 'completion_date', from: (p) => isoDate(p.completionDate || p.completion_date) },
    { key: 'last_updated', header: 'last_updated', from: (p) => isoDateTime(p.updatedAt || p.updated_at) },
    { key: 'photo_count', header: 'photo_count', from: (p) => (Array.isArray(p.images) ? p.images.length : 0) },
];

const isoDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const isoDateTime = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const toPublicProject = (project) => {
    const out = {};
    for (const field of PROJECT_FIELDS) out[field.key] = field.from(project);
    return out;
};

/**
 * GET /api/v1/public
 * Self-describing index. An open API that requires you to read our source code to use it is
 * not open in any way that matters.
 */
export const getIndex = (req, res) => {
    const base = `${req.protocol}://${req.get('host')}/api/v1/public`;

    res.json({
        success: true,
        data: {
            name: 'BuildRight Cameroon — open infrastructure data',
            description:
                'Public register of government infrastructure projects: budget, spend, reported progress and automatically derived anomaly flags.',
            licence: 'Open data. Attribution appreciated, not required.',
            authentication: 'None. This API is read-only and public.',
            currency: 'XAF (CFA franc BEAC)',
            dateFormat: 'ISO-8601',
            endpoints: [
                { method: 'GET', path: `${base}/projects`, description: 'Projects as JSON.', query: { region: 'entity code (NW) or region name', ministry: 'owner ministry code (MINTP)', council: 'council code (NW-BAMENDA-I)', status: 'Planned|Ongoing|Stalled|Completed', flagged: 'true | critical', search: 'match title or town', limit: `1-${MAX_PAGE_SIZE}, default 50`, page: '1-based' } },
                { method: 'GET', path: `${base}/projects.csv`, description: `The same data as CSV, up to ${CSV_MAX_ROWS} rows. Accepts the same query parameters.` },
                { method: 'GET', path: `${base}/stats`, description: 'National totals and counts by status.' },
            ],
            fields: PROJECT_FIELDS.map((f) => f.key),
            notes: [
                'variance_points = work_completed_percent - budget_spent_percent. Negative means spending is running ahead of building.',
                'flags are derived from the figures, never self-reported. Space-separated codes.',
                'Progress is reported by the contractor; financial figures come from government records.',
            ],
        },
    });
};

/** Shared query parsing so JSON and CSV cannot drift apart. */
const readQuery = (req, defaultLimit) => ({
    status: req.query.status,
    search: req.query.search,
    flagged: req.query.flagged,
    region: req.query.region,
    ministry: req.query.ministry,
    council: req.query.council,
    limit: Math.min(Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1), defaultLimit),
    page: Math.max(parseInt(req.query.page, 10) || 1, 1),
});

/**
 * Hierarchy filtering happens here rather than in the service: it is only meaningful for
 * the open API, and pushing every consumer's convenience filter into the core query would
 * accumulate into an unmaintainable WHERE clause.
 *
 * `region` accepts either the entity code (NW) or the legacy free-text name (North West),
 * because links published before the hierarchy existed must keep working.
 */
const normalise = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const applyEntityFilters = (projects, { region, ministry, council }) => {
    let out = projects;

    if (ministry) {
        const code = String(ministry).toUpperCase();
        out = out.filter((p) => p.ownerEntity && p.ownerEntity.type === 'MINISTRY' && p.ownerEntity.code === code);
    }

    if (council) {
        const code = String(council).toUpperCase();
        out = out.filter((p) =>
            (p.ownerEntity && p.ownerEntity.code === code) ||
            (Array.isArray(p.areas) && p.areas.some((a) => a.code === code))
        );
    }

    if (region) {
        const code = String(region).toUpperCase();
        const legacy = normalise(region);
        out = out.filter((p) =>
            (Array.isArray(p.areas) && p.areas.some((a) => a.code === code || a.parent_code === code)) ||
            (p.ownerEntity && p.ownerEntity.parent_code === code) ||
            normalise(p.region) === legacy
        );
    }

    return out;
};

/** GET /api/v1/public/projects */
export const getProjects = async (req, res) => {
    try {
        const query = readQuery(req, MAX_PAGE_SIZE);
        const projects = await projectService.listProjects(query);
        const filtered = applyEntityFilters(projects, query);

        res.json({
            success: true,
            meta: {
                count: filtered.length,
                page: query.page,
                limit: query.limit,
                generatedAt: new Date().toISOString(),
            },
            data: filtered.map(toPublicProject),
        });
    } catch (error) {
        sendError(res, error);
    }
};

/** GET /api/v1/public/projects.csv */
export const getProjectsCsv = async (req, res) => {
    try {
        const query = readQuery(req, CSV_MAX_ROWS);
        const projects = await projectService.listProjects({ ...query, limit: CSV_MAX_ROWS });
        const filtered = applyEntityFilters(projects, query);

        const csv = toCsv(
            PROJECT_FIELDS.map((f) => ({ key: f.key, header: f.header })),
            filtered.map(toPublicProject)
        );

        const stamp = new Date().toISOString().split('T')[0];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="buildright-projects-${stamp}.csv"`);
        // Encourage caching: this data changes slowly and the audience is on metered mobile.
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(csv);
    } catch (error) {
        sendError(res, error);
    }
};

/** GET /api/v1/public/stats */
export const getStats = async (req, res) => {
    try {
        const projects = await projectService.listProjects({ limit: CSV_MAX_ROWS });

        const totals = projects.reduce(
            (acc, p) => {
                acc.totalBudgetXaf += Number(p.budget) || 0;
                acc.totalSpentXaf += Number(p.spent) || 0;
                acc.byStatus[p.status] = (acc.byStatus[p.status] || 0) + 1;
                if (p.flags.length > 0) acc.flaggedProjects += 1;
                if (p.flags.some((f) => f.severity === 'critical')) acc.criticalProjects += 1;
                return acc;
            },
            {
                totalProjects: projects.length,
                totalBudgetXaf: 0,
                totalSpentXaf: 0,
                flaggedProjects: 0,
                criticalProjects: 0,
                byStatus: {},
            }
        );

        res.json({
            success: true,
            meta: { generatedAt: new Date().toISOString() },
            data: totals,
        });
    } catch (error) {
        sendError(res, error);
    }
};
