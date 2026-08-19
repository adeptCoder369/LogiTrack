-- 18: stock transfers + audit ledger (Phase 5).
--
-- Inter-depot / inter-company stock movement. State machine:
-- Requested -> Approved -> Dispatched -> Received (terminal)
--         \-> Rejected (terminal)    \-> Cancelled (terminal)
-- Every transition appends a row to stock_transfer_audit.
--
-- Not idempotent: re-running errors 1050.

CREATE TABLE stock_transfers (
    id                 VARCHAR(36)  PRIMARY KEY,
    tenant_id          VARCHAR(36)  NOT NULL,
    transfer_no        VARCHAR(100) NOT NULL,
    product_id         VARCHAR(36)  NOT NULL,
    product_name       VARCHAR(255) DEFAULT NULL,
    quantity_mt        FLOAT        NOT NULL DEFAULT 0,
    from_type          VARCHAR(20)  NOT NULL,
    from_id            VARCHAR(36)  NOT NULL,
    from_name          VARCHAR(255) DEFAULT NULL,
    to_type            VARCHAR(20)  NOT NULL,
    to_id              VARCHAR(36)  NOT NULL,
    to_name            VARCHAR(255) DEFAULT NULL,
    status             VARCHAR(50)  NOT NULL DEFAULT 'Requested',
    requested_by       VARCHAR(36)  DEFAULT NULL,
    requested_by_name  VARCHAR(255) DEFAULT NULL,
    approved_by        VARCHAR(36)  DEFAULT NULL,
    approved_by_name   VARCHAR(255) DEFAULT NULL,
    dispatched_by      VARCHAR(36)  DEFAULT NULL,
    dispatched_by_name VARCHAR(255) DEFAULT NULL,
    received_by        VARCHAR(36)  DEFAULT NULL,
    received_by_name   VARCHAR(255) DEFAULT NULL,
    request_notes      TEXT         DEFAULT NULL,
    approval_notes     TEXT         DEFAULT NULL,
    dispatch_notes     TEXT         DEFAULT NULL,
    receive_notes      TEXT         DEFAULT NULL,
    requested_at       DATETIME     DEFAULT NULL,
    approved_at        DATETIME     DEFAULT NULL,
    dispatched_at      DATETIME     DEFAULT NULL,
    received_at        DATETIME     DEFAULT NULL,
    created_at         DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_from (from_type, from_id),
    INDEX idx_to (to_type, to_id),
    INDEX idx_product (product_id)
);

CREATE TABLE stock_transfer_audit (
    id          VARCHAR(36)  PRIMARY KEY,
    tenant_id   VARCHAR(36)  NOT NULL,
    transfer_id VARCHAR(36)  NOT NULL,
    event       VARCHAR(50)  NOT NULL,
    actor_id    VARCHAR(36)  DEFAULT NULL,
    actor_name  VARCHAR(255) DEFAULT NULL,
    payload     TEXT         DEFAULT NULL,
    created_at  DATETIME     NOT NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_transfer (transfer_id)
);
