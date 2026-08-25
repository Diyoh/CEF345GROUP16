-- Migration 005: the administrative hierarchy
-- Date: 2026-08-24
--
-- One typed table for every level of the state: the national root, ministries,
-- regions and councils. One table rather than three because allocations, budgets,
-- accounts and private numbers all need a single foreign-key target; an allocation
-- can go to a ministry or a council, and polymorphic references across separate
-- tables cannot be enforced by the database.
--
-- Depth is fixed at two: councils point at their region, everything else points at
-- the national root. No recursive queries are ever needed.
--
-- Names are bilingual as first-class columns because entity names appear on every
-- public page and the platform ships English and French together.

CREATE TABLE IF NOT EXISTS gov_entities (
    id          CHAR(36) PRIMARY KEY,
    type        ENUM('NATIONAL','MINISTRY','REGION','COUNCIL') NOT NULL,
    code        VARCHAR(30) UNIQUE NOT NULL,
    name_en     VARCHAR(255) NOT NULL,
    name_fr     VARCHAR(255) NOT NULL,
    parent_id   CHAR(36) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES gov_entities(id),
    INDEX idx_entities_parent (parent_id),
    INDEX idx_entities_type (type)
);
