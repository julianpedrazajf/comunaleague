-- Let guests (the anon role, no account) browse upcoming daily matches created
-- by Comuna League. SECURITY DEFINER so it bypasses the tournaments RLS, and
-- granted to anon. Returns each daily match with its registered-player count so
-- the app can show available spots. Registering still requires an account.
CREATE OR REPLACE FUNCTION get_public_daily_matches()
RETURNS TABLE(
  id                uuid,
  name              text,
  format            integer,
  "startDate"       text,
  "startTime"       text,
  location          text,
  "coinCost"        integer,
  "registeredCount" bigint
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    t.id,
    t.name::text,
    t.format::integer,
    t."startDate"::text,
    t."startTime"::text,
    t.location::text,
    t."coinCost"::integer,
    (SELECT count(*) FROM registrations r WHERE r."tournamentId" = t.id)
  FROM tournaments t
  WHERE t.type = 'daily' AND t."startDate"::date >= current_date
  ORDER BY t."startDate";
$$;
GRANT EXECUTE ON FUNCTION get_public_daily_matches() TO anon, authenticated;
