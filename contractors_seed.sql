-- Existing Contractors Seed Data
-- Passwords are set to "password" (hash: $2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a)

INSERT IGNORE INTO
    users (
        id,
        name,
        email,
        password_hash,
        role
    )
VALUES (
        'u2',
        'BTP Cameroun S.A.',
        'contact@btpcameroun.cm',
        '$2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a',
        'CONTRACTOR'
    ),
    (
        'u3',
        'BuildFast Const',
        'info@buildfast.cm',
        '$2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a',
        'CONTRACTOR'
    ),
    (
        'con1',
        'Kotto Construction',
        'contact@kottoconst.cm',
        '$2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a',
        'CONTRACTOR'
    ),
    (
        'con2',
        'Sogea Satom',
        'contact@sobea.cm',
        '$2a$10$FMjCH6EGdyMvqAMGQdwSS.M3MsJfmWqH7O8rPEJEL3JQBnjlkob4a',
        'CONTRACTOR'
    );