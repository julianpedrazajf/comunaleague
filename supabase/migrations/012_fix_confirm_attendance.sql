-- Fix: COALESCE handles NULL arrays so the WHERE condition evaluates correctly
-- when a match row has no confirmedPlayerIds yet (NULL, not empty array)
CREATE OR REPLACE FUNCTION confirm_attendance(match_id uuid, attending boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF attending THEN
    UPDATE matches
    SET "confirmedPlayerIds" = array_append(
      COALESCE("confirmedPlayerIds", '{}'::uuid[]),
      auth.uid()
    )
    WHERE id = match_id
      AND NOT (auth.uid() = ANY(COALESCE("confirmedPlayerIds", '{}'::uuid[])));
  ELSE
    UPDATE matches
    SET "confirmedPlayerIds" = array_remove(
      COALESCE("confirmedPlayerIds", '{}'::uuid[]),
      auth.uid()
    )
    WHERE id = match_id;
  END IF;
END;
$$;
