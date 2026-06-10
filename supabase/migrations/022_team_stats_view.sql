-- View: standings with team name for easy identification in Supabase Table Editor.
-- Access it via Table Editor > team_stats_view or query it directly.
-- To update a team's position/wins/points, edit the corresponding row in the
-- standings table (use teamId from this view to find it).

CREATE OR REPLACE VIEW team_stats_view
WITH (security_invoker = on) AS
SELECT
  s.id,
  s."teamId",
  t.name,
  t.format,
  s."tournamentId",
  s.position,
  s.wins,
  s.draws,
  s.losses,
  s.points,
  s."updatedAt"
FROM standings s
JOIN teams t ON t.id = s."teamId"
ORDER BY s.position;
