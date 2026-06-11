-- Notify every registered player when Comuna League creates a new daily match.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'player_request_interest',
  'player_request_accepted',
  'player_request_rejected',
  'join_team_request',
  'join_team_request_info',
  'join_team_accepted',
  'join_team_rejected',
  'new_daily_match'
));

CREATE OR REPLACE FUNCTION notify_new_daily_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.type = 'daily' THEN
    INSERT INTO notifications("userId", type, "relatedId", "fromName")
    SELECT id, 'new_daily_match', NEW.id, NEW.name
    FROM users;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_daily_match ON tournaments;
CREATE TRIGGER trg_notify_new_daily_match
AFTER INSERT ON tournaments
FOR EACH ROW EXECUTE FUNCTION notify_new_daily_match();

-- Also clean up new_daily_match notifications once the match has passed or been removed.
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

  -- New daily match notifications: tournament passed or was deleted
  DELETE FROM notifications
  WHERE "userId" = auth.uid()
    AND type = 'new_daily_match'
    AND (
      NOT EXISTS (
        SELECT 1 FROM tournaments WHERE id = "relatedId"
      )
      OR EXISTS (
        SELECT 1 FROM tournaments WHERE id = "relatedId" AND "startDate" < CURRENT_DATE
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_my_notifications() TO authenticated;
