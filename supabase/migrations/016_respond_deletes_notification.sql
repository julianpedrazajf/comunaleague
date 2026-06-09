-- Fix: respond_to_interest now deletes the captain's notification instead of marking it read.
-- This ensures the notification disappears from NotificationsScreen on reload,
-- and allows the cancel guard to count remaining pending applicants via notification count.
--
-- Also grants DELETE on notifications so the SECURITY DEFINER function can execute.
GRANT DELETE ON notifications TO authenticated;

CREATE OR REPLACE FUNCTION respond_to_interest(p_notification_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id   uuid;
  v_applicant_id uuid;
  v_match_id     uuid;
  v_captain_name text;
BEGIN
  SELECT "relatedId", "fromUserId" INTO v_request_id, v_applicant_id
  FROM notifications
  WHERE id = p_notification_id
    AND "userId" = auth.uid()
    AND type = 'player_request_interest';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  SELECT "matchId" INTO v_match_id FROM player_requests WHERE id = v_request_id;

  SELECT COALESCE(name || ' ' || "lastName", 'El capitán') INTO v_captain_name
  FROM users WHERE id = auth.uid();

  -- Delete captain's notification so it disappears on reload
  DELETE FROM notifications WHERE id = p_notification_id;

  IF p_accept THEN
    UPDATE matches
    SET "confirmedPlayerIds" = array_append(
      COALESCE("confirmedPlayerIds", '{}'::uuid[]),
      v_applicant_id
    )
    WHERE id = v_match_id
      AND NOT (v_applicant_id = ANY(COALESCE("confirmedPlayerIds", '{}'::uuid[])));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'player_request_accepted', v_match_id, auth.uid(), v_captain_name);
  ELSE
    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'player_request_rejected', v_match_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;
