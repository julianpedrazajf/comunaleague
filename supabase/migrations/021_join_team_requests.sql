-- Team join request flow: when a player requests to join a team, every
-- member is notified, but only the captain can accept or reject the request.

CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_team_join_requests_team ON team_join_requests("teamId");

-- Only one pending request per applicant per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_requests_pending
  ON team_join_requests("teamId", "userId")
  WHERE status = 'pending';

ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON team_join_requests TO authenticated;

CREATE POLICY "user_read_own_join_requests"
  ON team_join_requests FOR SELECT TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "members_read_team_join_requests"
  ON team_join_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM teams t WHERE t.id = "teamId" AND auth.uid() = ANY(t."playerIds"))
  );

-- Extend notification types: captain gets an actionable request, other
-- members get an informational copy, and the applicant is told the outcome.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'player_request_interest',
  'player_request_accepted',
  'player_request_rejected',
  'join_team_request',
  'join_team_request_info',
  'join_team_accepted',
  'join_team_rejected'
));

-- Any authenticated player (not already on a team) can request to join.
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

-- Only the captain can accept or reject a pending join request.
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

    UPDATE teams
    SET "playerIds" = array_append("playerIds", v_applicant_id)
    WHERE id = v_team_id
      AND NOT (v_applicant_id = ANY("playerIds"));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_accepted', v_team_id, auth.uid(), v_captain_name);
  ELSE
    UPDATE team_join_requests SET status = 'rejected' WHERE id = v_request_id;

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_rejected', v_team_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;
