-- Players list for a captain's player request: applicants (and team members)
-- can see the team roster plus the accepted one-match guests for that match.

CREATE OR REPLACE FUNCTION get_request_match_players(p_request_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  "lastName" text,
  "position" text,
  "skillLevel" text,
  "avatarUrl" text,
  "isGuest" boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id    uuid;
  v_match_id   uuid;
  v_player_ids uuid[];
BEGIN
  SELECT "teamId", "matchId" INTO v_team_id, v_match_id
  FROM player_requests WHERE player_requests.id = p_request_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  SELECT "playerIds" INTO v_player_ids FROM teams WHERE teams.id = v_team_id;

  -- Caller must have applied to this request or be a member of the team
  IF NOT EXISTS (
    SELECT 1 FROM player_request_interests
    WHERE "requestId" = p_request_id AND "userId" = auth.uid()
  ) AND NOT (auth.uid() = ANY(v_player_ids)) THEN
    RAISE EXCEPTION 'Not an applicant for this match';
  END IF;

  RETURN QUERY
  SELECT u.id, u.name, u."lastName", u."position"::text, u."skillLevel"::text, u."avatarUrl", false
  FROM users u WHERE u.id = ANY(v_player_ids)
  UNION ALL
  SELECT u.id, u.name, u."lastName", u."position"::text, u."skillLevel"::text, u."avatarUrl", true
  FROM users u
  WHERE u.id IN (
    SELECT n."userId" FROM notifications n
    WHERE n.type = 'player_request_accepted' AND n."relatedId" = v_match_id
  ) AND NOT (u.id = ANY(v_player_ids))
  ORDER BY 7, 2;
END;
$$;

-- Same list, but looked up from the match (used in My Matches by accepted
-- one-match guests): roster of the team whose request the caller applied to,
-- plus all accepted guests for that match.
CREATE OR REPLACE FUNCTION get_guest_match_players(p_match_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  "lastName" text,
  "position" text,
  "skillLevel" text,
  "avatarUrl" text,
  "isGuest" boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id    uuid;
  v_player_ids uuid[];
BEGIN
  -- The team whose request the caller applied to for this match
  SELECT r."teamId" INTO v_team_id
  FROM player_requests r
  JOIN player_request_interests i ON i."requestId" = r.id
  WHERE r."matchId" = p_match_id AND i."userId" = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Not an applicant for this match';
  END IF;

  -- Caller must have been accepted for this match
  IF NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n."userId" = auth.uid()
      AND n.type = 'player_request_accepted'
      AND n."relatedId" = p_match_id
  ) THEN
    RAISE EXCEPTION 'Application not accepted yet';
  END IF;

  SELECT "playerIds" INTO v_player_ids FROM teams WHERE teams.id = v_team_id;

  RETURN QUERY
  SELECT u.id, u.name, u."lastName", u."position"::text, u."skillLevel"::text, u."avatarUrl", false
  FROM users u WHERE u.id = ANY(v_player_ids)
  UNION ALL
  SELECT u.id, u.name, u."lastName", u."position"::text, u."skillLevel"::text, u."avatarUrl", true
  FROM users u
  WHERE u.id IN (
    SELECT n."userId" FROM notifications n
    WHERE n.type = 'player_request_accepted' AND n."relatedId" = p_match_id
  ) AND NOT (u.id = ANY(v_player_ids))
  ORDER BY 7, 2;
END;
$$;
