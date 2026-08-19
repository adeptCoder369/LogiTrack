-- 16: payments + invoice payment ledger (Phase 4).
--
-- payments are received against a company; invoice_payments allocates a
-- payment (or part of it) to a specific invoice. Invoice status advances
-- automatically: fully allocated -> Paid, partially -> Partially Paid.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE payments (
    id           VARCHAR(36)  PRIMARY KEY,
    tenant_id    VARCHAR(36)  NOT NULL,
    receipt_no   VARCHAR(100) NOT NULL,
    company_id   VARCHAR(36)  NOT NULL,
    company_name VARCHAR(255) DEFAULT NULL,
    amount       FLOAT        NOT NULL DEFAULT 0,
    mode         VARCHAR(50)  DEFAULT 'Bank Transfer',
    bank_ref     VARCHAR(255) DEFAULT NULL,
    payment_date VARCHAR(50)  DEFAULT NULL,
    notes        TEXT         DEFAULT NULL,
    created_by   VARCHAR(36)  DEFAULT NULL,
    created_at   DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_company (company_id)
);

CREATE TABLE invoice_payments (
    id               VARCHAR(36)  PRIMARY KEY,
    tenant_id        VARCHAR(36)  NOT NULL,
    invoice_id       VARCHAR(36)  NOT NULL,
    payment_id       VARCHAR(36)  NOT NULL,
    amount_allocated FLOAT        NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_payment (payment_id)
);
