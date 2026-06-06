-- Grant SELECT access on the new tables to the authenticated role
GRANT SELECT ON player_requests TO authenticated;
GRANT SELECT ON player_request_interests TO authenticated;

-- Enable RLS
ALTER TABLE player_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_request_interests ENABLE ROW LEVEL SECURITY;

-- Any logged-in user can read open requests
CREATE POLICY "authenticated_read_player_requests"
  ON player_requests FOR SELECT
  TO authenticated
  USING (true);

-- Users can only read their own interests
CREATE POLICY "authenticated_read_own_interests"
  ON player_request_interests FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid());
