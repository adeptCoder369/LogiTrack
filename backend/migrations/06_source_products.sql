-- 06: source <-> product access mapping (Phase 1).
--
-- source_products declares which products a source (Depot or Company) can
-- supply. A source with NO mappings stays visible to everyone (mapping is an
-- opt-in restriction); a source with mappings is visible to a user only when
-- at least one of its mapped products is in the user's accessible product
-- set (the "2 products, 1 permission" rule).
--
-- Like every tenant-scoped table it carries tenant_id (db_compat auto-scopes
-- queries and stamps inserts).
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE source_products (
    id          VARCHAR(36)  PRIMARY KEY,
    tenant_id   VARCHAR(36)  NOT NULL,
    source_id   VARCHAR(36)  NOT NULL,
    source_type VARCHAR(20)  NOT NULL,
    product_id  VARCHAR(36)  NOT NULL,
    active      BOOLEAN      DEFAULT TRUE,
    created_by  VARCHAR(36)  DEFAULT NULL,
    created_at  DATETIME     NOT NULL,
    UNIQUE KEY uk_source_product (tenant_id, source_type, source_id, product_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_source (source_type, source_id),
    INDEX idx_product (product_id)
);
