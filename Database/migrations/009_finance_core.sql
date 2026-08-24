-- Migration 009: the finance core
-- Date: 2026-08-24
--
-- The five money records from the governance plan, phase G3. Every money hop is
-- a pair of records, never a status toggle: MINFI records what it sent, the
-- recipient separately records what arrived, and the gap between the two
-- numbers is computed and published. Nobody confirms their own payment.
--
-- Rows here are the QUERYABLE state. The authoritative history of every action
-- lives in the ledger (migration 010), written in the same transaction.

CREATE TABLE IF NOT EXISTS budgets (
    id             CHAR(36) PRIMARY KEY,
    entity_id      CHAR(36) NOT NULL,
    fiscal_year    SMALLINT NOT NULL,
    planned_amount DECIMAL(18,2) NOT NULL,
    note           VARCHAR(500) NULL,
    recorded_by    CHAR(36) NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_budget_entity_year (entity_id, fiscal_year),
    FOREIGN KEY (entity_id) REFERENCES gov_entities(id)
);

CREATE TABLE IF NOT EXISTS allocations (
    id             CHAR(36) PRIMARY KEY,
    from_entity_id CHAR(36) NOT NULL,
    to_entity_id   CHAR(36) NOT NULL,
    fiscal_year    SMALLINT NOT NULL,
    amount_xaf     DECIMAL(18,2) NOT NULL,
    purpose        VARCHAR(500) NOT NULL,
    created_by     CHAR(36) NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_entity_id) REFERENCES gov_entities(id),
    FOREIGN KEY (to_entity_id)   REFERENCES gov_entities(id),
    INDEX idx_alloc_to (to_entity_id, fiscal_year),
    INDEX idx_alloc_from (from_entity_id, fiscal_year)
);

CREATE TABLE IF NOT EXISTS disbursements (
    id                   CHAR(36) PRIMARY KEY,
    allocation_id        CHAR(36) NOT NULL,
    amount_xaf           DECIMAL(18,2) NOT NULL,
    sent_by              CHAR(36) NOT NULL,
    sent_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount_confirmed_xaf DECIMAL(18,2) NULL,
    confirmed_by         CHAR(36) NULL,
    confirmed_at         TIMESTAMP NULL,
    FOREIGN KEY (allocation_id) REFERENCES allocations(id),
    INDEX idx_disb_allocation (allocation_id)
);

CREATE TABLE IF NOT EXISTS entity_income (
    id          CHAR(36) PRIMARY KEY,
    entity_id   CHAR(36) NOT NULL,
    fiscal_year SMALLINT NOT NULL,
    label       VARCHAR(255) NOT NULL,
    amount_xaf  DECIMAL(18,2) NOT NULL,
    recorded_by CHAR(36) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES gov_entities(id),
    INDEX idx_income_entity (entity_id, fiscal_year)
);
