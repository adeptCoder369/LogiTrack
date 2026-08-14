-- 07: explicit purchase-order source columns (Phase 1).
--
-- The PO "source" was overloaded onto depot_id/depot_name + source_type.
-- These explicit columns make the source editable and unambiguous. Existing
-- rows are backfilled from depot_id/depot_name; the legacy columns are kept
-- so old API clients keep working.
--
-- Not idempotent: re-running errors 1060.

ALTER TABLE purchase_orders
  ADD COLUMN source_id   VARCHAR(36)  NULL,
  ADD COLUMN source_name VARCHAR(255) NULL,
  ADD INDEX idx_source (source_id);

UPDATE purchase_orders SET source_id = depot_id, source_name = depot_name;
