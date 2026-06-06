-- Teams can post a request when they need an extra player for a specific match
CREATE TABLE IF NOT EXISTS player_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "matchId" UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_player_requests_team ON player_requests("teamId");
CREATE INDEX IF NOT EXISTS idx_player_requests_status ON player_requests(status, "matchId");

-- Players can express interest in a request (one per user per request)
CREATE TABLE IF NOT EXISTS player_request_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "requestId" UUID NOT NULL REFERENCES player_requests(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("requestId", "userId")
);

-- Only team captain can post; cancels any existing open request for same team+match first
CREATE OR REPLACE FUNCTION create_player_request(team_id uuid, match_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = team_id AND "ownerId" = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE player_requests SET status = 'cancelled'
  WHERE "teamId" = team_id AND "matchId" = match_id AND status = 'open';
  INSERT INTO player_requests("teamId", "matchId") VALUES (team_id, match_id) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Only team captain can cancel their own team's request
CREATE OR REPLACE FUNCTION cancel_player_request(request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE player_requests pr SET status = 'cancelled'
  FROM teams t
  WHERE pr.id = request_id AND pr."teamId" = t.id AND t."ownerId" = auth.uid();
END;
$$;

-- Any authenticated player can express interest; duplicate silently ignored
CREATE OR REPLACE FUNCTION express_interest(request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO player_request_interests("requestId", "userId")
  VALUES (request_id, auth.uid())
  ON CONFLICT ("requestId", "userId") DO NOTHING;
END;
$$;
