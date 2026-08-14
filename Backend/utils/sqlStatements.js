/**
 * SQL STATEMENT SPLITTER
 *
 * Splits a .sql file into individual statements on semicolons, ignoring those inside string
 * literals, quoted identifiers and comments.
 *
 * Lives in its own module because both scripts/migrate.js and scripts/initDb.js need it, and
 * migrate.js executes a migration run on import — importing it for a helper would silently
 * migrate the database as a side effect.
 *
 * LIMITATION, deliberately accepted: no DELIMITER handling. Triggers in this project are
 * written WITHOUT BEGIN...END so they contain no internal semicolons and split correctly. A
 * future stored procedure with a multi-statement body needs a DELIMITER-aware runner rather
 * than a more clever regex here.
 */
export const splitStatements = (sql) => {
    const statements = [];
    let current = '';
    let quote = null;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        const next = sql[i + 1];

        if (inLineComment) {
            if (char === '\n') inLineComment = false;
            current += char;
            continue;
        }

        if (inBlockComment) {
            current += char;
            if (char === '*' && next === '/') {
                current += next;
                i++;
                inBlockComment = false;
            }
            continue;
        }

        if (!quote && char === '-' && next === '-') { inLineComment = true; current += char; continue; }
        if (!quote && char === '#') { inLineComment = true; current += char; continue; }
        if (!quote && char === '/' && next === '*') { inBlockComment = true; current += char; continue; }

        if (quote) {
            current += char;
            if (char === '\\') { current += next ?? ''; i++; continue; } // escaped character
            if (char === quote) quote = null;
            continue;
        }

        if (char === "'" || char === '"' || char === '`') { quote = char; current += char; continue; }

        if (char === ';') {
            const trimmed = current.trim();
            if (trimmed) statements.push(trimmed);
            current = '';
            continue;
        }

        current += char;
    }

    const tail = current.trim();
    if (tail) statements.push(tail);

    // Drop entries that contain nothing but comments.
    return statements.filter((s) =>
        s.split('\n').some((line) => {
            const t = line.trim();
            return t && !t.startsWith('--') && !t.startsWith('#');
        })
    );
};
