-- Trigger: auto-create a player_stats row (all zeros) when a new user is inserted.
-- After running this, every new registration automatically gets a player_stats row.
-- As admin, just open Table Editor > player_stats and update the numbers.

CREATE OR REPLACE FUNCTION create_player_stats_on_register()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_stats ("userId", position, goals, assists, matches)
  VALUES (NEW.id, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_registered
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_player_stats_on_register();
