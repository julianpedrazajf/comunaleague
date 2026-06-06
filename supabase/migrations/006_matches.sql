-- matches table
-- Admin inserts rows directly from the Supabase dashboard.
-- homeTeamId / awayTeamId must be valid UUIDs from the teams table.
-- date format: YYYY-MM-DD   (e.g. 2026-06-15)
-- time format: HH:MM:SS     (e.g. 09:00:00)
-- result: leave NULL for upcoming matches; fill in after the match (e.g. "2-1")

CREATE TABLE IF NOT EXISTS matches (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "homeTeamId"         uuid          NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "awayTeamId"         uuid          NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date                 date          NOT NULL,
  time                 time          NOT NULL,
  location             text          NOT NULL DEFAULT '',
  result               text,
  "confirmedPlayerIds" uuid[]        NOT NULL DEFAULT '{}',
  "createdAt"          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read matches
CREATE POLICY "Authenticated users can read matches"
  ON matches FOR SELECT
  TO authenticated
  USING (true);
