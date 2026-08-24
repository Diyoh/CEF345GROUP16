/**
 * FRONTEND API SERVICE
 * 
 * This module acts as the bridge between the Frontend (React) and the Backend (Node.js/Express).
 * It abstracts all HTTP requests (GET, POST, PUT, DELETE) so that components don't need to use 'fetch' directly.
 * 
 * [SECURITY NOTE]
 * Authentication is handled via HttpOnly Cookies. This means:
 * 1. We do NOT manually store tokens in localStorage.
 * 2. We do NOT manually attach 'Authorization: Bearer' headers.
 * 3. We MUST set `credentials: 'include'` in every fetch request. This tells the browser to automatically
 *    send the 'token' cookie along with the request to the backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * SOCKET_URL
 * Socket.io connects to the server ROOT, not to the /api/v1 prefix, so we strip the
 * API path off BASE_URL. Deriving it means there is one URL to configure, and the
 * real-time connection can never be left pointing at localhost in a deployed build.
 * Override explicitly with VITE_SOCKET_URL if the socket lives elsewhere.
 */
export const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * PUBLIC_API_URL
 * The open, uncredentialed dataset. Separate from the app API because it is a published
 * contract other people's code depends on — snake_case fields, no auth, any origin.
 */
export const PUBLIC_API_URL = `${BASE_URL}/public`;

/**
 * csvExportUrl
 * Builds a download link carrying the user's current filters, so what they export is what
 * they were looking at rather than the whole register.
 */
export const csvExportUrl = (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'All') params.set(key, value);
    });
    const query = params.toString();
    return `${PUBLIC_API_URL}/projects.csv${query ? `?${query}` : ''}`;
};

// Standard headers for sending JSON data
const DEFAULT_HEADERS = {
    'Content-Type': 'application/json'
};

/**
 * Helper: getOptions
 * Constructs the configuration object for the fetch API.
 * 
 * @param {string} method - HTTP method (GET, POST, PATCH, etc.)
 * @param {object} body - Data payload to send (optional)
 * @returns {object} - The fetch options object
 */
const getOptions = (method = 'GET', body = null) => {
    const opts = {
        method,
        headers: { ...DEFAULT_HEADERS },
        credentials: 'include', // [CRITICAL] Enables sending/receiving Cookies for Auth
    };

    if (body instanceof FormData) {
        // [FIX] Do NOT set Content-Type for FormData; browser sets it with boundary
        delete opts.headers['Content-Type'];
        opts.body = body;
    } else if (body) {
        opts.body = JSON.stringify(body);
    }
    return opts;
};

