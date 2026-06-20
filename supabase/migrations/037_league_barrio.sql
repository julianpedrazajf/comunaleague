-- Tournaments are created by the admin (you), one per neighborhood (barrio), so
-- teams can pick the tournament whose location is most convenient for them.
--
-- Create one from the Supabase SQL editor (status/maxClubs use their defaults —
-- it opens as 'filling' with room for 10 clubs):
--   insert into leagues (name, barrio) values ('Liga San Fernando', 'San Fernando');
-- It then shows up in the in-app "Choose a tournament" picker until it fills,
-- after which the season starts automatically.

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS barrio text;
