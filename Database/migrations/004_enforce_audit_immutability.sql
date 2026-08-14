-- Migration 004 — make the audit log actually immutable
-- Date: 2026-08-14
--
-- Migration 003 created project_changes and the application never updates or deletes it.
-- That is a convention, not a guarantee: any future code path, any hand-run SQL, or anyone
-- with a database client can rewrite history. An audit log that CAN be edited provides the
-- appearance of accountability without the substance, which is worse than having none —
-- readers trust it precisely because they assume it cannot be touched.
--
-- Two holes are closed here.
--
-- 1. THE CASCADE HOLE
--    project_changes.project_id had ON DELETE CASCADE to projects. Deleting a project
--    therefore erased its entire change history — the cheapest possible way to make an
--    inconvenient record disappear, available to any admin, leaving no trace.
--
--    The foreign key is dropped. Audit rows now OUTLIVE the project they describe, which is
--    the correct behaviour for an audit log: "this project existed, these figures moved,
--    and then it was deleted" is exactly the sequence someone auditing would need to see.
--    project_id remains indexed for lookup; it simply no longer enforces a parent row.
--
-- 2. THE MUTATION HOLE
--    Triggers now reject UPDATE and DELETE on the table outright, at the database, for
--    every connection regardless of how it got there. INSERT and SELECT still work, so the
--    application is unaffected.
--
--    Triggers are used rather than REVOKE UPDATE, DELETE because revoking needs GRANT
--    privileges the application user does not have on a managed host, and a privilege can
--    be granted back quietly while a trigger is a visible schema object.
--
--    Written without BEGIN...END so each trigger is a single statement containing no
--    internal semicolons — see the note in Backend/scripts/migrate.js.
--
-- TO REVERSE (deliberately awkward, and it leaves evidence in the schema):
--   DROP TRIGGER project_changes_no_update;
--   DROP TRIGGER project_changes_no_delete;

-- 1. Audit rows survive deletion of the project they describe.
ALTER TABLE project_changes DROP FOREIGN KEY project_changes_ibfk_1;

-- 2. Reject any attempt to alter or remove a recorded change.
CREATE TRIGGER project_changes_no_update
BEFORE UPDATE ON project_changes
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'project_changes is an append-only audit log: rows cannot be modified';

CREATE TRIGGER project_changes_no_delete
BEFORE DELETE ON project_changes
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'project_changes is an append-only audit log: rows cannot be deleted';
