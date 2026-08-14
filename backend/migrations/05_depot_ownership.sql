-- 05: depot ownership (Phase 1).
--
-- Adds depots.company_id so every depot is owned by a company. The column is
-- nullable: legacy depots have no owner and stay visible through depot-access
-- rules until an admin assigns one via the Depots page. New/updated depots
-- are enforced to carry a company at the API layer.
--
-- Not idempotent: MySQL has no ADD COLUMN IF NOT EXISTS. Re-running errors 1060.

ALTER TABLE depots
  ADD COLUMN company_id VARCHAR(36) NULL,
  ADD INDEX idx_company (company_id);
