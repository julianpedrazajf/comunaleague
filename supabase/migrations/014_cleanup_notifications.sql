-- Deletes the current user's notifications that belong to past or deleted matches.
-- Called from the app on every NotificationsScreen open.
CREATE OR REPLACE FUNCTION cleanup_my_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Interest notifications: match passed or request/match was deleted
  DELETE FROM notifications
  WHERE "userId" = auth.uid()
    AND type = 'player_request_interest'
    AND (
      NOT EXISTS (
        SELECT 1 FROM player_requests WHERE id = "relatedId"
      )
      OR EXISTS (
        SELECT 1 FROM player_requests pr
        JOIN matches m ON m.id = pr."matchId"
        WHERE pr.id = "relatedId"
          AND m.date < CURRENT_DATE
      )
    );

  -- Accepted / rejected notifications: match passed or was deleted
  DELETE FROM notifications
  WHERE "userId" = auth.uid()
    AND type IN ('player_request_accepted', 'player_request_rejected')
    AND (
      NOT EXISTS (
        SELECT 1 FROM matches WHERE id = "relatedId"
      )
      OR EXISTS (
        SELECT 1 FROM matches WHERE id = "relatedId" AND date < CURRENT_DATE
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_my_notifications() TO authenticated;
