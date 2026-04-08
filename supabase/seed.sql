-- Seed data: initial members
-- PIN hashed with SHA-256 (lightweight alternative to bcrypt)
-- PINs: 모두 1234

INSERT INTO members (name, pin_hash, color) VALUES
  ('기준', encode(digest('1234', 'sha256'), 'hex'), '#3B82F6'),  -- blue
  ('병규', encode(digest('1234', 'sha256'), 'hex'), '#EF4444'),  -- red
  ('정빈', encode(digest('1234', 'sha256'), 'hex'), '#10B981'),  -- green
  ('본수', encode(digest('1234', 'sha256'), 'hex'), '#F59E0B'),  -- amber
  ('시우',   encode(digest('1234', 'sha256'), 'hex'), '#8B5CF6'); -- purple