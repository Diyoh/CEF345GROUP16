/**
 * SERIALIZATION REGRESSION TESTS
 *
 * Guards the API output contract: everything leaving the backend is camelCase.
 * Each case below corresponds to a defect where a snake_case column silently read as
 * `undefined` in the frontend.
 */

import { jest } from '@jest/globals';
import { camelizeKeys, serializeResponse } from '../utils/serialize.js';

describe('camelizeKeys', () => {
    test('converts snake_case keys to camelCase', () => {
        expect(camelizeKeys({ author_name: 'Jean K.' })).toEqual({ authorName: 'Jean K.' });
    });

    test('leaves already-camel and single-word keys alone', () => {
        expect(camelizeKeys({ id: 1, title: 'Road', contractorName: 'BTP' }))
            .toEqual({ id: 1, title: 'Road', contractorName: 'BTP' });
    });

    test('converts nested objects and arrays', () => {
        const input = {
            data: [
                { project_id: 'p1', image_url: 'https://x/1.jpg' },
                { project_id: 'p2', image_url: 'https://x/2.jpg' },
            ],
        };
        expect(camelizeKeys(input)).toEqual({
            data: [
                { projectId: 'p1', imageUrl: 'https://x/1.jpg' },
                { projectId: 'p2', imageUrl: 'https://x/2.jpg' },
            ],
        });
    });

    test('preserves Date values instead of destructuring them', () => {
        const created = new Date('2026-03-12T10:00:00Z');
        const out = camelizeKeys({ created_at: created });
        expect(out.createdAt).toBeInstanceOf(Date);
        expect(out.createdAt.toISOString()).toBe(created.toISOString());
    });

    test('passes null and primitives through', () => {
        expect(camelizeKeys(null)).toBeNull();
        expect(camelizeKeys({ contractor_id: null, spent: 0, is_used: false }))
            .toEqual({ contractorId: null, spent: 0, isUsed: false });
    });

    test('handles digits in column names', () => {
        expect(camelizeKeys({ address_line_2: 'x' })).toEqual({ addressLine2: 'x' });
    });

    // --- the specific defects this exists to prevent ---

    test('S-02/S-03: a comment row becomes readable by the public page', () => {
        const row = {
            id: 'c1',
            project_id: 'p1',
            author_name: 'Jean K.',
            author_type: 'Citizen',
            text: 'Work has stopped.',
            created_at: new Date('2026-03-12T10:00:00Z'),
        };
        const out = camelizeKeys(row);
        expect(out.projectId).toBe('p1');      // was undefined -> comment filtered out entirely
        expect(out.authorName).toBe('Jean K.'); // was undefined -> blank author
        expect(out.authorType).toBe('Citizen');
        expect(out.createdAt).toBeInstanceOf(Date);
    });

    test('S-06: a used access code reports as used', () => {
        expect(camelizeKeys({ code: 'ADMIN-7K2P9Q', is_used: 1 }).isUsed).toBe(1);
    });

    test('S-07/S-08: a project row fills the edit form', () => {
        const out = camelizeKeys({
            contractor_id: 'con1',
            start_date: '2026-01-15',
            completion_date: '2026-12-31',
            updated_at: '2026-03-12',
        });
        expect(out.contractorId).toBe('con1');
        expect(out.startDate).toBe('2026-01-15');
        expect(out.completionDate).toBe('2026-12-31');
        expect(out.updatedAt).toBe('2026-03-12');
    });

    test('S-04: a timeline row exposes its date and author', () => {
        const out = camelizeKeys({ update_date: '2026-02-15', author_name: 'BTP Cameroun S.A.' });
        expect(out.updateDate).toBe('2026-02-15');
        expect(out.authorName).toBe('BTP Cameroun S.A.');
    });
});

describe('serializeResponse middleware', () => {
    test('camelCases every response body without changing the envelope', () => {
        const res = { json: jest.fn() };
        const originalJson = res.json;
        const next = jest.fn();

        serializeResponse({}, res, next);
        expect(next).toHaveBeenCalled();

        res.json({ success: true, data: { contractor_id: 'con1' } });

        expect(originalJson).toHaveBeenCalledWith({ success: true, data: { contractorId: 'con1' } });
    });

    test('leaves error responses intact', () => {
        const res = { json: jest.fn() };
        const originalJson = res.json;
        serializeResponse({}, res, () => {});

        res.json({ success: false, error: 'Not authorized' });

        expect(originalJson).toHaveBeenCalledWith({ success: false, error: 'Not authorized' });
    });
});
