CREATE TABLE IF NOT EXISTS member_presence_days (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_day DATE NOT NULL,
  PRIMARY KEY (active_day, user_id)
);
