-- Automatically remove daily matches (and their registrations/notifications)
-- once their date has passed.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION delete_past_daily_matches()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  past_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO past_ids
  FROM tournaments
  WHERE type = 'daily' AND "startDate" < CURRENT_DATE;

  IF past_ids IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM registrations WHERE "tournamentId" = ANY(past_ids);
  DELETE FROM notifications WHERE "relatedId" = ANY(past_ids) AND type = 'new_daily_match';
  DELETE FROM tournaments WHERE id = ANY(past_ids);
END;
$$;

SELECT cron.schedule(
  'delete-past-daily-matches',
  '0 3 * * *',
  $$ SELECT delete_past_daily_matches(); $$
);
