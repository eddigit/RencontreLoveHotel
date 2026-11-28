-- Private member media never has an object-store URL. Bytes are served only after
-- a fresh authorization check in the application.
CREATE TABLE IF NOT EXISTS private_album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('members', 'private')),
  image BYTEA NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp', 'video/mp4', 'video/webm')),
  bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 3145728),
  width INTEGER, height INTEGER,
  CHECK ((mime_type = 'image/webp' AND width > 0 AND width <= 2048 AND height > 0 AND height <= 2048) OR (mime_type IN ('video/mp4','video/webm') AND width IS NULL AND height IS NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS private_album_photos_owner_created ON private_album_photos(owner_id, created_at ASC);

CREATE TABLE IF NOT EXISTS private_album_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'declined', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMPTZ,
  CONSTRAINT private_album_request_distinct_members CHECK (owner_id <> requester_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS private_album_one_pending_request ON private_album_access_requests(owner_id, requester_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS private_album_requests_owner ON private_album_access_requests(owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS private_album_requests_requester ON private_album_access_requests(requester_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS private_album_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES private_album_access_requests(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT private_album_grant_distinct_members CHECK (owner_id <> viewer_id),
  CONSTRAINT private_album_grant_future_expiry CHECK (expires_at > granted_at),
  CONSTRAINT private_album_grant_pair UNIQUE (owner_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS private_album_grants_viewer_active ON private_album_grants(viewer_id, expires_at) WHERE revoked_at IS NULL;
