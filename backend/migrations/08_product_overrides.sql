-- 08: product master overrides + company pricing (Phase 1).
--
-- product_overrides: per-company overrides on the global product master
-- (code, name, description, min_stock, pricing_model). Resolved by the
-- effective_product() helper; consumed by billing in Phase 4.
--
-- company_pricing: company-specific price lists (product, tier, rate,
-- validity window) - the foundation Phase 4 invoicing applies rates from.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE product_overrides (
    id            VARCHAR(36)  PRIMARY KEY,
    tenant_id     VARCHAR(36)  NOT NULL,
    company_id    VARCHAR(36)  NOT NULL,
    product_id    VARCHAR(36)  NOT NULL,
    code          VARCHAR(100) DEFAULT NULL,
    name          VARCHAR(255) DEFAULT NULL,
    description   TEXT         DEFAULT NULL,
    min_stock     FLOAT        DEFAULT 0,
    pricing_model VARCHAR(50)  DEFAULT NULL,
    active        BOOLEAN      DEFAULT TRUE,
    created_at    DATETIME     NOT NULL,
    UNIQUE KEY uk_company_product (tenant_id, company_id, product_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_product (product_id)
);

CREATE TABLE company_pricing (
    id         VARCHAR(36)  PRIMARY KEY,
    tenant_id  VARCHAR(36)  NOT NULL,
    company_id VARCHAR(36)  NOT NULL,
    product_id VARCHAR(36)  NOT NULL,
    tier       VARCHAR(100) DEFAULT NULL,
    rate       FLOAT        NOT NULL,
    currency   VARCHAR(10)  DEFAULT 'INR',
    valid_from DATE         DEFAULT NULL,
    valid_to   DATE         DEFAULT NULL,
    created_at DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_company_product (company_id, product_id),
    INDEX idx_product (product_id)
);
