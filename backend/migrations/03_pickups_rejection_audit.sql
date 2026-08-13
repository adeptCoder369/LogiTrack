-- 03: keep the pickup rejection audit trail.
--
-- routes/pickups.py (reject handler) writes who rejected a pickup, when, and
-- why. None of those columns existed, so db_compat filtered them out against
-- __table__.columns and a rejected pickup recorded only status='rejected' --
-- the reason, the user and the timestamp were discarded on every rejection.
--
-- Names and types mirror the liftings table's rejection block, which already
-- had these columns, so the same concept is described identically in both.
--
-- init_db() calls Base.metadata.create_all(), which only creates *missing
-- tables* -- it never alters an existing one. Apply this by hand, BEFORE
-- restarting the service on the matching code, otherwise every SELECT against
-- pickups fails with "Unknown column".
--
-- Not idempotent: MySQL has no ADD COLUMN IF NOT EXISTS. Re-running errors 1060.

ALTER TABLE pickups
  ADD COLUMN rejected_by       VARCHAR(36)  NULL,
  ADD COLUMN rejected_by_name  VARCHAR(255) NULL,
  ADD COLUMN rejected_at       DATETIME     NULL,
  ADD COLUMN rejection_reason  TEXT         NULL;
