-- Payment-gated team joining + capacity limits + daily match player list.
--
-- Flow change: when the captain accepts a join request the player is NO
-- longer added to the team immediately. The player must complete the
-- (simulated) payment, which calls complete_team_join() to finish joining.
--
-- Capacity rules: teams hold at most 8 players; daily matches hold at most
-- 18 registered players.

-- ---------------------------------------------------------------------------
-- 1. Teams: block join requests when the team is full (8 players)
-- ---------------------------------------------------------------------------
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

  -- Captain gets the actionable copy
  INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
  VALUES (v_captain_id, 'join_team_request', v_request_id, auth.uid(), v_applicant_name);

  -- Every other member gets an informational copy
  FOREACH v_member_id IN ARRAY v_player_ids LOOP
    IF v_member_id <> v_captain_id THEN
      INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
      VALUES (v_member_id, 'join_team_request_info', v_request_id, auth.uid(), v_applicant_name);
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Accepting a join request no longer adds the player to the team.
--    The applicant is notified and must pay to complete the join.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION respond_to_join_request(p_notification_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id   uuid;
  v_applicant_id uuid;
  v_team_id      uuid;
  v_captain_name text;
BEGIN
  SELECT "relatedId", "fromUserId" INTO v_request_id, v_applicant_id
  FROM notifications
  WHERE id = p_notification_id
    AND "userId" = auth.uid()
    AND type = 'join_team_request';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  SELECT "teamId" INTO v_team_id
  FROM team_join_requests
  WHERE id = v_request_id
    AND status = 'pending'
    AND "teamId" IN (SELECT id FROM teams WHERE "ownerId" = auth.uid());

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Request no longer pending';
  END IF;

  SELECT COALESCE(name || ' ' || "lastName", 'El capitán') INTO v_captain_name
  FROM users WHERE id = auth.uid();

  -- Resolve the captain's notification
  UPDATE notifications
  SET read = true,
      response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_notification_id;

  -- Resolve every other member's informational copy
  UPDATE notifications
  SET response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE "relatedId" = v_request_id
    AND type = 'join_team_request_info';

  IF p_accept THEN
    IF EXISTS (SELECT 1 FROM teams WHERE v_applicant_id = ANY("playerIds")) THEN
      RAISE EXCEPTION 'Applicant already joined another team';
    END IF;

    UPDATE team_join_requests SET status = 'accepted' WHERE id = v_request_id;

    -- The player joins only after completing the payment (complete_team_join)
    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_accepted', v_team_id, auth.uid(), v_captain_name);
  ELSE
    UPDATE team_join_requests SET status = 'rejected' WHERE id = v_request_id;

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_rejected', v_team_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Complete the join after payment: caller must have an accepted request.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_team_join(team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_player_ids uuid[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM team_join_requests
    WHERE "teamId" = team_id AND "userId" = auth.uid() AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'No accepted join request for this team';
  END IF;

  IF EXISTS (SELECT 1 FROM teams WHERE auth.uid() = ANY("playerIds")) THEN
    RAISE EXCEPTION 'Already on a team';
  END IF;

  SELECT "playerIds" INTO v_player_ids FROM teams WHERE id = team_id;

  IF v_player_ids IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF COALESCE(array_length(v_player_ids, 1), 0) >= 8 THEN
    RAISE EXCEPTION 'Team is full';
  END IF;

  UPDATE teams
  SET "playerIds" = array_append("playerIds", auth.uid())
  WHERE id = team_id
    AND NOT (auth.uid() = ANY("playerIds"));
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Daily match registration with capacity check (18 players max)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_for_daily(p_tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tournaments WHERE id = p_tournament_id AND type = 'daily'
  ) THEN
    RAISE EXCEPTION 'Daily match not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM registrations
    WHERE "tournamentId" = p_tournament_id AND "userId" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already registered';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM registrations WHERE "tournamentId" = p_tournament_id;

  IF v_count >= 18 THEN
    RAISE EXCEPTION 'Match is full';
  END IF;

  INSERT INTO registrations("tournamentId", "userId", status)
  VALUES (p_tournament_id, auth.uid(), 'pending');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Registered-player counts per tournament (for showing available spots)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_registration_counts(p_tournament_ids uuid[])
RETURNS TABLE("tournamentId" uuid, "count" bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT r."tournamentId", COUNT(*)
  FROM registrations r
  WHERE r."tournamentId" = ANY(p_tournament_ids)
  GROUP BY r."tournamentId";
$$;

-- ---------------------------------------------------------------------------
-- 6. List of players registered in a daily match — visible only to players
--    who are themselves registered in that match.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_daily_match_players(p_tournament_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  "lastName" text,
  "position" text,
  "skillLevel" text,
  "avatarUrl" text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM registrations
    WHERE "tournamentId" = p_tournament_id AND "userId" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not registered in this match';
  END IF;

  RETURN QUERY
  SELECT u.id, u.name, u."lastName", u."position"::text, u."skillLevel"::text, u."avatarUrl"
  FROM registrations r
  JOIN users u ON u.id = r."userId"
  WHERE r."tournamentId" = p_tournament_id
  ORDER BY u.name;
END;
$$;
