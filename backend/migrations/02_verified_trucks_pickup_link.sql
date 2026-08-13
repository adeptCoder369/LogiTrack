-- 02: restore the verified_trucks -> pickups link.
--
-- routes/pickups.py (verify handler) writes pickup_id, final_verified_at and
-- both slip upload histories onto the verified_trucks row, but none of those
-- columns existed. db_compat filters unknown keys against __table__.columns and
-- drops them silently, so:
--
--   * the pickup_id lookup that de-duplicates the row could never match, and a
--     fresh verified_trucks row was created on every re-verify;
--   * final_verified_at and both upload histories were discarded on write.
--
-- init_db() calls Base.metadata.create_all(), which only creates *missing
-- tables* -- it never alters an existing one. Apply this by hand, BEFORE
-- restarting the service on the matching code, otherwise every SELECT against
-- verified_trucks fails with "Unknown column".
--
-- Not idempotent: MySQL has no ADD COLUMN IF NOT EXISTS. Re-running errors 1060.

ALTER TABLE verified_trucks
  ADD COLUMN pickup_id                      VARCHAR(36) NULL,
  ADD COLUMN final_verified_at              DATETIME    NULL,
  ADD COLUMN tare_slip_upload_history       JSON        NULL,
  ADD COLUMN weightment_slip_upload_history JSON        NULL,
  ADD INDEX idx_pickup (pickup_id);
