-- 11: leads (Phase 2).
--
-- Sales/Purchase leads tracked before they become clients. Conversion
-- (POST /leads/{id}/convert) creates a client company, links the assigned
-- employee's user record to it, and stamps converted_company_id.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE leads (
    id                    VARCHAR(36)  PRIMARY KEY,
    tenant_id             VARCHAR(36)  NOT NULL,
    lead_type             VARCHAR(20)  NOT NULL DEFAULT 'Sales',
    company_id            VARCHAR(36)  DEFAULT NULL,
    company_name          VARCHAR(255) DEFAULT NULL,
    status                VARCHAR(50)  NOT NULL DEFAULT 'New',
    parent_client_id      VARCHAR(36)  DEFAULT NULL,
    assigned_employee_id  VARCHAR(36)  DEFAULT NULL,
    assigned_employee_name VARCHAR(255) DEFAULT NULL,
    contact_person        VARCHAR(255) DEFAULT NULL,
    contact_mobile        VARCHAR(50)  DEFAULT NULL,
    notes                 TEXT         DEFAULT NULL,
    assigned_products     TEXT         DEFAULT NULL,
    assigned_depots       TEXT         DEFAULT NULL,
    converted_company_id  VARCHAR(36)  DEFAULT NULL,
    converted_at          DATETIME     DEFAULT NULL,
    created_by            VARCHAR(36)  DEFAULT NULL,
    created_at            DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_type (lead_type),
    INDEX idx_assigned (assigned_employee_id)
);
