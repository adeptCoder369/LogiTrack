-- 12: firms + firm access grants (Phase 2).
--
-- firms: parent/child structure mirroring the client model (head office,
-- branches, factories). firm_access grants a user access to a firm scoped to
-- specific product x depot pairs (the "5 products, 3 depots -> 1 product &
-- 2 depots" case). Enforcement of the grants lands with Phase 3 employees;
-- this phase ships the data model + management UI + resolver helper.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE firms (
    id             VARCHAR(36)  PRIMARY KEY,
    tenant_id      VARCHAR(36)  NOT NULL,
    name           VARCHAR(255) NOT NULL,
    parent_firm_id VARCHAR(36)  DEFAULT NULL,
    company_id     VARCHAR(36)  DEFAULT NULL,
    address        TEXT         DEFAULT NULL,
    city           VARCHAR(100) DEFAULT NULL,
    state          VARCHAR(100) DEFAULT NULL,
    contact_person VARCHAR(255) DEFAULT NULL,
    contact_mobile VARCHAR(50)  DEFAULT NULL,
    created_at     DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_parent (parent_firm_id),
    INDEX idx_company (company_id)
);

CREATE TABLE firm_offices (
    id             VARCHAR(36)  PRIMARY KEY,
    tenant_id      VARCHAR(36)  NOT NULL,
    firm_id        VARCHAR(36)  NOT NULL,
    name           VARCHAR(255) NOT NULL,
    office_type    VARCHAR(50)  DEFAULT 'Branch',
    is_head_office BOOLEAN      DEFAULT FALSE,
    address        TEXT         DEFAULT NULL,
    city           VARCHAR(100) DEFAULT NULL,
    state          VARCHAR(100) DEFAULT NULL,
    contact_person VARCHAR(255) DEFAULT NULL,
    contact_mobile VARCHAR(50)  DEFAULT NULL,
    created_at     DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_firm (firm_id)
);

CREATE TABLE firm_factories (
    id           VARCHAR(36)  PRIMARY KEY,
    tenant_id    VARCHAR(36)  NOT NULL,
    firm_id      VARCHAR(36)  NOT NULL,
    factory_name VARCHAR(255) NOT NULL,
    address      TEXT         DEFAULT NULL,
    city         VARCHAR(100) DEFAULT NULL,
    state        VARCHAR(100) DEFAULT NULL,
    product_id   VARCHAR(36)  NOT NULL,
    created_at   DATETIME     NOT NULL,
    UNIQUE KEY uk_firm_product (tenant_id, firm_id, product_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_firm (firm_id)
);

CREATE TABLE firm_access (
    id         VARCHAR(36)  PRIMARY KEY,
    tenant_id  VARCHAR(36)  NOT NULL,
    firm_id    VARCHAR(36)  NOT NULL,
    user_id    VARCHAR(36)  NOT NULL,
    product_id VARCHAR(36)  NOT NULL,
    depot_id   VARCHAR(36)  NOT NULL,
    created_at DATETIME     NOT NULL,
    UNIQUE KEY uk_firm_user_pair (tenant_id, firm_id, user_id, product_id, depot_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_firm (firm_id),
    INDEX idx_user (user_id)
);
