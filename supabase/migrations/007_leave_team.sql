CREATE OR REPLACE FUNCTION leave_team(team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE teams
  SET "playerIds" = array_remove("playerIds", auth.uid())
  WHERE id = team_id
    AND auth.uid() = ANY("playerIds")
    AND "ownerId" <> auth.uid();
END;
$$;