export const api = {
    // Auth
    login: async (email, password, role) => {
        const res = await fetch(`${BASE_URL}/auth/login`, getOptions('POST', { email, password, role }));
        return await res.json();
    },

    register: async (name, email, password, accessCode) => {
        const res = await fetch(`${BASE_URL}/auth/register`, getOptions('POST', { name, email, password, accessCode }));
        return await res.json();
    },

    getMe: async () => {
        const res = await fetch(`${BASE_URL}/auth/me`, getOptions('GET'));
        return await res.json();
    },

    logout: async () => {
        const res = await fetch(`${BASE_URL}/auth/logout`, getOptions('POST'));
        return await res.json();
    },

    changePassword: async (currentPassword, newPassword) => {
        const res = await fetch(`${BASE_URL}/auth/change-password`, getOptions('PUT', { currentPassword, newPassword }));
        return await res.json();
    },

    // Projects
    getProjects: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${BASE_URL}/projects?${query}`, getOptions('GET'));
        return await res.json();
    },

    getProjectById: async (id) => {
        const res = await fetch(`${BASE_URL}/projects/${id}`, getOptions('GET'));
        return await res.json();
    },

    createProject: async (projectData) => {
        const res = await fetch(`${BASE_URL}/projects`, getOptions('POST', projectData));
        return await res.json();
    },

    updateProject: async (id, data) => {
        const res = await fetch(`${BASE_URL}/projects/${id}`, getOptions('PATCH', data));
        return await res.json();
    },

    deleteProject: async (id) => {
        const res = await fetch(`${BASE_URL}/projects/${id}`, getOptions('DELETE'));
        return await res.json();
    },

    addGlobalUpdate: async (id, updateData) => {
        const res = await fetch(`${BASE_URL}/projects/${id}/updates`, getOptions('POST', updateData));
        return await res.json();
    },

    // Comments
    getComments: async (projectId) => {
        const res = await fetch(`${BASE_URL}/projects/${projectId}/comments`, getOptions('GET'));
        return await res.json();
    },

    createComment: async (projectId, commentData) => {
        const res = await fetch(`${BASE_URL}/projects/${projectId}/comments`, getOptions('POST', commentData));
        return await res.json();
    },

    deleteComment: async (commentId) => {
        const res = await fetch(`${BASE_URL}/admin/comments/${commentId}`, getOptions('DELETE'));
        return await res.json();
    },

    // Team
    getTeam: async () => {
        const res = await fetch(`${BASE_URL}/team`, getOptions('GET'));
        return await res.json();
    },

    updateTeamMember: async (id, data) => {
        const res = await fetch(`${BASE_URL}/team/${id}`, getOptions('PUT', data));
        return await res.json();
    },

    // Admin
    generateAccessCode: async (role, entityId = null) => {
        const res = await fetch(`${BASE_URL}/admin/access-codes`, getOptions('POST', { role, entityId }));
        return await res.json();
    },

    getAccessCodes: async () => {
        const res = await fetch(`${BASE_URL}/admin/access-codes`, getOptions('GET'));
        return await res.json();
    },
    
    // Contractor account: profile, documents, and the MINTP verification queue.
    getContractorProfile: async () => {
        const res = await fetch(`${BASE_URL}/contractor/profile`, getOptions('GET'));
        return await res.json();
    },

    saveContractorProfile: async (data) => {
        const res = await fetch(`${BASE_URL}/contractor/profile`, getOptions('PUT', data));
        return await res.json();
    },

    addContractorDocument: async (formData) => {
        const res = await fetch(`${BASE_URL}/contractor/documents`, getOptions('POST', formData));
        return await res.json();
    },

    getContractorQueue: async () => {
        const res = await fetch(`${BASE_URL}/contractor/queue`, getOptions('GET'));
        return await res.json();
    },

    verifyContractor: async (userId, decision, reason = '') => {
        const res = await fetch(`${BASE_URL}/contractor/${userId}/verify`, getOptions('POST', { decision, reason }));
        return await res.json();
    },

    // Finance (phase G3). Every mutation carries the second factor: the
    // caller's password and Private Confirmation Number travel in the body of
    // that one request and are never stored on the client.
    getMyFinance: async () => {
        const res = await fetch(`${BASE_URL}/finance/mine`, getOptions('GET'));
        return await res.json();
    },

    getMinfiOverview: async () => {
        const res = await fetch(`${BASE_URL}/finance/minfi`, getOptions('GET'));
        return await res.json();
    },

    createAllocation: async (payload) => {
        const res = await fetch(`${BASE_URL}/finance/allocations`, getOptions('POST', payload));
        return await res.json();
    },

    createDisbursement: async (allocationId, payload) => {
        const res = await fetch(`${BASE_URL}/finance/allocations/${allocationId}/disbursements`, getOptions('POST', payload));
        return await res.json();
    },

    confirmDisbursement: async (disbursementId, payload) => {
        const res = await fetch(`${BASE_URL}/finance/disbursements/${disbursementId}/confirm`, getOptions('POST', payload));
        return await res.json();
    },

    setBudget: async (payload) => {
        const res = await fetch(`${BASE_URL}/finance/budget`, getOptions('PUT', payload));
        return await res.json();
    },

    recordIncome: async (payload) => {
        const res = await fetch(`${BASE_URL}/finance/income`, getOptions('POST', payload));
        return await res.json();
    },

    initiateProjectPayment: async (projectId, payload) => {
        const res = await fetch(`${BASE_URL}/finance/projects/${projectId}/payments`, getOptions('POST', payload));
        return await res.json();
    },

    affirmPayment: async (paymentId, payload) => {
        const res = await fetch(`${BASE_URL}/finance/payments/${paymentId}/affirm`, getOptions('POST', payload));
        return await res.json();
    },

    getPaymentInbox: async () => {
        const res = await fetch(`${BASE_URL}/finance/payments/inbox`, getOptions('GET'));
        return await res.json();
    },

    getProjectPayments: async (projectId) => {
        const res = await fetch(`${BASE_URL}/finance/projects/${projectId}/payments`, getOptions('GET'));
        return await res.json();
    },

    getLedgerHead: async () => {
        const res = await fetch(`${BASE_URL}/finance/ledger/head`, getOptions('GET'));
        return await res.json();
    },

    // Government entities (the administrative hierarchy). Public reads.
    getEntities: async () => {
        const res = await fetch(`${BASE_URL}/entities`, getOptions('GET'));
        return await res.json();
    },

    getEntity: async (code) => {
        const res = await fetch(`${BASE_URL}/entities/${encodeURIComponent(code)}`, getOptions('GET'));
        return await res.json();
    },

    // Stats
    getStats: async () => {
        const res = await fetch(`${BASE_URL}/stats/global`);
        return await res.json();
    },

    // Contractor Analytics
    getContractors: async () => {
        const res = await fetch(`${BASE_URL}/admin/contractors`, getOptions('GET'));
        return await res.json();
    },

    getContractorStats: async (id) => {
        const res = await fetch(`${BASE_URL}/admin/contractors/${id}/stats`, getOptions('GET'));
        return await res.json();
    }
};
