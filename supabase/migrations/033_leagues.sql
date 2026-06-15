-- League tournaments (10-club format: regular season + playoffs).
--
-- Every team that registers in the app is auto-assigned to an open league.
-- A league fills up to "maxClubs" (10); the next teams roll into a new league,
-- so each team only ever sees the one league it belongs to.
--
-- Source of truth for all competition math is the TypeScript engine
-- (src/utils/league.ts). The database only stores raw data: which teams are in
-- a league, the fixtures, and the results. Standings and playoff seeding are
-- computed on the client by the engine; the client persists generated fixtures
-- and playoff brackets back through the SECURITY DEFINER functions below.
--
-- Entering results (admin / backend only — there is no in-app results UI):
--   select set_league_result('<match_id>', 2, 1);            -- 2-1
--   select set_league_result('<match_id>', 1, 1, 4, 3);      -- 1-1, pens 4-3
-- After results are in, the table and bracket update automatically the next
-- time any member opens the league screen.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leagues (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  status           text        NOT NULL DEFAULT 'filling',  -- filling | regular | playoffs | finished
  "maxClubs"       integer     NOT NULL DEFAULT 10,
  "championTeamId" uuid        REFERENCES teams(id) ON DELETE SET NULL,
  "createdAt"      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_teams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "leagueId"  uuid        NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  "teamId"    uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- Random, stable order used to randomize fixtures (and as a draw tiebreak).
  seed        integer     NOT NULL DEFAULT (floor(random() * 1000000000))::int,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("teamId")
);
CREATE INDEX IF NOT EXISTS league_teams_league_idx ON league_teams("leagueId");

