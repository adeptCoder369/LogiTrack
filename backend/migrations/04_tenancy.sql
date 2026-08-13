-- 04: multi-tenant core (Phase 0).
--
-- Adds the tenants table, a tenant_id column on every data table (all
-- existing rows are backfilled to the platform tenant), tenant-scoped unique
-- indexes, and the seeded platform tenant row.
--
-- The five previously-global unique constraints (mobile, vehicle_number,
-- product_code, depot+product, company+product) become multi-column uniques
-- that include tenant_id, so two tenants can own the same mobile number,
-- truck registration or product code.
--
-- otps and permissions intentionally stay global (Phase 0 keeps a single
-- role-matrix row and auth-level OTP flows).
--
-- init_db() calls Base.metadata.create_all(), which only creates *missing
-- tables* -- it never alters an existing one. Apply this by hand, BEFORE
-- restarting the service on the matching code, otherwise every SELECT against
-- the altered tables fails with "Unknown column".
--
-- Not idempotent: MySQL has no ADD COLUMN IF NOT EXISTS. Re-running errors
-- 1060/1091.

-- ============ 1. TENANTS TABLE + PLATFORM SEED ============

CREATE TABLE tenants (
    id                 VARCHAR(36)  PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    slug               VARCHAR(100) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'active',
    subscription_plan  VARCHAR(50)  DEFAULT NULL,
    branding           JSON         DEFAULT NULL,
    feature_flags      JSON         DEFAULT NULL,
    created_at         DATETIME     NOT NULL,
    UNIQUE KEY uk_slug (slug)
);

-- Deterministic UUID mirrored by PLATFORM_TENANT_ID in backend/tenant.py.
INSERT INTO tenants (id, name, slug, status, subscription_plan, branding, feature_flags, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Platform', 'platform', 'active', 'platform',
        JSON_OBJECT('name', 'IBRMCO'), JSON_OBJECT(), NOW());

-- ============ 2. TENANT_ID COLUMNS + BACKFILL ============

ALTER TABLE users               ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE companies           ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE company_users       ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE transporters        ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE trucks              ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE products            ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE depots              ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE depot_inventory     ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE company_inventory   ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE delivery_orders     ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE liftings            ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE pickups             ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE purchase_orders     ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE verified_trucks     ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE railway_zones       ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE railway_sidings     ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE reports             ADD COLUMN tenant_id VARCHAR(36) NULL;

UPDATE users             SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE companies         SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE company_users     SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE transporters      SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE trucks            SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE products          SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE depots            SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE depot_inventory   SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE company_inventory SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE delivery_orders   SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE liftings          SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE pickups           SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE purchase_orders   SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE verified_trucks   SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE railway_zones     SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE railway_sidings   SET tenant_id = '11111111-1111-1111-1111-111111111111';
UPDATE reports           SET tenant_id = '11111111-1111-1111-1111-111111111111';

ALTER TABLE users             MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE companies         MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE company_users     MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE transporters      MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE trucks            MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE products          MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE depots            MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE depot_inventory   MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE company_inventory MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE delivery_orders   MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE liftings          MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE pickups           MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE purchase_orders   MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE verified_trucks   MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE railway_zones     MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE railway_sidings   MODIFY tenant_id VARCHAR(36) NOT NULL;
ALTER TABLE reports           MODIFY tenant_id VARCHAR(36) NOT NULL;

-- ============ 3. TENANT-SCOPED UNIQUE INDEXES ============

ALTER TABLE users           DROP KEY uk_mobile;
ALTER TABLE users           ADD UNIQUE KEY uk_mobile (tenant_id, mobile);

ALTER TABLE trucks          DROP KEY uk_vehicle_number;
ALTER TABLE trucks          ADD UNIQUE KEY uk_vehicle_number (tenant_id, vehicle_number);

ALTER TABLE products        DROP KEY uk_product_code;
ALTER TABLE products        ADD UNIQUE KEY uk_product_code (tenant_id, product_code);

ALTER TABLE depot_inventory DROP KEY uk_depot_product;
ALTER TABLE depot_inventory ADD UNIQUE KEY uk_depot_product (tenant_id, depot_id, product_id);

ALTER TABLE company_inventory DROP KEY uk_company_product;
ALTER TABLE company_inventory ADD UNIQUE KEY uk_company_product (tenant_id, company_id, product_id);

-- ============ 4. TENANT INDEXES ============

ALTER TABLE users             ADD INDEX idx_tenant (tenant_id);
ALTER TABLE companies         ADD INDEX idx_tenant (tenant_id);
ALTER TABLE company_users     ADD INDEX idx_tenant (tenant_id);
ALTER TABLE transporters      ADD INDEX idx_tenant (tenant_id);
ALTER TABLE trucks            ADD INDEX idx_tenant (tenant_id);
ALTER TABLE products          ADD INDEX idx_tenant (tenant_id);
ALTER TABLE depots            ADD INDEX idx_tenant (tenant_id);
ALTER TABLE depot_inventory   ADD INDEX idx_tenant (tenant_id);
ALTER TABLE company_inventory ADD INDEX idx_tenant (tenant_id);
ALTER TABLE delivery_orders   ADD INDEX idx_tenant (tenant_id);
ALTER TABLE liftings          ADD INDEX idx_tenant (tenant_id);
ALTER TABLE pickups           ADD INDEX idx_tenant (tenant_id);
ALTER TABLE purchase_orders   ADD INDEX idx_tenant (tenant_id);
ALTER TABLE verified_trucks   ADD INDEX idx_tenant (tenant_id);
ALTER TABLE railway_zones     ADD INDEX idx_tenant (tenant_id);
ALTER TABLE railway_sidings   ADD INDEX idx_tenant (tenant_id);
ALTER TABLE reports           ADD INDEX idx_tenant (tenant_id);
