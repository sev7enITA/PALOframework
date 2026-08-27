CREATE TABLE IF NOT EXISTS palo_hub_login_transactions (
  state_hash text PRIMARY KEY,
  transaction_json jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS palo_hub_sessions (
  session_hash text PRIMARY KEY,
  session_json jsonb NOT NULL,
  tenant_id text NOT NULL,
  subject_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS palo_hub_sessions_expiry_idx ON palo_hub_sessions (expires_at);

CREATE TABLE IF NOT EXISTS palo_hub_simulations (
  receipt_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  actor_id text NOT NULL,
  input_digest text NOT NULL,
  record_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS palo_hub_simulations_tenant_digest_idx ON palo_hub_simulations (tenant_id, input_digest);

CREATE TABLE IF NOT EXISTS palo_hub_bundles (
  bundle_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  input_digest text NOT NULL,
  status text NOT NULL,
  record_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS palo_hub_bundles_current_digest_idx ON palo_hub_bundles (tenant_id, input_digest) WHERE status <> 'rejected';

CREATE TABLE IF NOT EXISTS palo_hub_audit_events (
  sequence bigserial PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  tenant_id text NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  target_id text,
  event_json jsonb NOT NULL,
  previous_digest text,
  event_digest text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS palo_hub_audit_tenant_sequence_idx ON palo_hub_audit_events (tenant_id, sequence DESC);

ALTER TABLE palo_hub_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE palo_hub_simulations FORCE ROW LEVEL SECURITY;
ALTER TABLE palo_hub_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE palo_hub_bundles FORCE ROW LEVEL SECURITY;
ALTER TABLE palo_hub_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE palo_hub_audit_events FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY palo_hub_simulations_tenant_policy ON palo_hub_simulations
    USING (tenant_id = current_setting('palo.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('palo.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY palo_hub_bundles_tenant_policy ON palo_hub_bundles
    USING (tenant_id = current_setting('palo.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('palo.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY palo_hub_audit_tenant_policy ON palo_hub_audit_events
    USING (tenant_id = current_setting('palo.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('palo.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
