-- 22: subscriptions (Phase 6).
--
-- Per-tenant subscription linked to tenants.subscription_plan. Billing
-- provider webhooks update status/current_period.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE subscriptions (
    id                       VARCHAR(36)  PRIMARY KEY,
    tenant_id                VARCHAR(36)  NOT NULL,
    plan                     VARCHAR(100) NOT NULL,
    status                   VARCHAR(50)  NOT NULL DEFAULT 'active',
    provider                 VARCHAR(50)  DEFAULT NULL,
    provider_subscription_id VARCHAR(255) DEFAULT NULL,
    current_period_start     DATETIME     DEFAULT NULL,
    current_period_end       DATETIME     DEFAULT NULL,
    created_at               DATETIME     NOT NULL,
    UNIQUE KEY uk_tenant (tenant_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status)
);

CREATE TABLE billing_events (
    id          VARCHAR(36)  PRIMARY KEY,
    tenant_id   VARCHAR(36)  DEFAULT NULL,
    provider    VARCHAR(50)  NOT NULL,
    event_type  VARCHAR(100) NOT NULL,
    payload     TEXT         DEFAULT NULL,
    created_at  DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_provider (provider)
);
