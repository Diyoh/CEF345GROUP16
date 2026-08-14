/**
 * CITIZEN REPORT ANONYMITY REGRESSION
 *
 * Reports are the platform's check on contractor self-reporting, and the person best
 * placed to file one is often the person most exposed to consequences for doing so. The
 * API therefore does not accept a name at all — not merely hides it. Two properties:
 *
 *   1. Nothing identifying is stored, so there is nothing to leak or subpoena.
 *   2. A name cannot be supplied, so nobody can file a report as somebody else. The
 *      endpoint is unauthenticated, so a client-supplied name was pure impersonation.
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../config/db.js', () => ({
    default: { query: jest.fn() },
    withTransaction: (work) => work({ query: jest.fn() })
}));

jest.unstable_mockModule('../utils/fileHandler.js', () => ({
    saveBase64Image: jest.fn().mockResolvedValue('https://cdn/x.jpg')
}));

const { createComment } = await import('../controllers/commentController.js');
const pool = (await import('../config/db.js')).default;

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

/** Project lookup succeeds; the read-back returns a stored row. */
const mockDb = () => {
    pool.query.mockImplementation((sql) => {
        if (/SELECT id FROM projects/i.test(sql)) return Promise.resolve([[{ id: 'p1' }], []]);
        if (/SELECT \* FROM comments/i.test(sql)) return Promise.resolve([[{ id: 'c1' }], []]);
        return Promise.resolve([[], []]);
    });
};

const insertParams = () => {
    const call = pool.query.mock.calls.find(([sql]) => /INSERT INTO comments/i.test(sql));
    return call ? call[1] : null;
};

beforeEach(() => {
    jest.clearAllMocks();
    mockDb();
});

describe('createComment anonymity', () => {
    test('stores NULL for author_name even when a name is supplied', async () => {
        const res = makeRes();
        await createComment(
            { params: { id: 'p1' }, body: { authorName: 'Jean Kamga', authorType: 'Citizen', text: 'Work stopped.' } },
            res
        );

        const params = insertParams();
        expect(params).not.toBeNull();
        // [id, project_id, author_name, author_type, text]
        expect(params[2]).toBeNull();
        expect(params).not.toContain('Jean Kamga');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('accepts a report with no name at all', async () => {
        const res = makeRes();
        await createComment(
            { params: { id: 'p1' }, body: { text: 'The site is abandoned.' } },
            res
        );

        expect(res.status).toHaveBeenCalledWith(201);
        expect(insertParams()[2]).toBeNull();
    });

    test('keeps the reporter type, which is not identifying', async () => {
        const res = makeRes();
        await createComment({ params: { id: 'p1' }, body: { authorType: 'NGO', text: 'Drainage concern.' } }, res);

        expect(insertParams()[3]).toBe('NGO');
    });

    test('rejects an unknown authorType instead of storing it', async () => {
        const res = makeRes();
        await createComment(
            { params: { id: 'p1' }, body: { authorType: 'Government', text: 'x' } },
            res
        );

        // Falls back to Citizen rather than writing a value outside the ENUM.
        expect(insertParams()[3]).toBe('Citizen');
    });

    test('still requires the report text', async () => {
        const res = makeRes();
        await createComment({ params: { id: 'p1' }, body: { text: '   ' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(insertParams()).toBeNull();
    });

    test('404s for a project that does not exist', async () => {
        pool.query.mockResolvedValue([[], []]);

        const res = makeRes();
        await createComment({ params: { id: 'nope' }, body: { text: 'Something' } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
