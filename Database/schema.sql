-- Database Schema for BuildRight Platform
-- Version: 1.0

-- Disable foreign key checks temporarily
SET foreign_key_checks = 0;

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
    start_date DATE,
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_id) REFERENCES users(id),

    -- Query indexes. Mirrored by Database/migrations/001_add_query_indexes.sql for
    -- databases that already exist. Keep the two in sync.
    INDEX idx_projects_created_at (created_at DESC),   -- ORDER BY of the main list query
    INDEX idx_projects_status (status),                 -- status filter + stats counts
    INDEX idx_projects_region (region),                 -- region filter, public browse
    INDEX idx_projects_status_created (status, created_at DESC) -- "filtered, newest first"
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

-- 8. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    bio TEXT,
    image_url TEXT
);

-- Re-enable foreign key checks
SET foreign_key_checks = 1;