CREATE TABLE IF NOT EXISTS league_matches (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "leagueId"   uuid        NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  phase        text        NOT NULL,  -- regular | semifinal | final
  matchday     integer,               -- regular only (1..N)
  "seriesId"   text,                  -- playoffs: SF-A | SF-B | FINAL
  leg          integer,               -- playoffs: 1 (ida) | 2 (vuelta)
  "homeTeamId" uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "awayTeamId" uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "homeGoals"  integer,
  "awayGoals"  integer,
  "homePens"   integer,               -- penalty shootout (stored on the 2nd leg)
  "awayPens"   integer,
  played       boolean     NOT NULL DEFAULT false,
  "createdAt"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS league_matches_league_idx ON league_matches("leagueId", phase);

-- ---------------------------------------------------------------------------
-- 2. RLS — leagues are public to read; all writes go through the functions
-- ---------------------------------------------------------------------------
ALTER TABLE leagues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_teams   ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matches ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON leagues, league_teams, league_matches TO authenticated;

DROP POLICY IF EXISTS "read_leagues" ON leagues;
CREATE POLICY "read_leagues" ON leagues
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_league_teams" ON league_teams;
CREATE POLICY "read_league_teams" ON league_teams
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_league_matches" ON league_matches;
CREATE POLICY "read_league_matches" ON league_matches
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 3. Auto-assign every new team to an open league (creating one if needed).
--    When a league reaches maxClubs it flips to 'regular' (season can start).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_team_to_league(p_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_league_id uuid;
  v_max       integer;
  v_count     integer;
  v_seq       integer;
BEGIN
  -- Idempotent: a team belongs to exactly one league.
  IF EXISTS (SELECT 1 FROM league_teams WHERE "teamId" = p_team_id) THEN
    RETURN;
  END IF;

  -- Oldest open league that still has room.
  SELECT l.id, l."maxClubs" INTO v_league_id, v_max
  FROM leagues l
  WHERE l.status = 'filling'
    AND (SELECT count(*) FROM league_teams lt WHERE lt."leagueId" = l.id) < l."maxClubs"
  ORDER BY l."createdAt"
  LIMIT 1
  FOR UPDATE;

  IF v_league_id IS NULL THEN
    SELECT count(*) + 1 INTO v_seq FROM leagues;
    INSERT INTO leagues(name) VALUES ('Liga Comuna #' || v_seq)
    RETURNING id, "maxClubs" INTO v_league_id, v_max;
  END IF;

  INSERT INTO league_teams("leagueId", "teamId") VALUES (v_league_id, p_team_id);

  SELECT count(*) INTO v_count FROM league_teams WHERE "leagueId" = v_league_id;
  IF v_count >= v_max THEN
    UPDATE leagues SET status = 'regular' WHERE id = v_league_id AND status = 'filling';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assign_team_to_league_trg()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM assign_team_to_league(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_created_assign_league ON teams;
CREATE TRIGGER on_team_created_assign_league
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION assign_team_to_league_trg();

-- Manual override (admin): start a league that hasn't filled yet, so you can
-- test with fewer than maxClubs teams.   select start_league('<league_id>');
CREATE OR REPLACE FUNCTION start_league(p_league_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE leagues SET status = 'regular' WHERE id = p_league_id AND status = 'filling';
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Persist client-generated regular fixtures (idempotent).
--    Random round-robin is produced by the engine; this only stores it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION persist_regular_fixtures(p_league_id uuid, p_matches jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status text;
  m        jsonb;
BEGIN
  SELECT status INTO v_status FROM leagues WHERE id = p_league_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'League not found'; END IF;
  IF v_status = 'filling' THEN RAISE EXCEPTION 'League not started'; END IF;

  -- Already generated → no-op.
  IF EXISTS (SELECT 1 FROM league_matches WHERE "leagueId" = p_league_id AND phase = 'regular') THEN
    RETURN;
  END IF;

  FOR m IN SELECT value FROM jsonb_array_elements(p_matches) LOOP
    IF NOT EXISTS (SELECT 1 FROM league_teams WHERE "leagueId" = p_league_id AND "teamId" = (m->>'homeTeamId')::uuid)
       OR NOT EXISTS (SELECT 1 FROM league_teams WHERE "leagueId" = p_league_id AND "teamId" = (m->>'awayTeamId')::uuid) THEN
      RAISE EXCEPTION 'Team not in league';
    END IF;
    INSERT INTO league_matches("leagueId", phase, matchday, "homeTeamId", "awayTeamId")
    VALUES (p_league_id, 'regular', (m->>'matchday')::int, (m->>'homeTeamId')::uuid, (m->>'awayTeamId')::uuid);
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION persist_regular_fixtures(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Persist client-seeded playoff bracket (idempotent).
--    p_phase: 'semifinal' (after regular is complete) | 'final' (after semis).
--    p_matches: [{seriesId, leg, homeTeamId, awayTeamId}, ...]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION persist_playoff_matches(p_league_id uuid, p_phase text, p_matches jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status   text;
  v_unplayed integer;
  m          jsonb;
BEGIN
  SELECT status INTO v_status FROM leagues WHERE id = p_league_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'League not found'; END IF;

  IF p_phase = 'semifinal' THEN
    SELECT count(*) INTO v_unplayed FROM league_matches
      WHERE "leagueId" = p_league_id AND phase = 'regular' AND played = false;
    IF v_unplayed > 0 OR NOT EXISTS (SELECT 1 FROM league_matches WHERE "leagueId" = p_league_id AND phase = 'regular') THEN
      RAISE EXCEPTION 'Regular season not complete';
    END IF;
    IF EXISTS (SELECT 1 FROM league_matches WHERE "leagueId" = p_league_id AND phase = 'semifinal') THEN
      RETURN;
    END IF;
  ELSIF p_phase = 'final' THEN
    SELECT count(*) INTO v_unplayed FROM league_matches
      WHERE "leagueId" = p_league_id AND phase = 'semifinal' AND played = false;
    IF v_unplayed > 0 OR NOT EXISTS (SELECT 1 FROM league_matches WHERE "leagueId" = p_league_id AND phase = 'semifinal') THEN
      RAISE EXCEPTION 'Semifinals not complete';
    END IF;
    IF EXISTS (SELECT 1 FROM league_matches WHERE "leagueId" = p_league_id AND phase = 'final') THEN
      RETURN;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid phase';
  END IF;

  FOR m IN SELECT value FROM jsonb_array_elements(p_matches) LOOP
    IF NOT EXISTS (SELECT 1 FROM league_teams WHERE "leagueId" = p_league_id AND "teamId" = (m->>'homeTeamId')::uuid)
       OR NOT EXISTS (SELECT 1 FROM league_teams WHERE "leagueId" = p_league_id AND "teamId" = (m->>'awayTeamId')::uuid) THEN
      RAISE EXCEPTION 'Team not in league';
    END IF;
    INSERT INTO league_matches("leagueId", phase, "seriesId", leg, "homeTeamId", "awayTeamId")
    VALUES (p_league_id, p_phase, m->>'seriesId', (m->>'leg')::int, (m->>'homeTeamId')::uuid, (m->>'awayTeamId')::uuid);
  END LOOP;

  UPDATE leagues SET status = 'playoffs' WHERE id = p_league_id AND status <> 'finished';
END;
$$;
GRANT EXECUTE ON FUNCTION persist_playoff_matches(uuid, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Mark a league finished with its champion (idempotent; final must be done).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION finish_league(p_league_id uuid, p_champion_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_unplayed integer;
BEGIN
  SELECT count(*) INTO v_unplayed FROM league_matches
    WHERE "leagueId" = p_league_id AND phase = 'final' AND played = false;
  IF v_unplayed > 0 OR NOT EXISTS (SELECT 1 FROM league_matches WHERE "leagueId" = p_league_id AND phase = 'final') THEN
    RAISE EXCEPTION 'Final not complete';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM league_teams WHERE "leagueId" = p_league_id AND "teamId" = p_champion_team_id) THEN
    RAISE EXCEPTION 'Champion not in league';
  END IF;
  UPDATE leagues SET status = 'finished', "championTeamId" = p_champion_team_id WHERE id = p_league_id;
END;
$$;
GRANT EXECUTE ON FUNCTION finish_league(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Record a match result (admin / backend only — NOT granted to players).
--    Call it from the Supabase SQL editor or a service-role script.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_league_result(
  p_match_id   uuid,
  p_home_goals integer,
  p_away_goals integer,
  p_home_pens  integer DEFAULT NULL,
  p_away_pens  integer DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_home_goals < 0 OR p_away_goals < 0 THEN
    RAISE EXCEPTION 'Goals must be >= 0';
  END IF;

  UPDATE league_matches
  SET "homeGoals" = p_home_goals,
      "awayGoals" = p_away_goals,
      "homePens"  = p_home_pens,
      "awayPens"  = p_away_pens,
      played      = true
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Backfill: place every existing team into a league.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM teams ORDER BY "createdAt" LOOP
    PERFORM assign_team_to_league(r.id);
  END LOOP;
END $$;
