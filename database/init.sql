-- ─────────────────────────────────────────────────────────────────────────────
-- SaaS Automation Builder — Database Schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'unpaid');
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'error', 'archived');
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'success', 'failed', 'canceled', 'timeout');
CREATE TYPE trigger_type AS ENUM ('webhook', 'schedule', 'manual', 'event');
CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'execute', 'login', 'logout', 'invite', 'revoke');

-- ── Organizations ─────────────────────────────────────────────────────────────

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  logo_url      TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  plan          subscription_plan NOT NULL DEFAULT 'free',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash     TEXT,                              -- null for OAuth-only users
  full_name         VARCHAR(255),
  avatar_url        TEXT,
  role              user_role NOT NULL DEFAULT 'member',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  mfa_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret        TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',       -- timezone, preferences, etc.
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);

-- ── OAuth identities ──────────────────────────────────────────────────────────

CREATE TABLE oauth_identities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        VARCHAR(50) NOT NULL,               -- google | github | microsoft
  provider_id     VARCHAR(255) NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  profile         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_user ON oauth_identities(user_id);

-- ── Refresh tokens ────────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ── Email verifications ───────────────────────────────────────────────────────

CREATE TABLE email_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Password resets ───────────────────────────────────────────────────────────

CREATE TABLE password_resets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Subscriptions ─────────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id    VARCHAR(255),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan                  subscription_plan NOT NULL DEFAULT 'free',
  status                subscription_status NOT NULL DEFAULT 'active',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end_at          TIMESTAMPTZ,
  seats                 INTEGER NOT NULL DEFAULT 1,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ── Integrations ──────────────────────────────────────────────────────────────

CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  provider        VARCHAR(100) NOT NULL,              -- slack | github | gmail | etc.
  display_name    VARCHAR(255),
  status          integration_status NOT NULL DEFAULT 'pending',
  credentials     JSONB NOT NULL DEFAULT '{}',        -- encrypted at app layer
  config          JSONB NOT NULL DEFAULT '{}',
  last_synced_at  TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_integrations_provider ON integrations(organization_id, provider);

-- ── Workflows ─────────────────────────────────────────────────────────────────

CREATE TABLE workflows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  status          workflow_status NOT NULL DEFAULT 'draft',
  trigger_type    trigger_type NOT NULL DEFAULT 'manual',
  trigger_config  JSONB NOT NULL DEFAULT '{}',        -- webhook url, cron expr, etc.
  definition      JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',  -- flow graph
  version         INTEGER NOT NULL DEFAULT 1,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_template     BOOLEAN NOT NULL DEFAULT FALSE,
  folder_id       UUID,
  last_run_at     TIMESTAMPTZ,
  last_run_status execution_status,
  run_count       INTEGER NOT NULL DEFAULT 0,
  error_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_org    ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(organization_id, status);
CREATE INDEX idx_workflows_tags   ON workflows USING GIN(tags);

-- ── Workflow versions (history) ───────────────────────────────────────────────

CREATE TABLE workflow_versions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  definition  JSONB NOT NULL,
  changelog   TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, version)
);

CREATE INDEX idx_wf_versions ON workflow_versions(workflow_id);

-- ── Workflow executions ───────────────────────────────────────────────────────

CREATE TABLE workflow_executions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  triggered_by    UUID REFERENCES users(id),
  trigger_type    trigger_type NOT NULL,
  status          execution_status NOT NULL DEFAULT 'pending',
  input_data      JSONB NOT NULL DEFAULT '{}',
  output_data     JSONB,
  error           JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  steps_total     INTEGER NOT NULL DEFAULT 0,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_org     ON workflow_executions(organization_id);
CREATE INDEX idx_executions_status  ON workflow_executions(status);
CREATE INDEX idx_executions_created ON workflow_executions(created_at DESC);

-- ── Execution step logs ───────────────────────────────────────────────────────

CREATE TABLE execution_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id    UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id         VARCHAR(100) NOT NULL,
  node_type       VARCHAR(100) NOT NULL,
  node_name       VARCHAR(255),
  status          execution_status NOT NULL DEFAULT 'pending',
  input_data      JSONB,
  output_data     JSONB,
  error           JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_steps_execution ON execution_steps(execution_id);

-- ── Webhook endpoints ─────────────────────────────────────────────────────────

CREATE TABLE webhook_endpoints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  secret          TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_methods TEXT[] NOT NULL DEFAULT '{POST}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_workflow ON webhook_endpoints(workflow_id);

-- ── API keys ──────────────────────────────────────────────────────────────────

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,
  key_prefix      VARCHAR(10) NOT NULL,               -- first 8 chars for display
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org  ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ── Audit logs ────────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  action          audit_action NOT NULL,
  resource_type   VARCHAR(100) NOT NULL,
  resource_id     UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org  ON audit_logs(organization_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);

-- ── Usage metrics (time-series) ───────────────────────────────────────────────

CREATE TABLE usage_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_name     VARCHAR(100) NOT NULL,
  metric_value    NUMERIC NOT NULL DEFAULT 0,
  dimensions      JSONB NOT NULL DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_org  ON usage_metrics(organization_id, metric_name);
CREATE INDEX idx_metrics_time ON usage_metrics(recorded_at DESC);

-- ── Invitations ───────────────────────────────────────────────────────────────

CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by      UUID NOT NULL REFERENCES users(id),
  email           VARCHAR(255) NOT NULL,
  role            user_role NOT NULL DEFAULT 'member',
  token           TEXT NOT NULL UNIQUE,
  accepted_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_org ON invitations(organization_id);

-- ── Updated_at triggers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','users','oauth_identities','subscriptions',
    'integrations','workflows'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
