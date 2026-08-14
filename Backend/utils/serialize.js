/**
 * OUTPUT SERIALIZATION
 *
 * THE RULE: everything leaving this backend uses camelCase keys.
 *
 * WHY THIS EXISTS:
 * MySQL columns are snake_case (`contractor_id`, `author_name`, `is_used`). Controllers
 * returned raw driver rows, so the API spoke snake_case while the entire frontend was
 * written against a camelCase mock (Frontend/src/data.js). Every disagreement was a
 * SILENT render failure — no error, no warning, just a field reading `undefined`:
 *
 *   - citizen reports never appeared on the public project page (project_id vs projectId)
 *   - report authors rendered blank (author_name vs authorName)
 *   - used access codes displayed as "Active" (is_used vs isUsed)
 *   - the contractor dropdown was empty when editing (contractor_id vs contractorId)
 *   - update-history dates rendered "Not set" (update_date vs date)
 *
 * Patching each call site would have left the trap armed for the next endpoint. Converting
 * once, at the boundary, removes the entire class.
 *
 * Applied globally by the res.json override in index.js, and explicitly at socket emit
 * sites (those do not pass through res.json).
 */

/** `author_name` -> `authorName`. Leaves already-camel keys untouched. */
const toCamelCase = (key) => key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

/**
 * camelizeKeys
 * Deep-converts object keys. Arrays are mapped; Dates, Buffers and primitives pass through
 * untouched so date and binary values are not destructured into their properties.
 */
export const camelizeKeys = (value) => {
    if (Array.isArray(value)) return value.map(camelizeKeys);

    // Dates and Buffers are objects but must survive intact.
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date || Buffer.isBuffer(value)) return value;

    const out = {};
    for (const [key, val] of Object.entries(value)) {
        out[toCamelCase(key)] = camelizeKeys(val);
    }
    return out;
};

/**
 * serializeResponse
 * Express middleware. Wraps res.json so every response body is camelCased on the way out,
 * including responses from endpoints that do not exist yet.
 */
export const serializeResponse = (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => originalJson(camelizeKeys(body));
    next();
};
