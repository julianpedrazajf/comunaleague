-- Invert the team-join flow to match the one-match flow: the player pays
-- BEFORE requesting (request_join_team is called after payment), so accepting
-- the request now adds the player directly. If the captain rejects, the
-- (simulated) payment is refunded — handled in the app's rejection message.
--
-- This supersedes the "pay to complete" behavior from migration 027.

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

    SELECT "playerIds" INTO v_player_ids FROM teams WHERE id = v_team_id;
    IF COALESCE(array_length(v_player_ids, 1), 0) >= 8 THEN
      RAISE EXCEPTION 'Team is full';
    END IF;

    UPDATE team_join_requests SET status = 'accepted' WHERE id = v_request_id;

    -- Player already paid when requesting; add them to the team now.
    UPDATE teams
    SET "playerIds" = array_append("playerIds", v_applicant_id)
    WHERE id = v_team_id
      AND NOT (v_applicant_id = ANY("playerIds"));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_accepted', v_team_id, auth.uid(), v_captain_name);
  ELSE
    UPDATE team_join_requests SET status = 'rejected' WHERE id = v_request_id;

    -- Rejection triggers the (simulated) refund; messaging handled in the app.
    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_rejected', v_team_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;

-- complete_team_join is no longer used by the app (payment now happens up
-- front). Kept as a harmless no-op definition is unnecessary, so drop it.
DROP FUNCTION IF EXISTS complete_team_join(uuid);
