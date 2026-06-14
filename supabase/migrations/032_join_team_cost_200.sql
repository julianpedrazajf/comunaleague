-- Joining a team now costs 200 coins (was 30). Spend on request, refund on
-- rejection. Supersedes the 30-coin amounts from migration 030.

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

  PERFORM wallet_spend(200);

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

  UPDATE notifications
  SET read = true,
      response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_notification_id;

  UPDATE notifications
  SET response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE "relatedId" = v_request_id
    AND type = 'join_team_request_info';

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
    WHERE id = v_team_id
      AND NOT (v_applicant_id = ANY("playerIds"));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_accepted', v_team_id, auth.uid(), v_captain_name);
  ELSE
    UPDATE team_join_requests SET status = 'rejected' WHERE id = v_request_id;

    -- Refund the 200 coins to the applicant's wallet.
    INSERT INTO wallets("userId", coins) VALUES (v_applicant_id, 200)
    ON CONFLICT ("userId") DO UPDATE
      SET coins = wallets.coins + 200, "updatedAt" = now();

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_rejected', v_team_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;
