-- Run only after the application release using contextual scoring is live.
UPDATE moderation_keywords
SET active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE policy_version = 'anti-solicitation-2026-07-15';

UPDATE moderation_policy_versions
SET active = true,
    activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP)
WHERE policy_version = 'anti-solicitation-2026-07-15';
