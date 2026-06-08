-- Allow team captains to read all interests for their team's requests.
-- The existing policy only allows users to read their own interests,
-- but captains need to see all applicants to manage requests.
CREATE POLICY "captain_read_team_request_interests"
  ON player_request_interests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM player_requests pr
      JOIN teams t ON t.id = pr."teamId"
      WHERE pr.id = "requestId"
        AND t."ownerId" = auth.uid()
    )
  );
