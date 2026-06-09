-- In-app notification center
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId"     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT         NOT NULL CHECK (type IN (
                              'player_request_interest',
                              'player_request_accepted',
                              'player_request_rejected'
                            )),
  "relatedId"  UUID,        -- requestId for interest; matchId for accepted/rejected
  "fromUserId" UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  "fromName"   TEXT,        -- snapshot of sender's display name
  read         BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications("userId", read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON notifications TO authenticated;

CREATE POLICY "users_read_own_notifications"
  ON notifications FOR SELECT TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE TO authenticated
  USING ("userId" = auth.uid());

-- ─── Replace express_interest to also notify the captain ─────────────────────
CREATE OR REPLACE FUNCTION express_interest(request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_captain_id     uuid;
  v_applicant_name text;
BEGIN
  SELECT t."ownerId" INTO v_captain_id
  FROM player_requests pr
  JOIN teams t ON t.id = pr."teamId"
  WHERE pr.id = request_id AND pr.status = 'open';

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or closed';
  END IF;

  SELECT COALESCE(name || ' ' || "lastName", 'Jugador') INTO v_applicant_name
  FROM users WHERE id = auth.uid();

  INSERT INTO player_request_interests("requestId", "userId")
  VALUES (request_id, auth.uid())
  ON CONFLICT ("requestId", "userId") DO NOTHING;

  -- Notify captain only once per applicant per request
  INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
  SELECT v_captain_id, 'player_request_interest', request_id, auth.uid(), v_applicant_name
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE "userId" = v_captain_id
      AND type = 'player_request_interest'
      AND "relatedId" = request_id
      AND "fromUserId" = auth.uid()
  );
END;
$$;

-- ─── Captain accepts or rejects a player interest ────────────────────────────
CREATE OR REPLACE FUNCTION respond_to_interest(p_notification_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id     uuid;
  v_applicant_id   uuid;
  v_match_id       uuid;
  v_captain_name   text;
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

  -- Mark captain's notification as read
  UPDATE notifications SET read = true WHERE id = p_notification_id;

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
