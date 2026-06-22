-- Team names must be unique — two teams can't share the same name
-- (case-insensitive, trimmed).

-- 1) Enforce it at the DB level so it also holds under concurrent creates.
--    NOTE: if any duplicate names already exist this will fail — rename or
--    remove the duplicates, then re-run.
CREATE UNIQUE INDEX IF NOT EXISTS teams_name_unique ON teams (lower(btrim(name)));

-- 2) Check up front in create_team so the app gets a clean, mappable error
--    ('Team name taken') instead of a raw unique-violation. Creating remains
--    free (see 036).
CREATE OR REPLACE FUNCTION create_team(p_name text, p_format integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id uuid;
  v_name    text := btrim(p_name);
BEGIN
  IF v_name = '' THEN
    RAISE EXCEPTION 'Team name required';
  END IF;

  IF EXISTS (SELECT 1 FROM teams WHERE auth.uid() = ANY("playerIds")) THEN
    RAISE EXCEPTION 'Already on a team';
  END IF;

  IF EXISTS (SELECT 1 FROM teams WHERE lower(btrim(name)) = lower(v_name)) THEN
    RAISE EXCEPTION 'Team name taken';
  END IF;

  INSERT INTO teams(name, format, "playerIds", "ownerId", "createdAt")
  VALUES (v_name, p_format, ARRAY[auth.uid()], auth.uid(), now())
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$;
