-- Database Schema for BuildRight Platform
-- Version: 1.0

-- Disable foreign key checks temporarily
SET foreign_key_checks = 0;

-- 0. GOVERNMENT ENTITIES (the administrative hierarchy)
-- One typed table for every level of the state. Depth is fixed at two: councils
-- point at their region, ministries and regions point at the national root.
-- Mirrored by migrations/005_gov_entities.sql for existing databases.
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

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'CONTRACTOR', 'DEVELOPER_ADMIN', 'PUBLIC') NOT NULL DEFAULT 'PUBLIC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. ACCESS CODES
CREATE TABLE IF NOT EXISTS access_codes (
    code VARCHAR(50) PRIMARY KEY,
    role ENUM('ADMIN', 'CONTRACTOR', 'DEVELOPER_ADMIN', 'PUBLIC') NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    generated_by_user_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id)
);

-- 3. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    budget DECIMAL(15, 2) DEFAULT 0.00,
    spent DECIMAL(15, 2) DEFAULT 0.00,
    progress INTEGER DEFAULT 0,
    CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100),
    status ENUM('Planned', 'Ongoing', 'Stalled', 'Completed') DEFAULT 'Planned',
    contractor_id CHAR(36),
    -- The council or ministry that commissions and manages the project. Nullable
    -- during the transition from the free-text region column.
    owner_entity_id CHAR(36) NULL,
    start_date DATE,
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_id) REFERENCES users(id),
    FOREIGN KEY (owner_entity_id) REFERENCES gov_entities(id),

    -- Query indexes. Mirrored by Database/migrations/001_add_query_indexes.sql for
    -- databases that already exist. Keep the two in sync.
    INDEX idx_projects_created_at (created_at DESC),   -- ORDER BY of the main list query
    INDEX idx_projects_status (status),                 -- status filter + stats counts
    INDEX idx_projects_region (region),                 -- region filter, public browse
    INDEX idx_projects_status_created (status, created_at DESC) -- "filtered, newest first"
);

-- 3b. PROJECT AREAS (where a project happens)
-- A council project covers its council. A ministerial project covers one or more
-- regions, or the national root for country-wide works. The service enforces the
-- legal combinations; this table only stores them.
CREATE TABLE IF NOT EXISTS project_areas (
    project_id CHAR(36) NOT NULL,
    entity_id  CHAR(36) NOT NULL,
    PRIMARY KEY (project_id, entity_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES gov_entities(id),
    INDEX idx_areas_entity (entity_id)
);

-- 4. PROJECT IMAGES
CREATE TABLE IF NOT EXISTS project_images (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    is_main_cover BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 5. PROJECT UPDATES
CREATE TABLE IF NOT EXISTS project_updates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    message TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    update_date DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 6. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    -- Nullable: citizen reports are anonymous. New rows store NULL; rows filed before
    -- migration 002 keep the name they were submitted under.
    author_name VARCHAR(255) NULL,
    author_type ENUM('Citizen', 'NGO') DEFAULT 'Citizen',
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 7. COMMENT IMAGES
CREATE TABLE IF NOT EXISTS comment_images (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    comment_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 8. PROJECT CHANGES (immutable audit log)
-- Written by the system on every figure change, inside the same transaction as the
-- change itself. Never updated, never deleted. See migrations/003_project_change_log.sql.
CREATE TABLE IF NOT EXISTS project_changes (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    -- Denormalised so history still reads correctly after a user is renamed or removed.
    actor_id CHAR(36),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    field VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Deliberately NO foreign key to projects. An ON DELETE CASCADE here meant deleting a
    -- project erased its entire history, which is the cheapest way to make an inconvenient
    -- record disappear. Audit rows outlive the project they describe; the deletion itself
    -- is logged as the final entry. See migrations/004.
    INDEX idx_changes_project (project_id),
    INDEX idx_changes_project_time (project_id, changed_at DESC),
    INDEX idx_changes_actor (actor_id)
);

-- Append-only enforcement. An audit log that CAN be edited is worse than none: readers
-- trust it precisely because they assume it cannot be. Written without BEGIN...END so each
-- trigger is a single statement (see Backend/scripts/migrate.js).
DROP TRIGGER IF EXISTS project_changes_no_update;
CREATE TRIGGER project_changes_no_update
BEFORE UPDATE ON project_changes
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'project_changes is an append-only audit log: rows cannot be modified';

DROP TRIGGER IF EXISTS project_changes_no_delete;
CREATE TRIGGER project_changes_no_delete
BEFORE DELETE ON project_changes
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'project_changes is an append-only audit log: rows cannot be deleted';

-- 9. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    bio TEXT,
    image_url TEXT
);

-- Re-enable foreign key checks
SET foreign_key_checks = 1;
