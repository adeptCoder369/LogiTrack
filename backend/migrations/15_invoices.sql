-- 15: invoices + invoice items (Phase 4).
--
-- An invoice is generated from a purchase order: header carries the client,
-- the billing parent, the source, and financial totals; lines carry the
-- products with qty/rate/amount. Status flow:
-- Draft -> Issued -> Partially Paid -> Paid (Overdue derived from due_date).
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE invoices (
    id                   VARCHAR(36)   PRIMARY KEY,
    tenant_id            VARCHAR(36)   NOT NULL,
    invoice_no           VARCHAR(100)  NOT NULL,
    po_id                VARCHAR(36)   DEFAULT NULL,
    po_number            VARCHAR(100)  DEFAULT NULL,
    client_company_id    VARCHAR(36)   DEFAULT NULL,
    client_company_name  VARCHAR(255)  DEFAULT NULL,
    billing_company_id   VARCHAR(36)   DEFAULT NULL,
    billing_company_name VARCHAR(255)  DEFAULT NULL,
    source_type          VARCHAR(20)   DEFAULT NULL,
    source_id            VARCHAR(36)   DEFAULT NULL,
    source_name          VARCHAR(255)  DEFAULT NULL,
    status               VARCHAR(50)   NOT NULL DEFAULT 'Draft',
    invoice_date         VARCHAR(50)   DEFAULT NULL,
    due_date             VARCHAR(50)   DEFAULT NULL,
    subtotal             FLOAT         DEFAULT 0,
    gst_rate             FLOAT         DEFAULT 0,
    gst_amount           FLOAT         DEFAULT 0,
    total_amount         FLOAT         DEFAULT 0,
    currency             VARCHAR(10)   DEFAULT 'INR',
    notes                TEXT          DEFAULT NULL,
    created_by           VARCHAR(36)   DEFAULT NULL,
    created_at           DATETIME      NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_client (client_company_id),
    INDEX idx_billing (billing_company_id),
    INDEX idx_po (po_id)
);

CREATE TABLE invoice_items (
    id           VARCHAR(36)  PRIMARY KEY,
    tenant_id    VARCHAR(36)  NOT NULL,
    invoice_id   VARCHAR(36)  NOT NULL,
    product_id   VARCHAR(36)  DEFAULT NULL,
    product_name VARCHAR(255) DEFAULT NULL,
    description  TEXT         DEFAULT NULL,
    quantity_mt  FLOAT        DEFAULT 0,
    rate         FLOAT        DEFAULT 0,
    amount       FLOAT        DEFAULT 0,
    tier         VARCHAR(100) DEFAULT NULL,
    created_at   DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_product (product_id)
);
