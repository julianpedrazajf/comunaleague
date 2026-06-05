-- Run this in Supabase > SQL Editor
-- Creates the standings table used to show team stats in MyTeamScreen.
-- As admin/organizer, update rows directly from the Supabase Table Editor.

CREATE TABLE IF NOT EXISTS standings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "teamId"      uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "tournamentId" uuid       REFERENCES tournaments(id) ON DELETE SET NULL,
  position      integer     NOT NULL DEFAULT 0,
  wins          integer     NOT NULL DEFAULT 0,
  draws         integer     NOT NULL DEFAULT 0,
  losses        integer     NOT NULL DEFAULT 0,
  points        integer     NOT NULL DEFAULT 0,
  "updatedAt"   timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("teamId", "tournamentId")
);

-- Row Level Security
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read standings (public league data)
CREATE POLICY "standings_read" ON standings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only the service role (Supabase dashboard / admin scripts) can write
-- No INSERT/UPDATE/DELETE policy needed for anon/authenticated — dashboard bypasses RLS
