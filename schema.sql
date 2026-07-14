-- Schéma SQL pour le système de matching du Love Hôtel

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table des utilisateurs
CREATE TABLE users
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    avatar VARCHAR(255) NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE NULL,
    email_verified BOOLEAN DEFAULT FALSE NULL,
    -- Renamed from is_verified and made nullable
    is_banned BOOLEAN DEFAULT FALSE NULL,
    -- Made nullable
    status TEXT DEFAULT 'active' NULL,
    -- Made nullable
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    -- Added for password reset
    password_reset_token_expires_at TIMESTAMPTZ NULL,
    -- Added for password reset token expiry
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NULL,
    -- Made nullable
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NULL,
    -- Made nullable
    last_seen_at TIMESTAMPTZ NULL
    -- Last authenticated activity for online presence
);

-- Table des profils utilisateurs
CREATE TABLE user_profiles
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NULL,
    -- 'couple', 'single_male', 'single_female'
    age INTEGER NULL,
    -- Explicitly NULL
    orientation VARCHAR(50) NULL,
    -- Explicitly NULL
    bio TEXT NULL,
    -- Explicitly NULL
    location VARCHAR(255) NULL,
    -- Explicitly NULL
    gender VARCHAR(50) NULL,
    -- Explicitly NULL
    birthday DATE NULL,
    -- Explicitly NULL
    interests TEXT NULL,
    -- Explicitly NULL, Storing as JSON string
    featured BOOLEAN DEFAULT FALSE NULL,
    -- Added column
    display_profile BOOLEAN DEFAULT TRUE NULL,
    -- Controls whether the profile appears in discovery/search
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NULL,
    -- Explicitly NULL
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NULL
    -- Explicitly NULL
);

-- Table des préférences utilisateurs
CREATE TABLE user_preferences
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interested_in_restaurant BOOLEAN DEFAULT FALSE,
    interested_in_events BOOLEAN DEFAULT FALSE,
    interested_in_dating BOOLEAN DEFAULT FALSE,
    prefer_curtain_open BOOLEAN DEFAULT FALSE,
    interested_in_lolib BOOLEAN DEFAULT FALSE,
    suggestions TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de rencontres recherchées
CREATE TABLE user_meeting_types
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friendly BOOLEAN DEFAULT FALSE,
    romantic BOOLEAN DEFAULT FALSE,
    playful BOOLEAN DEFAULT FALSE,
    open_curtains BOOLEAN DEFAULT FALSE,
    libertine BOOLEAN DEFAULT FALSE,
    open_to_other_couples BOOLEAN DEFAULT FALSE,
    specific_preferences TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des options supplémentaires
CREATE TABLE user_additional_options
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    join_exclusive_events BOOLEAN DEFAULT FALSE,
    premium_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des matchs entre utilisateurs
CREATE TABLE user_matches
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2),
    -- Score de compatibilité entre 0 et 100
    status VARCHAR(50) DEFAULT 'pending',
    -- 'pending', 'accepted', 'rejected'
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_match UNIQUE (user_id_1, user_id_2)
);

-- Table des conversations
CREATE TABLE conversations
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des participants aux conversations
CREATE TABLE conversation_participants
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_participant UNIQUE (conversation_id, user_id)
);

-- Table des messages
CREATE TABLE messages
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    -- Renamed from 'read'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des pieces jointes de messagerie
CREATE TABLE IF NOT EXISTS message_attachments
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
    file_name TEXT,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    duration_seconds INTEGER,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications in-app
CREATE TABLE IF NOT EXISTS notifications
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    link VARCHAR(500),
    read BOOLEAN DEFAULT FALSE,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    category TEXT,
    audience TEXT NOT NULL DEFAULT 'user'
        CHECK (audience IN ('user', 'admin')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Preferences et exclusions email
CREATE TABLE IF NOT EXISTS email_preferences
(
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    campaign_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    campaign_opt_in_at TIMESTAMPTZ,
    opted_out_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'default',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_preferences_opt_in_timestamp_check
        CHECK (campaign_opt_in = FALSE OR campaign_opt_in_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS email_suppression_list
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL DEFAULT 'manual',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Paramètres applicatifs administrables
CREATE TABLE IF NOT EXISTS options
(
    name TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Templates et campagnes email admin
CREATE TABLE IF NOT EXISTS email_templates
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL DEFAULT 'campaign'
        CHECK (purpose IN ('campaign', 'password_reset')),
    subject TEXT NOT NULL,
    preheader TEXT,
    body_html TEXT NOT NULL,
    body_text TEXT,
    cta_label TEXT,
    cta_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_campaigns
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'tested', 'ready', 'sending', 'sent', 'cancelled', 'failed')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    tested_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    eligible_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'skipped_opt_out', 'skipped_no_consent', 'skipped_suppressed', 'skipped_banned', 'sent', 'error')),
    skip_reason TEXT,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_campaign_recipient_unique UNIQUE (campaign_id, email)
);

CREATE TABLE IF NOT EXISTS email_send_logs
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'blocked', 'error')),
    provider_message_id TEXT,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Moderation, audit et logs techniques admin
CREATE TABLE IF NOT EXISTS moderation_keywords
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,
    severity TEXT NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    action TEXT NOT NULL DEFAULT 'flag'
        CHECK (action IN ('flag', 'hide', 'escalate')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_queue
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type TEXT NOT NULL
        CHECK (source_type IN ('message', 'profile', 'event', 'user')),
    source_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    severity TEXT NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'in_review', 'ignored', 'actioned', 'escalated')),
    reason TEXT NOT NULL,
    matched_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    excerpt TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_log
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_logs
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email TEXT,
    level TEXT NOT NULL DEFAULT 'info'
        CHECK (level IN ('info', 'warn', 'error')),
    event TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des photos utilisateurs
CREATE TABLE photos
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    url VARCHAR(255) NOT NULL
);

-- Table des événements
CREATE TABLE events
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    prix_personne_seule DECIMAL(10,2) DEFAULT 0, -- Ajouté
    prix_couple DECIMAL(10,2) DEFAULT 0,        -- Ajouté
    max_participants INTEGER DEFAULT 50,
    image VARCHAR(500),
    category VARCHAR(100),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table des participants aux événements
CREATE TABLE event_participants
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_participation UNIQUE (event_id, user_id)
);

-- Table des demandes de conciergerie
CREATE TABLE IF NOT EXISTS conciergerie_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
  response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  besoin TEXT NOT NULL,
  budget VARCHAR(100),
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_meeting_types_user_id ON user_meeting_types(user_id);
CREATE INDEX idx_user_additional_options_user_id ON user_additional_options(user_id);
CREATE INDEX idx_user_matches_user_id_1 ON user_matches(user_id_1);
CREATE INDEX idx_user_matches_user_id_2 ON user_matches(user_id_2);
CREATE INDEX IF NOT EXISTS idx_user_matches_accepted_at ON user_matches(accepted_at) WHERE status = 'accepted';
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id, sort_order, created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_admin_unread ON notifications(audience, read, priority, created_at DESC) WHERE audience = 'admin';
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_status ON email_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_created ON moderation_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_user ON moderation_queue(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_level_created ON auth_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conciergerie_requests_created ON conciergerie_requests(created_at DESC);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_creator ON events(creator_id);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
