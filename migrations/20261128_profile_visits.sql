-- Historique des visites de profils membres : une seule ligne par visiteur/profil,
-- conservée au plus 30 jours par le flux applicatif.
CREATE TABLE IF NOT EXISTS profile_visits (
  visitor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visited_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, visited_id),
  CONSTRAINT profile_visits_distinct_members CHECK (visitor_id <> visited_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_visits_visited_recent
  ON profile_visits (visited_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_visits_expiry
  ON profile_visits (visited_at);
