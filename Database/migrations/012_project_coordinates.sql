-- Migration 012: project coordinates
-- Date: 2026-09-30
--
-- Optional GPS position of a project site, for the public map. Nullable: the
-- existing projects have none, and a project without coordinates is placed at
-- its region's centre on the map, marked as approximate. The service accepts
-- only both-or-neither and rejects points outside Cameroon, which is how a
-- swapped latitude and longitude usually shows up.

ALTER TABLE projects
    ADD COLUMN latitude  DECIMAL(9,6) NULL AFTER region,
    ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude;
