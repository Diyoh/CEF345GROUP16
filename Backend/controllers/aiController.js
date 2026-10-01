/**
 * AI CONTROLLER
 *
 * Public endpoints for the optional AI features. Status tells the frontend
 * whether to show them at all; search maps a question to project filters.
 */

import { sendError } from '../utils/AppError.js';
import { getProvider, AiUnavailableError } from '../services/ai/providers.js';
import { interpretQuery } from '../services/ai/projectSearch.js';

// Availability means a network round trip to Ollama; the answer barely changes.
const STATUS_CACHE_MS = 30_000;
let statusCache = { at: 0, value: null };

export const resetStatusCacheForTests = () => {
    statusCache = { at: 0, value: null };
};

/** GET /api/v1/ai/status */
export const getStatus = async (_req, res) => {
    try {
        if (!statusCache.value || Date.now() - statusCache.at > STATUS_CACHE_MS) {
            const provider = getProvider();
            const available = await provider.isAvailable().catch(() => false);
            statusCache = {
                at: Date.now(),
                value: { enabled: available, provider: provider.name, model: available ? provider.model : null },
            };
        }
        res.json({ success: true, data: statusCache.value });
    } catch (error) {
        sendError(res, error);
    }
};

/** POST /api/v1/ai/search  { query, locale } */
export const search = async (req, res) => {
    try {
        const data = await interpretQuery({ query: req.body?.query, locale: req.body?.locale });
        res.json({ success: true, data });
    } catch (error) {
        if (error instanceof AiUnavailableError) {
            // The reason is logged for the operator; the public gets a plain message.
            console.warn(`[ai] ${error.message}`);
            statusCache = { at: 0, value: null };
            return res.status(503).json({ success: false, error: 'The AI assistant is unavailable right now. Use the filters instead.' });
        }
        sendError(res, error);
    }
};
