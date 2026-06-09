-- Allow all team members (not just the captain) to read interests for their
-- team's player requests, so accepted guest players are visible to everyone
-- in MyTeamScreen, not only the captain.
CREATE POLICY "member_read_team_request_interests"
  ON player_request_interests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM player_requests pr
      JOIN teams t ON t.id = pr."teamId"
      WHERE pr.id = "requestId"
        AND auth.uid() = ANY(t."playerIds")
    )
  );
