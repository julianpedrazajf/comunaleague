-- Team creation and joining are now FREE. Entering a tournament becomes an
-- explicit, paid action: from "My Team" the captain pays 1,200 coins to enter
-- the team into the next available league. Teams no longer auto-join a league.

-- 1) Free team creation (was 50 coins).
CREATE OR REPLACE FUNCTION create_team(p_name text, p_format integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM teams WHERE auth.uid() = ANY("playerIds")) THEN
    RAISE EXCEPTION 'Already on a team';
  END IF;

  INSERT INTO teams(name, format, "playerIds", "ownerId", "createdAt")
  VALUES (p_name, p_format, ARRAY[auth.uid()], auth.uid(), now())
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$;

-- 2) Free team joining (no coin spend on request; nothing to refund on reject).
CREATE OR REPLACE FUNCTION request_join_team(team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_captain_id     uuid;
  v_player_ids     uuid[];
  v_member_id      uuid;
  v_request_id     uuid;
  v_applicant_name text;
BEGIN
  SELECT "ownerId", "playerIds" INTO v_captain_id, v_player_ids
  FROM teams WHERE id = team_id;

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF COALESCE(array_length(v_player_ids, 1), 0) >= 8 THEN
    RAISE EXCEPTION 'Team is full';
  END IF;
  IF auth.uid() = ANY(v_player_ids) THEN
    RAISE EXCEPTION 'Already a member of this team';
  END IF;
  IF EXISTS (SELECT 1 FROM teams WHERE auth.uid() = ANY("playerIds")) THEN
    RAISE EXCEPTION 'Already on a team';
  END IF;
  IF EXISTS (
    SELECT 1 FROM team_join_requests
    WHERE "teamId" = team_id AND "userId" = auth.uid() AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Request already pending';
  END IF;

  INSERT INTO team_join_requests("teamId", "userId") VALUES (team_id, auth.uid())
  RETURNING id INTO v_request_id;

  SELECT COALESCE(name || ' ' || "lastName", 'Jugador') INTO v_applicant_name
  FROM users WHERE id = auth.uid();

  INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
  VALUES (v_captain_id, 'join_team_request', v_request_id, auth.uid(), v_applicant_name);

  FOREACH v_member_id IN ARRAY v_player_ids LOOP
    IF v_member_id <> v_captain_id THEN
      INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
      VALUES (v_member_id, 'join_team_request_info', v_request_id, auth.uid(), v_applicant_name);
    END IF;
  END LOOP;
END;
$$;

-- Accept adds the player; reject just notifies (no refund — joining is free).
CREATE OR REPLACE FUNCTION respond_to_join_request(p_notification_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id   uuid;
  v_applicant_id uuid;
  v_team_id      uuid;
  v_captain_name text;
  v_player_ids   uuid[];
BEGIN
  SELECT "relatedId", "fromUserId" INTO v_request_id, v_applicant_id
  FROM notifications
  WHERE id = p_notification_id AND "userId" = auth.uid() AND type = 'join_team_request';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  SELECT "teamId" INTO v_team_id
  FROM team_join_requests
  WHERE id = v_request_id AND status = 'pending'
    AND "teamId" IN (SELECT id FROM teams WHERE "ownerId" = auth.uid());

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Request no longer pending';
  END IF;

  SELECT COALESCE(name || ' ' || "lastName", 'El capitán') INTO v_captain_name
  FROM users WHERE id = auth.uid();

  UPDATE notifications
  SET read = true, response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_notification_id;

  UPDATE notifications
  SET response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE "relatedId" = v_request_id AND type = 'join_team_request_info';

  IF p_accept THEN
    IF EXISTS (SELECT 1 FROM teams WHERE v_applicant_id = ANY("playerIds")) THEN
      RAISE EXCEPTION 'Applicant already joined another team';
    END IF;
    SELECT "playerIds" INTO v_player_ids FROM teams WHERE id = v_team_id;
    IF COALESCE(array_length(v_player_ids, 1), 0) >= 8 THEN
      RAISE EXCEPTION 'Team is full';
    END IF;

    UPDATE team_join_requests SET status = 'accepted' WHERE id = v_request_id;
    UPDATE teams
    SET "playerIds" = array_append("playerIds", v_applicant_id)
    WHERE id = v_team_id AND NOT (v_applicant_id = ANY("playerIds"));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_accepted', v_team_id, auth.uid(), v_captain_name);
  ELSE
    UPDATE team_join_requests SET status = 'rejected' WHERE id = v_request_id;

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_rejected', v_team_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;

-- 3) Teams no longer auto-join a tournament when created.
DROP TRIGGER IF EXISTS on_team_created_assign_league ON teams;

-- 4a) Assign a team to a SPECIFIC open league (the captain's choice). Validates
--     the chosen league is still open and has room; flips it to 'regular' when
--     it fills. Raises if the league can't be joined so join_tournament() rolls
--     back the coin charge in the same transaction.
CREATE OR REPLACE FUNCTION assign_team_to_specific_league(p_team_id uuid, p_league_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status text;
  v_max    integer;
  v_count  integer;
BEGIN
  IF EXISTS (SELECT 1 FROM league_teams WHERE "teamId" = p_team_id) THEN
    RAISE EXCEPTION 'Team already in a tournament';
  END IF;

  SELECT status, "maxClubs" INTO v_status, v_max
  FROM leagues WHERE id = p_league_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  IF v_status <> 'filling' THEN
    RAISE EXCEPTION 'Tournament not open';
  END IF;

  SELECT count(*) INTO v_count FROM league_teams WHERE "leagueId" = p_league_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Tournament is full';
  END IF;

  INSERT INTO league_teams("leagueId", "teamId") VALUES (p_league_id, p_team_id);

  IF v_count + 1 >= v_max THEN
    UPDATE leagues SET status = 'regular' WHERE id = p_league_id AND status = 'filling';
  END IF;
END;
$$;

-- 4b) Captain pays 1,200 coins to enter their team into a tournament. With a
--     league id, the team joins that specific tournament; without one it falls
--     back to the next open league (creating a new one if none have room).
CREATE OR REPLACE FUNCTION join_tournament(p_league_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id uuid;
BEGIN
  SELECT id INTO v_team_id FROM teams WHERE "ownerId" = auth.uid() LIMIT 1;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Not a team captain';
  END IF;

  IF EXISTS (SELECT 1 FROM league_teams WHERE "teamId" = v_team_id) THEN
    RAISE EXCEPTION 'Team already in a tournament';
  END IF;

  PERFORM wallet_spend(1200);

  IF p_league_id IS NULL THEN
    PERFORM assign_team_to_league(v_team_id);
  ELSE
    PERFORM assign_team_to_specific_league(v_team_id, p_league_id);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION join_tournament(uuid) TO authenticated;

-- 5) Captain takes the team out of its tournament — only once the team is done:
-- the regular season (all 9 matchdays) must be complete, and any playoff matches
-- the team is in must be played. Teams that missed the playoffs can leave once
-- the regular season finishes. Re-entering later means paying again (no refund).
CREATE OR REPLACE FUNCTION leave_tournament()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id         uuid;
  v_league_id       uuid;
  v_status          text;
  v_regular_total   int;
  v_regular_pending int;
  v_playoff_pending int;
BEGIN
  SELECT id INTO v_team_id FROM teams WHERE "ownerId" = auth.uid() LIMIT 1;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Not a team captain';
  END IF;

  SELECT "leagueId" INTO v_league_id FROM league_teams WHERE "teamId" = v_team_id;
  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Team not in a tournament';
  END IF;

  SELECT status INTO v_status FROM leagues WHERE id = v_league_id;

  -- Once the tournament is finished, anyone may leave — including the champion.
  -- (Earlier leavers delete their own fixtures, so the progress counts below
  -- would otherwise wrongly block whoever's left.) Until then, gate by progress.
  IF v_status <> 'finished' THEN
    -- Regular season must be over (fixtures exist and all are played).
    SELECT count(*), count(*) FILTER (WHERE played = false)
      INTO v_regular_total, v_regular_pending
    FROM league_matches WHERE "leagueId" = v_league_id AND phase = 'regular';
    IF v_regular_total = 0 OR v_regular_pending > 0 THEN
      RAISE EXCEPTION 'Regular season not finished';
    END IF;

    -- Any playoff match the team is in must be played.
    SELECT count(*) INTO v_playoff_pending
    FROM league_matches
    WHERE "leagueId" = v_league_id
      AND phase IN ('semifinal', 'final')
      AND ("homeTeamId" = v_team_id OR "awayTeamId" = v_team_id)
      AND played = false;
    IF v_playoff_pending > 0 THEN
      RAISE EXCEPTION 'Playoff matches not finished';
    END IF;
  END IF;

  DELETE FROM league_matches
  WHERE "leagueId" = v_league_id
    AND ("homeTeamId" = v_team_id OR "awayTeamId" = v_team_id);

  DELETE FROM league_teams WHERE "teamId" = v_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION leave_tournament() TO authenticated;
