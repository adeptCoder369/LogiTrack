-- 21: usage logs (Phase 6).
--
-- Per-request log for SaaS usage tracking. Tenant-scoped; retention
-- is 30 days by default (configurable via tenants.feature_flags).
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE usage_logs (
    id            VARCHAR(36)  PRIMARY KEY,
    tenant_id     VARCHAR(36)  DEFAULT NULL,
    user_id       VARCHAR(36)  DEFAULT NULL,
    method        VARCHAR(10)  NOT NULL,
    path          VARCHAR(500) NOT NULL,
    status_code   INT          DEFAULT NULL,
    request_size  INT          DEFAULT 0,
    response_size INT          DEFAULT 0,
    duration_ms   INT          DEFAULT 0,
    created_at    DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_created (created_at)
);
