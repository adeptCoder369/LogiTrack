-- 20: inventory locks (Phase 5).
--
-- locked_qty reserves stock for in-flight transfers (Requested/Approved/
-- Dispatched) so it cannot be consumed by other operations. Lock at
-- Request, release on Rejected/Cancelled, release + move on Received.
--
-- Not idempotent: re-running errors 1060.

ALTER TABLE depot_inventory
  ADD COLUMN locked_qty FLOAT DEFAULT 0;

ALTER TABLE company_inventory
  ADD COLUMN locked_qty FLOAT DEFAULT 0;
