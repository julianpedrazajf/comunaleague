-- Persists a player's attendance confirmation to the match record
-- Called alongside the AsyncStorage write in HomeScreen
CREATE OR REPLACE FUNCTION confirm_attendance(match_id uuid, attending boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF attending THEN
    UPDATE matches
    SET "confirmedPlayerIds" = array_append("confirmedPlayerIds", auth.uid())
    WHERE id = match_id AND NOT (auth.uid() = ANY("confirmedPlayerIds"));
  ELSE
    UPDATE matches
    SET "confirmedPlayerIds" = array_remove("confirmedPlayerIds", auth.uid())
    WHERE id = match_id;
  END IF;
END;
$$;
