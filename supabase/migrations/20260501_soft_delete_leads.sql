-- Add soft-delete support to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Partial index for active leads (NULL deleted_at) to keep queries fast
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads (created_at DESC) WHERE deleted_at IS NULL;

-- RLS: existing policies already filter by user/agent, this ensures deleted leads
-- are excluded from all reads that don't explicitly request them.
-- Views that want archived leads must add: .not('deleted_at', 'is', null)
