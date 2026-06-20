-- Transfer Comuna Coins between official teammates. From "My Team" a member can
-- send coins to anyone on the same team (everyone in teams."playerIds"). The
-- move is atomic — debit sender, credit recipient — and the recipient gets a
-- 'coins_received' notification showing how many coins arrived.

-- 1) Notifications can carry an amount (used by 'coins_received').
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS amount integer;

-- 2) Allow the new notification type.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'player_request_interest',
  'player_request_accepted',
  'player_request_rejected',
  'join_team_request',
  'join_team_request_info',
  'join_team_accepted',
  'join_team_rejected',
  'new_daily_match',
  'coins_received'
));

-- 3) Transfer coins to a teammate.
CREATE OR REPLACE FUNCTION transfer_coins(p_to_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender      uuid := auth.uid();
  v_sender_name text;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF p_to_user_id = v_sender THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  -- Sender and recipient must be official members of the same team.
  IF NOT EXISTS (
    SELECT 1 FROM teams
    WHERE v_sender = ANY("playerIds") AND p_to_user_id = ANY("playerIds")
  ) THEN
    RAISE EXCEPTION 'Not teammates';
  END IF;

  -- Debit the sender (locks the row and checks the balance), then credit the
  -- recipient — both in this transaction, so a failure rolls back the whole move.
  PERFORM wallet_spend(p_amount);

  INSERT INTO wallets("userId", coins) VALUES (p_to_user_id, p_amount)
  ON CONFLICT ("userId") DO UPDATE
    SET coins = wallets.coins + p_amount, "updatedAt" = now();

  SELECT COALESCE(name || ' ' || "lastName", 'Un compañero') INTO v_sender_name
  FROM users WHERE id = v_sender;

  INSERT INTO notifications("userId", type, "fromUserId", "fromName", amount)
  VALUES (p_to_user_id, 'coins_received', v_sender, v_sender_name, p_amount);
END;
$$;
GRANT EXECUTE ON FUNCTION transfer_coins(uuid, integer) TO authenticated;
