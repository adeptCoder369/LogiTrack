-- 10: entity roles + client hierarchy (Phase 2).
--
-- companies.entity_roles: multi-role classification (Lead | Client |
-- Company | Source) - a vendor can also be a client.
-- companies.parent_client_id: client hierarchy (parent / child).
-- client_offices: head office + branches (office_type, is_head_office).
-- client_factories: one factory per product per company (unique key).
-- purchase_orders.billing_company_id: PO issued by a child, billed under
-- its parent.
--
-- Not idempotent: re-running errors 1050/1060.

ALTER TABLE companies
  ADD COLUMN entity_roles     TEXT         DEFAULT NULL,
  ADD COLUMN parent_client_id VARCHAR(36)  DEFAULT NULL,
  ADD INDEX idx_parent (parent_client_id);

CREATE TABLE client_offices (
    id               VARCHAR(36)  PRIMARY KEY,
    tenant_id        VARCHAR(36)  NOT NULL,
    company_id       VARCHAR(36)  NOT NULL,
    name             VARCHAR(255) NOT NULL,
    office_type      VARCHAR(50)  DEFAULT 'Branch',
    is_head_office   BOOLEAN      DEFAULT FALSE,
    address          TEXT         DEFAULT NULL,
    city             VARCHAR(100) DEFAULT NULL,
    state            VARCHAR(100) DEFAULT NULL,
    pin_code         VARCHAR(20)  DEFAULT NULL,
    contact_person   VARCHAR(255) DEFAULT NULL,
    contact_mobile   VARCHAR(50)  DEFAULT NULL,
    created_at       DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_company (company_id)
);

CREATE TABLE client_factories (
    id           VARCHAR(36)  PRIMARY KEY,
    tenant_id    VARCHAR(36)  NOT NULL,
    company_id   VARCHAR(36)  NOT NULL,
    factory_name VARCHAR(255) NOT NULL,
    address      TEXT         DEFAULT NULL,
    city         VARCHAR(100) DEFAULT NULL,
    state        VARCHAR(100) DEFAULT NULL,
    product_id   VARCHAR(36)  NOT NULL,
    created_at   DATETIME     NOT NULL,
    UNIQUE KEY uk_company_product (tenant_id, company_id, product_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_company (company_id),
    INDEX idx_product (product_id)
);

ALTER TABLE purchase_orders
  ADD COLUMN billing_company_id   VARCHAR(36)  DEFAULT NULL,
  ADD COLUMN billing_company_name VARCHAR(255) DEFAULT NULL,
  ADD INDEX idx_billing_company (billing_company_id);
