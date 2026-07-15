-- Immediate operational rollback: keep evidence/workflow tables, stop automated scoring.
UPDATE moderation_keywords
SET active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE policy_version = 'anti-solicitation-2026-07-15';

UPDATE moderation_policy_versions
SET active = false
WHERE policy_version = 'anti-solicitation-2026-07-15';
