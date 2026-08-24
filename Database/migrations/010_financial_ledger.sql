-- Migration 010: the financial ledger
-- Date: 2026-08-24
--
-- Append-only, hash-chained, signed. Written in the same transaction as the
-- financial row it describes, so a record of money cannot move without a ledger
-- entry landing with it.
--
-- seq is assigned by the service under a row lock, NOT auto-incremented: a
-- rolled-back transaction must not burn a sequence number, because the chain
-- verifier treats a gap as a broken chain.
--
-- details_json is the hashed payload and the source of truth; the typed columns
-- beside it exist for querying and must mirror it (the verifier cross-checks).
-- Protection stack: triggers stop UPDATE and DELETE for every connection; the
-- hash chain makes any edit break every later entry; the HMAC signature, keyed
-- from outside the database, makes a rewritten chain unforgeable; the published
-- head hash makes silent replacement visible.

CREATE TABLE IF NOT EXISTS ledger_entries (
    seq             BIGINT PRIMARY KEY,
    occurred_at     TIMESTAMP(3) NOT NULL,
    entry_type      VARCHAR(50) NOT NULL,
    ref_table       VARCHAR(50) NOT NULL,
    ref_id          CHAR(36) NOT NULL,
    actor_user_id   CHAR(36) NOT NULL,
    actor_entity_id CHAR(36) NULL,
    amount_xaf      DECIMAL(18,2) NULL,
    details_json    TEXT NOT NULL,
    prev_hash       CHAR(64) NOT NULL,
    entry_hash      CHAR(64) NOT NULL,
    signature       CHAR(64) NOT NULL,
    INDEX idx_ledger_ref (ref_table, ref_id),
    INDEX idx_ledger_actor (actor_user_id)
);

DROP TRIGGER IF EXISTS ledger_no_update;

CREATE TRIGGER ledger_no_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'the financial ledger is append-only: entries cannot be modified';

DROP TRIGGER IF EXISTS ledger_no_delete;

CREATE TRIGGER ledger_no_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'the financial ledger is append-only: entries cannot be deleted';
