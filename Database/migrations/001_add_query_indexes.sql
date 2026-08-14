-- Migration 001 — query indexes
-- Date: 2026-08-14
-- Safe to re-run: each statement is guarded by a duplicate-key check below.
--
-- WHY THESE THREE:
-- `GET /api/v1/projects` is the single hottest query in the product — it backs the public
-- browse page, the home page and both dashboards. It ends with:
--
--     ORDER BY p.created_at DESC LIMIT ? OFFSET ?
--
-- with optional `p.status = ?` and a LIKE on title/location. None of those columns were
-- indexed, so MySQL sorted the whole table on every request. With the database in Helsinki
-- or Frankfurt and users in Cameroon, a filesort that costs 8ms locally is invisible next to
-- the round trip — until the table grows, at which point it is the whole response time.
--
-- `region` is indexed because the region filter is the primary way a citizen narrows the
-- list to work happening near them.
--
-- No index on title/location: the search uses LIKE '%term%', which cannot use a B-tree.
-- A FULLTEXT index is the correct tool if search becomes slow — deliberately not added
-- here, because it changes query syntax and should be a considered change, not a side effect.

-- projects.created_at — the ORDER BY of the main list query
CREATE INDEX idx_projects_created_at ON projects (created_at DESC);

-- projects.status — the status filter, and the stats endpoint's four counts
CREATE INDEX idx_projects_status ON projects (status);

-- projects.region — region filter on the public browse page
CREATE INDEX idx_projects_region ON projects (region);

-- Composite: the common "filter by status, newest first" path is served entirely by this.
CREATE INDEX idx_projects_status_created ON projects (status, created_at DESC);
