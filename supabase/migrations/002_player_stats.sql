-- Run this in Supabase > SQL Editor
-- Creates the player_stats table used to show individual stats in ProfileScreen.
-- As admin/organizer, update rows directly from the Supabase Table Editor.

CREATE TABLE IF NOT EXISTS player_stats (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position    integer     NOT NULL DEFAULT 0,
  goals       integer     NOT NULL DEFAULT 0,
  assists     integer     NOT NULL DEFAULT 0,
  matches     integer     NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId")
);

-- Row Level Security
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all player stats (public league data)
CREATE POLICY "player_stats_read" ON player_stats
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role (Supabase dashboard) can write
