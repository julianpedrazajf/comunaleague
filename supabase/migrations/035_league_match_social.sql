-- Make tournament (league) fixtures first-class matches so the full match
-- social layer works for them too: the captain "need a player for 1 match"
-- request, one-match guests, the players list, and attendance confirmation.
--
-- Approach: each SCHEDULED league match is mirrored into a real `matches` row,
-- created automatically when the admin sets the match date. Every existing match
-- feature (player_requests, interests, respond_to_interest, confirm_attendance,
-- get_request/guest_match_players, the "Play Solo" discovery) operates on that
-- mirror unchanged. league_matches stays the competition record and links to the
-- mirror via "matchId"; a trigger keeps the mirror in sync.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS "leagueMatchId" uuid REFERENCES league_matches(id) ON DELETE CASCADE;

ALTER TABLE league_matches
  ADD COLUMN IF NOT EXISTS "matchId" uuid REFERENCES matches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS matches_league_match_idx ON matches("leagueMatchId");

-- Keeps the mirror match in sync with the league match. Fires on every insert /
-- update of league_matches; the mirror is created the first time the match has a
-- date (i.e. when it gets scheduled) and updated on reschedule / result entry.
CREATE OR REPLACE FUNCTION sync_league_match_mirror()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result text;
  v_mirror uuid;
BEGIN
  IF NEW.date IS NULL THEN
    RETURN NEW; -- not scheduled yet → no mirror
  END IF;

  v_result := CASE
    WHEN NEW.played AND NEW."homeGoals" IS NOT NULL AND NEW."awayGoals" IS NOT NULL
    THEN NEW."homeGoals" || '-' || NEW."awayGoals"
    ELSE NULL
  END;

  IF NEW."matchId" IS NULL THEN
    INSERT INTO matches("homeTeamId", "awayTeamId", date, time, location, result, "leagueMatchId")
    VALUES (NEW."homeTeamId", NEW."awayTeamId", NEW.date, COALESCE(NEW.time, '00:00'),
            COALESCE(NEW.location, ''), v_result, NEW.id)
    RETURNING id INTO v_mirror;
    NEW."matchId" := v_mirror; -- persisted because this is a BEFORE trigger
  ELSE
    UPDATE matches
    SET "homeTeamId" = NEW."homeTeamId",
        "awayTeamId" = NEW."awayTeamId",
        date         = NEW.date,
        time         = COALESCE(NEW.time, '00:00'),
        location     = COALESCE(NEW.location, ''),
        result       = v_result
    WHERE id = NEW."matchId";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_match_mirror ON league_matches;
CREATE TRIGGER league_match_mirror
  BEFORE INSERT OR UPDATE ON league_matches
  FOR EACH ROW EXECUTE FUNCTION sync_league_match_mirror();

-- Backfill mirrors for league matches that were already scheduled.
UPDATE league_matches SET date = date WHERE date IS NOT NULL AND "matchId" IS NULL;
