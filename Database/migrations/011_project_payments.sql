-- Migration 011: project payments
-- Date: 2026-08-24
--
-- The last hop of the money: an owning institution pays its contractor, and the
-- contractor separately affirms what arrived. Same pair-of-records rule as
-- MINFI disbursements: nobody confirms their own payment, partials allowed,
-- the gap is computed and published.
--
-- From this table onward, a project's `spent` figure is DERIVED from affirmed
-- payments instead of free-typed by the contractor, closing the platform's
-- largest self-reporting hole.

CREATE TABLE IF NOT EXISTS project_payments (
    id                  CHAR(36) PRIMARY KEY,
    project_id          CHAR(36) NOT NULL,
    payer_entity_id     CHAR(36) NOT NULL,
    contractor_id       CHAR(36) NOT NULL,
    amount_xaf          DECIMAL(18,2) NOT NULL,
    note                VARCHAR(500) NULL,
    initiated_by        CHAR(36) NOT NULL,
    initiated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount_affirmed_xaf DECIMAL(18,2) NULL,
    affirmed_at         TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (payer_entity_id) REFERENCES gov_entities(id),
    FOREIGN KEY (contractor_id) REFERENCES users(id),
    INDEX idx_payments_contractor (contractor_id),
    INDEX idx_payments_project (project_id)
);
