-- Admin notifications, email consent, campaigns, moderation and audit foundation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_priority_check'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_audience_check'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_audience_check
      CHECK (audience IN ('user', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_admin_unread
  ON notifications (audience, read, priority, created_at DESC)
  WHERE audience = 'admin';

CREATE TABLE IF NOT EXISTS email_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  campaign_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  campaign_opt_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'default',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_preferences_opt_in_timestamp_check
    CHECK (
      campaign_opt_in = FALSE
      OR campaign_opt_in_at IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS email_suppression_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'campaign',
  subject TEXT NOT NULL,
  preheader TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  cta_label TEXT,
  cta_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_templates_purpose_check
    CHECK (purpose IN ('campaign', 'password_reset'))
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  tested_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  eligible_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_campaigns_status_check
    CHECK (status IN ('draft', 'tested', 'ready', 'sending', 'sent', 'cancelled', 'failed'))
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  skip_reason TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_campaign_recipients_status_check
    CHECK (status IN ('queued', 'skipped_opt_out', 'skipped_no_consent', 'skipped_suppressed', 'skipped_banned', 'sent', 'error')),
  CONSTRAINT email_campaign_recipient_unique
    UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_status
  ON email_campaign_recipients (campaign_id, status);

CREATE TABLE IF NOT EXISTS email_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_send_logs_status_check
    CHECK (status IN ('sent', 'blocked', 'error'))
);

CREATE TABLE IF NOT EXISTS moderation_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL DEFAULT 'medium',
  action TEXT NOT NULL DEFAULT 'flag',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT moderation_keywords_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT moderation_keywords_action_check
    CHECK (action IN ('flag', 'hide', 'escalate'))
);

CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT NOT NULL,
  source_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  reason TEXT NOT NULL,
  matched_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  excerpt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT moderation_queue_source_type_check
    CHECK (source_type IN ('message', 'profile', 'event', 'user')),
  CONSTRAINT moderation_queue_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT moderation_queue_status_check
    CHECK (status IN ('new', 'in_review', 'ignored', 'actioned', 'escalated'))
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_created
  ON moderation_queue (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_user
  ON moderation_queue (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON admin_audit_log (target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  event TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_logs_level_check
    CHECK (level IN ('info', 'warn', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_level_created
  ON auth_logs (level, created_at DESC);
