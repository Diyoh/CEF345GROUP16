-- Migration 006: projects join the hierarchy
-- Date: 2026-08-24
--
-- Ownership and location are different questions. A project has one owner, the
-- council or ministry that commissions and manages it. Where it happens is a list:
-- a council project covers its council, a ministerial road can cross several
-- regions, a national dam covers the national root. The service enforces which
-- combinations are legal; the schema only stores them.
--
-- owner_entity_id is nullable during the transition. Existing projects keep their
-- free-text region column readable; the seed script backfills owners and areas.

ALTER TABLE projects
    ADD COLUMN owner_entity_id CHAR(36) NULL,
    ADD CONSTRAINT fk_projects_owner FOREIGN KEY (owner_entity_id) REFERENCES gov_entities(id);

CREATE TABLE IF NOT EXISTS project_areas (
    project_id CHAR(36) NOT NULL,
    entity_id  CHAR(36) NOT NULL,
    PRIMARY KEY (project_id, entity_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES gov_entities(id),
    INDEX idx_areas_entity (entity_id)
);
