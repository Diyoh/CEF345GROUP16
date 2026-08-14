-- Migration 003 — immutable per-project change log
-- Date: 2026-08-14
--
-- WHY:
-- The platform's entire claim is that its figures can be trusted. Until now a contractor
-- could move progress from 60% to 30%, or quietly revise spend, and the record showed only
-- the new value. Nothing said a change had happened, who made it, or what it replaced —
-- so "80% funded, 30% built" was a snapshot nobody could audit.
--
-- project_updates is a NARRATIVE timeline that a contractor writes on purpose.
-- project_changes is a FACTUAL log the system writes whether or not anyone wants it.
-- The second is the one that matters for accountability, because it cannot be curated.
--
-- IMMUTABILITY:
-- Nothing in the application ever issues UPDATE or DELETE against this table; rows are
-- written inside the same transaction as the change they describe, so a figure cannot move
-- without a log row landing with it. Enforcement is by convention plus the absence of any
-- code path — for a stronger guarantee, grant the application user INSERT and SELECT only
-- on this table and withhold UPDATE/DELETE at the database level:
--
--   REVOKE UPDATE, DELETE ON <db>.project_changes FROM '<app_user>'@'%';
--
-- old_value / new_value are TEXT rather than typed columns: this log spans money,
-- percentages, dates, status strings and free text, and storing the rendered value keeps
-- the row readable years later even if a column's type changes underneath it.

CREATE TABLE IF NOT EXISTS project_changes (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,

    -- Who made the change. actor_name and actor_role are DENORMALISED on purpose: an audit
    -- record must still read correctly after the user is renamed or removed, and joining to
    -- a mutable table would let history change retroactively.
    actor_id CHAR(36),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,

    field VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,

    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

    -- The public history view reads "this project, newest first".
    INDEX idx_changes_project_time (project_id, changed_at DESC),
    -- "What has this contractor been changing" across their portfolio.
    INDEX idx_changes_actor (actor_id)
);
