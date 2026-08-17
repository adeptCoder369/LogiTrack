-- 13: client module enablement (Phase 2).
--
-- Per-client (company) module enablement set. client_module_enabled() checks
-- these rows first, then falls back to the tenant feature flags, then global
-- defaults. Route-level gating with these flags lands in later phases; this
-- ships the data + management UI + helper.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE client_modules (
    id         VARCHAR(36)  PRIMARY KEY,
    tenant_id  VARCHAR(36)  NOT NULL,
    company_id VARCHAR(36)  NOT NULL,
    module     VARCHAR(100) NOT NULL,
    enabled    BOOLEAN      DEFAULT TRUE,
    created_at DATETIME     NOT NULL,
    UNIQUE KEY uk_company_module (tenant_id, company_id, module),
    INDEX idx_tenant (tenant_id),
    INDEX idx_company (company_id)
);
