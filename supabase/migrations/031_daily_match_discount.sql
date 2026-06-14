-- Per-daily-match coin cost, so admins can offer discounts on specific
-- matches. When "coinCost" is null the standard 20-coin price applies; set a
-- lower value to discount a match (the app shows the standard price struck
-- through next to the discounted one).

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "coinCost" integer;

CREATE OR REPLACE FUNCTION register_for_daily(p_tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
  v_cost  int;
BEGIN
  SELECT COALESCE("coinCost", 20) INTO v_cost
  FROM tournaments
  WHERE id = p_tournament_id AND type = 'daily';

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Daily match not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM registrations
    WHERE "tournamentId" = p_tournament_id AND "userId" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already registered';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM registrations WHERE "tournamentId" = p_tournament_id;

  IF v_count >= 18 THEN
    RAISE EXCEPTION 'Match is full';
  END IF;

  PERFORM wallet_spend(v_cost);

  INSERT INTO registrations("tournamentId", "userId", status)
  VALUES (p_tournament_id, auth.uid(), 'pending');
END;
$$;
