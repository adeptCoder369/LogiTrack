-- 19: approval matrices (Phase 5).
--
-- Single-level approval in v1: a transfer is approved when the approver's
-- role is in the resolved matrix's approver_roles. The matrix matches on
-- entity + optional product + optional amount_threshold (quantity_mt >=
-- threshold). Most specific match wins (product-specific, then highest
-- threshold).
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE approval_matrices (
    id                VARCHAR(36)  PRIMARY KEY,
    tenant_id         VARCHAR(36)  NOT NULL,
    entity            VARCHAR(100) NOT NULL DEFAULT 'stock_transfer',
    product_id        VARCHAR(36)  DEFAULT NULL,
    amount_threshold  FLOAT        DEFAULT NULL,
    approver_roles    TEXT         DEFAULT NULL,
    active            BOOLEAN      DEFAULT TRUE,
    created_at        DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_entity (entity),
    INDEX idx_product (product_id)
);
