-- Migration 007: accounts join the hierarchy
-- Date: 2026-08-24
--
-- Two changes from the governance plan, phase G2.
--
-- 1. ADMIN becomes PLATFORM_ADMIN, and ENTITY_ADMIN arrives. Once councils and
--    ministries have their own administrators, a bare "admin" is ambiguous in
--    exactly the way that causes permission mistakes. The rename runs in three
--    steps because MySQL cannot drop an enum value while rows still hold it:
--    widen, migrate the rows, narrow.
--
-- 2. users gain entity_id (which institution an ENTITY_ADMIN belongs to) and
--    pcn_hash (the Private Confirmation Number, bcrypt-hashed, never stored in
--    clear). Access codes gain entity_id so a code mints an administrator bound
--    to one specific council or ministry.

ALTER TABLE users MODIFY role ENUM('ADMIN','PLATFORM_ADMIN','ENTITY_ADMIN','CONTRACTOR','DEVELOPER_ADMIN','PUBLIC') NOT NULL DEFAULT 'PUBLIC';

UPDATE users SET role = 'PLATFORM_ADMIN' WHERE role = 'ADMIN';

ALTER TABLE users MODIFY role ENUM('PLATFORM_ADMIN','ENTITY_ADMIN','CONTRACTOR','DEVELOPER_ADMIN','PUBLIC') NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE users
    ADD COLUMN entity_id CHAR(36) NULL,
    ADD COLUMN pcn_hash VARCHAR(255) NULL,
    ADD CONSTRAINT fk_users_entity FOREIGN KEY (entity_id) REFERENCES gov_entities(id);

ALTER TABLE access_codes MODIFY role ENUM('ADMIN','PLATFORM_ADMIN','ENTITY_ADMIN','CONTRACTOR','DEVELOPER_ADMIN','PUBLIC') NOT NULL;

UPDATE access_codes SET role = 'PLATFORM_ADMIN' WHERE role = 'ADMIN';

ALTER TABLE access_codes MODIFY role ENUM('PLATFORM_ADMIN','ENTITY_ADMIN','CONTRACTOR','DEVELOPER_ADMIN','PUBLIC') NOT NULL;

ALTER TABLE access_codes
    ADD COLUMN entity_id CHAR(36) NULL,
    ADD CONSTRAINT fk_codes_entity FOREIGN KEY (entity_id) REFERENCES gov_entities(id);
