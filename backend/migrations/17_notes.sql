-- 17: credit / debit notes (Phase 4).
--
-- Adjustments linked to an invoice. A credit note reduces the invoice's
-- outstanding (like a negative allocation); debit notes are recorded
-- adjustments (informational for v1). `applied` allows reversing a note.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE credit_notes (
    id           VARCHAR(36)  PRIMARY KEY,
    tenant_id    VARCHAR(36)  NOT NULL,
    note_no      VARCHAR(100) NOT NULL,
    invoice_id   VARCHAR(36)  NOT NULL,
    company_id   VARCHAR(36)  DEFAULT NULL,
    company_name VARCHAR(255) DEFAULT NULL,
    amount       FLOAT        NOT NULL DEFAULT 0,
    reason       TEXT         DEFAULT NULL,
    applied      BOOLEAN      DEFAULT TRUE,
    created_by   VARCHAR(36)  DEFAULT NULL,
    created_at   DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_company (company_id)
);

CREATE TABLE debit_notes (
    id           VARCHAR(36)  PRIMARY KEY,
    tenant_id    VARCHAR(36)  NOT NULL,
    note_no      VARCHAR(100) NOT NULL,
    invoice_id   VARCHAR(36)  NOT NULL,
    company_id   VARCHAR(36)  DEFAULT NULL,
    company_name VARCHAR(255) DEFAULT NULL,
    amount       FLOAT        NOT NULL DEFAULT 0,
    reason       TEXT         DEFAULT NULL,
    applied      BOOLEAN      DEFAULT TRUE,
    created_by   VARCHAR(36)  DEFAULT NULL,
    created_at   DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_company (company_id)
);
