-- 14: employees, departments, designations (Phase 3).
--
-- employees: internal (may have a login) / external (data only). Login
-- linkage: users.employee_id <-> employees.user_id. login_enabled=false
-- stores the employee without any login (infoEIGHT behavior).
--
-- Not idempotent: re-running errors 1050/1060.

CREATE TABLE departments (
    id          VARCHAR(36)  PRIMARY KEY,
    tenant_id   VARCHAR(36)  NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT         DEFAULT NULL,
    created_at  DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id)
);

CREATE TABLE designations (
    id            VARCHAR(36)  PRIMARY KEY,
    tenant_id     VARCHAR(36)  NOT NULL,
    name          VARCHAR(255) NOT NULL,
    department_id VARCHAR(36)  DEFAULT NULL,
    created_at    DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_department (department_id)
);

CREATE TABLE employees (
    id             VARCHAR(36)  PRIMARY KEY,
    tenant_id      VARCHAR(36)  NOT NULL,
    employee_type  VARCHAR(20)  NOT NULL DEFAULT 'Internal',
    employee_id    VARCHAR(100) DEFAULT NULL,
    name           VARCHAR(255) NOT NULL,
    mobile         VARCHAR(50)  DEFAULT NULL,
    email          VARCHAR(255) DEFAULT NULL,
    company_id     VARCHAR(36)  DEFAULT NULL,
    department_id  VARCHAR(36)  DEFAULT NULL,
    designation_id VARCHAR(36)  DEFAULT NULL,
    leads_scope    VARCHAR(20)  DEFAULT 'All',
    login_enabled  BOOLEAN      DEFAULT FALSE,
    user_id        VARCHAR(36)  DEFAULT NULL,
    address        TEXT         DEFAULT NULL,
    city           VARCHAR(100) DEFAULT NULL,
    state          VARCHAR(100) DEFAULT NULL,
    joined_at      VARCHAR(50)  DEFAULT NULL,
    created_at     DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_company (company_id),
    INDEX idx_department (department_id),
    INDEX idx_designation (designation_id),
    INDEX idx_user (user_id)
);

ALTER TABLE users
  ADD COLUMN employee_id VARCHAR(36) DEFAULT NULL,
  ADD INDEX idx_employee (employee_id);
