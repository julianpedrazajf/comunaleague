-- Trigger: auto-create a standings row (all zeros) when a new team is created.
-- After running this, every new team automatically gets a standings row
-- (tournamentId = null, i.e. general/league-wide standing).
-- As admin, open Table Editor > standings (or team_stats_view to find it by name)
-- and update the numbers.

CREATE OR REPLACE FUNCTION create_standings_on_team_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO standings ("teamId", "tournamentId", position, wins, draws, losses, points)
  VALUES (NEW.id, NULL, 0, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_standings_on_team_created();
