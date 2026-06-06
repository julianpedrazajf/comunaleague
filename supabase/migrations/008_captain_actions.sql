-- Transfer team ownership to another existing member
CREATE OR REPLACE FUNCTION transfer_ownership(team_id uuid, new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE teams
  SET "ownerId" = new_owner_id
  WHERE id = team_id
    AND "ownerId" = auth.uid()
    AND new_owner_id = ANY("playerIds");
END;
$$;

-- Delete a team only when the captain is the sole remaining member
CREATE OR REPLACE FUNCTION delete_team(team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM teams
  WHERE id = team_id
    AND "ownerId" = auth.uid()
    AND array_length("playerIds", 1) <= 1;
END;
$$;
