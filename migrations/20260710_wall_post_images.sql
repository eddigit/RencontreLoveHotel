-- Community wall image posts: one optional validated image per wall post.

ALTER TABLE wall_posts
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS image_size_bytes INTEGER;

ALTER TABLE wall_posts
  DROP CONSTRAINT IF EXISTS wall_posts_body_length_check,
  DROP CONSTRAINT IF EXISTS wall_posts_body_or_image_check,
  DROP CONSTRAINT IF EXISTS wall_posts_image_mime_type_check,
  DROP CONSTRAINT IF EXISTS wall_posts_image_size_check;

ALTER TABLE wall_posts
  ADD CONSTRAINT wall_posts_body_or_image_check
    CHECK (
      char_length(body) <= 500
      AND (
        char_length(trim(body)) > 0
        OR image_url IS NOT NULL
      )
    ),
  ADD CONSTRAINT wall_posts_image_mime_type_check
    CHECK (
      image_mime_type IS NULL
      OR image_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
    ),
  ADD CONSTRAINT wall_posts_image_size_check
    CHECK (
      image_size_bytes IS NULL
      OR (
        image_size_bytes > 0
        AND image_size_bytes <= 8388608
      )
    );
