BEGIN;

CREATE TABLE IF NOT EXISTS product_activity_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'member_search',
    'profile_viewed',
    'match_requested',
    'match_accepted',
    'conversation_started',
    'message_sent',
    'event_created',
    'event_joined',
    'wall_post_created'
  )),
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_activity_type_created
  ON product_activity_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_activity_actor_created
  ON product_activity_events (actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION track_lhr_product_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_matches' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
      VALUES (NEW.user_id_1, 'match_requested', 'user', NEW.user_id_2);
    ELSIF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
      VALUES (NEW.user_id_2, 'match_accepted', 'user', NEW.user_id_1);
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF NOT EXISTS (
      SELECT 1 FROM messages
      WHERE conversation_id = NEW.conversation_id AND id <> NEW.id
    ) THEN
      INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
      VALUES (NEW.sender_id, 'conversation_started', 'conversation', NEW.conversation_id);
    END IF;
    INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
    VALUES (NEW.sender_id, 'message_sent', 'conversation', NEW.conversation_id);
  ELSIF TG_TABLE_NAME = 'events' THEN
    INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
    VALUES (NEW.creator_id, 'event_created', 'event', NEW.id);
  ELSIF TG_TABLE_NAME = 'event_participants' THEN
    INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
    VALUES (NEW.user_id, 'event_joined', 'event', NEW.event_id);
  ELSIF TG_TABLE_NAME = 'wall_posts' THEN
    INSERT INTO product_activity_events (actor_user_id, event_type, target_type, target_id)
    VALUES (NEW.user_id, 'wall_post_created', 'wall_post', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_activity_matches ON user_matches;
CREATE TRIGGER trg_product_activity_matches
AFTER INSERT OR UPDATE OF status ON user_matches
FOR EACH ROW EXECUTE FUNCTION track_lhr_product_activity();

DROP TRIGGER IF EXISTS trg_product_activity_messages ON messages;
CREATE TRIGGER trg_product_activity_messages
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION track_lhr_product_activity();

DROP TRIGGER IF EXISTS trg_product_activity_events ON events;
CREATE TRIGGER trg_product_activity_events
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION track_lhr_product_activity();

DROP TRIGGER IF EXISTS trg_product_activity_event_participants ON event_participants;
CREATE TRIGGER trg_product_activity_event_participants
AFTER INSERT ON event_participants
FOR EACH ROW EXECUTE FUNCTION track_lhr_product_activity();

DROP TRIGGER IF EXISTS trg_product_activity_wall_posts ON wall_posts;
CREATE TRIGGER trg_product_activity_wall_posts
AFTER INSERT ON wall_posts
FOR EACH ROW EXECUTE FUNCTION track_lhr_product_activity();

COMMIT;
