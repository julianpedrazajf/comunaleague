-- View: player_stats with player name for easy identification in Supabase Table Editor.
-- Access it via Table Editor > player_stats_view or query it directly.

CREATE OR REPLACE VIEW player_stats_view AS
SELECT
  ps.id,
  ps."userId",
  u.name,
  u."lastName",
  ps.position,
  ps.goals,
  ps.assists,
  ps.matches,
  ps."updatedAt"
FROM player_stats ps
JOIN users u ON u.id = ps."userId"
ORDER BY u."lastName", u.name;
