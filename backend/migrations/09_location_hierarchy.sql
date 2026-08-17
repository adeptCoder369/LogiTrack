-- 09: location hierarchy (Phase 2).
--
-- Region -> Location -> Depot. regions group locations; locations group
-- depots (depots.location_id). Roll-up queries (reports/analytics) aggregate
-- inventory along this chain.
--
-- Not idempotent: re-running errors 1050/1060.

CREATE TABLE regions (
    id         VARCHAR(36)  PRIMARY KEY,
    tenant_id  VARCHAR(36)  NOT NULL,
    name       VARCHAR(255) NOT NULL,
    code       VARCHAR(50)  DEFAULT NULL,
    created_at DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id)
);

CREATE TABLE locations (
    id         VARCHAR(36)  PRIMARY KEY,
    tenant_id  VARCHAR(36)  NOT NULL,
    region_id  VARCHAR(36)  DEFAULT NULL,
    name       VARCHAR(255) NOT NULL,
    city       VARCHAR(100) DEFAULT NULL,
    state      VARCHAR(100) DEFAULT NULL,
    created_at DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_region (region_id)
);

ALTER TABLE depots
  ADD COLUMN location_id VARCHAR(36) NULL,
  ADD INDEX idx_location (location_id);
