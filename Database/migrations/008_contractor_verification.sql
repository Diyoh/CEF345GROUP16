-- Migration 008: contractor verification by the Ministry of Public Works
-- Date: 2026-08-24
--
-- Only a VERIFIED contractor can be assigned a project (enforced in the project
-- service) or, from phase G4, receive a payment. The profile keeps who decided
-- and when; a rejection keeps its reason. Changing identity fields after
-- verification drops the profile back to PENDING, because the thing MINTP
-- approved is the documentation, not the account.

CREATE TABLE IF NOT EXISTS contractor_profiles (
    user_id          CHAR(36) PRIMARY KEY,
    company_name     VARCHAR(255) NOT NULL,
    rccm_number      VARCHAR(100) NULL,
    taxpayer_number  VARCHAR(100) NULL,
    status           ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
    verified_by      CHAR(36) NULL,
    verified_at      TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_contractor_status (status)
);

CREATE TABLE IF NOT EXISTS contractor_documents (
    id          CHAR(36) PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    label       VARCHAR(255) NOT NULL,
    file_url    TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
