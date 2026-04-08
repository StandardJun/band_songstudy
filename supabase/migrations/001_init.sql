-- Song Study: Initial schema
-- 4 tables: members, songs, comments, sessions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  pin_hash text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Songs
CREATE TABLE songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  storage_path text NOT NULL,
  duration float,
  week_number int NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Comments (with self-referencing parent for threads)
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  time_start float NOT NULL,
  time_end float,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Indexes
CREATE INDEX idx_songs_week ON songs(week_number DESC);
CREATE INDEX idx_songs_uploaded_by ON songs(uploaded_by);
CREATE INDEX idx_comments_song ON comments(song_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_member ON sessions(member_id);

-- RLS (Row Level Security) - disabled for simplicity since we handle auth via JWT
-- Enable if needed later
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (we handle auth in API routes)
CREATE POLICY "Allow all for anon" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON songs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON sessions FOR ALL USING (true) WITH CHECK (true);
