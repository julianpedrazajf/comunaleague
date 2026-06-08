-- Add response column so captain's interest notifications persist with their decision.
-- respond_to_interest now updates response instead of deleting the notification.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS response TEXT CHECK (response IN ('accepted', 'rejected'));

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

  -- Keep the notification but record the captain's decision
  UPDATE notifications
  SET read = true,
      response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_notification_id;

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
