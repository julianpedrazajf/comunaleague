-- Scheduling for league matches.
--
-- The fixtures are generated automatically (random round-robin) without a
-- date/time/location. The admin fills those in afterwards from Supabase — the
-- Table Editor, or the helper function below. Once a match has a date it shows
-- up in the player's "My Matches" window and on its calendar.

ALTER TABLE league_matches
  ADD COLUMN IF NOT EXISTS date     date,
  ADD COLUMN IF NOT EXISTS time     time,
  ADD COLUMN IF NOT EXISTS location text;

-- Convenience admin function (equivalent to editing the row in the Table
-- Editor). Not granted to players.
--   select set_league_match_schedule('<match_id>', '2026-07-01', '19:00', 'Cancha La 14');
CREATE OR REPLACE FUNCTION set_league_match_schedule(
  p_match_id uuid,
  p_date     date,
  p_time     time DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE league_matches
  SET date = p_date, time = p_time, location = p_location
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
END;
$$;
