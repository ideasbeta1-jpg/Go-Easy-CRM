-- Add is_active flag to track which quote is currently valid (invalidated on regeneration)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;

-- For existing data: deactivate all older quotes, keep only the most recent per lead active
UPDATE quotes q
SET is_active = FALSE
WHERE q.created_at < (
  SELECT MAX(q2.created_at)
  FROM quotes q2
  WHERE q2.lead_id = q.lead_id
);

-- Index for fast active quote lookup per lead
CREATE INDEX IF NOT EXISTS idx_quotes_lead_active ON quotes (lead_id, is_active, created_at DESC);
