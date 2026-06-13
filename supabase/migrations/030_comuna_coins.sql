-- Comuna Coins: an in-app currency. Users buy coins with one real (simulated)
-- payment, then spend coins on actions (create team, join team, join daily
-- match, apply to a one-match). Refunds return coins to the wallet instead of
-- the card, so the user can re-spend without re-authorizing a payment.
--
-- Coin costs: create team 50 · join team 30 · daily match 20 · one match 10.

-- ---------------------------------------------------------------------------
-- 1. Wallets — one row per user, readable only by its owner
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  "userId"    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  coins       integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON wallets TO authenticated;

DROP POLICY IF EXISTS "read_own_wallet" ON wallets;
CREATE POLICY "read_own_wallet" ON wallets
  FOR SELECT TO authenticated USING ("userId" = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Balance + purchase + spend
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_coins()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT coins FROM wallets WHERE "userId" = auth.uid()), 0);
$$;

-- Simulated purchase: credits the caller's wallet. When real MercadoPago is
-- wired up, replace the client call with a server-side webhook that credits
-- the wallet only after a confirmed payment.
CREATE OR REPLACE FUNCTION add_coins(p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  INSERT INTO wallets("userId", coins) VALUES (auth.uid(), p_amount)
  ON CONFLICT ("userId") DO UPDATE
    SET coins = wallets.coins + p_amount, "updatedAt" = now();
END;
$$;

-- Deducts from the caller's own wallet (safe to expose: can only debit self).
CREATE OR REPLACE FUNCTION wallet_spend(p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bal integer;
BEGIN
  INSERT INTO wallets("userId", coins) VALUES (auth.uid(), 0)
  ON CONFLICT ("userId") DO NOTHING;

  SELECT coins INTO v_bal FROM wallets WHERE "userId" = auth.uid() FOR UPDATE;

  IF v_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  UPDATE wallets SET coins = coins - p_amount, "updatedAt" = now()
  WHERE "userId" = auth.uid();
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Create team (50 coins) — moved server-side so the spend is atomic
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_team(p_name text, p_format integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM teams WHERE auth.uid() = ANY("playerIds")) THEN
    RAISE EXCEPTION 'Already on a team';
  END IF;

  PERFORM wallet_spend(50);

  INSERT INTO teams(name, format, "playerIds", "ownerId", "createdAt")
  VALUES (p_name, p_format, ARRAY[auth.uid()], auth.uid(), now())
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Join team (30 coins) — spend when requesting; refunded if rejected
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION request_join_team(team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_captain_id     uuid;
  v_player_ids     uuid[];
  v_member_id      uuid;
  v_request_id     uuid;
  v_applicant_name text;
BEGIN
  SELECT "ownerId", "playerIds" INTO v_captain_id, v_player_ids
  FROM teams WHERE id = team_id;

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF COALESCE(array_length(v_player_ids, 1), 0) >= 8 THEN
    RAISE EXCEPTION 'Team is full';
  END IF;

  IF auth.uid() = ANY(v_player_ids) THEN
    RAISE EXCEPTION 'Already a member of this team';
  END IF;

  IF EXISTS (SELECT 1 FROM teams WHERE auth.uid() = ANY("playerIds")) THEN
    RAISE EXCEPTION 'Already on a team';
  END IF;

  IF EXISTS (
    SELECT 1 FROM team_join_requests
    WHERE "teamId" = team_id AND "userId" = auth.uid() AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Request already pending';
  END IF;

  PERFORM wallet_spend(30);

  INSERT INTO team_join_requests("teamId", "userId") VALUES (team_id, auth.uid())
  RETURNING id INTO v_request_id;

  SELECT COALESCE(name || ' ' || "lastName", 'Jugador') INTO v_applicant_name
  FROM users WHERE id = auth.uid();

  INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
  VALUES (v_captain_id, 'join_team_request', v_request_id, auth.uid(), v_applicant_name);

  FOREACH v_member_id IN ARRAY v_player_ids LOOP
    IF v_member_id <> v_captain_id THEN
      INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
      VALUES (v_member_id, 'join_team_request_info', v_request_id, auth.uid(), v_applicant_name);
    END IF;
  END LOOP;
END;
$$;

-- Reject refunds the 30 coins; accept adds the player to the team.
CREATE OR REPLACE FUNCTION respond_to_join_request(p_notification_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id   uuid;
  v_applicant_id uuid;
  v_team_id      uuid;
  v_captain_name text;
  v_player_ids   uuid[];
BEGIN
  SELECT "relatedId", "fromUserId" INTO v_request_id, v_applicant_id
  FROM notifications
  WHERE id = p_notification_id
    AND "userId" = auth.uid()
    AND type = 'join_team_request';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  SELECT "teamId" INTO v_team_id
  FROM team_join_requests
  WHERE id = v_request_id
    AND status = 'pending'
    AND "teamId" IN (SELECT id FROM teams WHERE "ownerId" = auth.uid());

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Request no longer pending';
  END IF;

  SELECT COALESCE(name || ' ' || "lastName", 'El capitán') INTO v_captain_name
  FROM users WHERE id = auth.uid();

  UPDATE notifications
  SET read = true,
      response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_notification_id;

  UPDATE notifications
  SET response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE "relatedId" = v_request_id
    AND type = 'join_team_request_info';

  IF p_accept THEN
    IF EXISTS (SELECT 1 FROM teams WHERE v_applicant_id = ANY("playerIds")) THEN
      RAISE EXCEPTION 'Applicant already joined another team';
    END IF;

    SELECT "playerIds" INTO v_player_ids FROM teams WHERE id = v_team_id;
    IF COALESCE(array_length(v_player_ids, 1), 0) >= 8 THEN
      RAISE EXCEPTION 'Team is full';
    END IF;

    UPDATE team_join_requests SET status = 'accepted' WHERE id = v_request_id;

    UPDATE teams
    SET "playerIds" = array_append("playerIds", v_applicant_id)
    WHERE id = v_team_id
      AND NOT (v_applicant_id = ANY("playerIds"));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_accepted', v_team_id, auth.uid(), v_captain_name);
  ELSE
    UPDATE team_join_requests SET status = 'rejected' WHERE id = v_request_id;

    -- Refund the 30 coins to the applicant's wallet.
    INSERT INTO wallets("userId", coins) VALUES (v_applicant_id, 30)
    ON CONFLICT ("userId") DO UPDATE
      SET coins = wallets.coins + 30, "updatedAt" = now();

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'join_team_rejected', v_team_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Daily match registration (20 coins)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_for_daily(p_tournament_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tournaments WHERE id = p_tournament_id AND type = 'daily'
  ) THEN
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

  PERFORM wallet_spend(20);

  INSERT INTO registrations("tournamentId", "userId", status)
  VALUES (p_tournament_id, auth.uid(), 'pending');
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. One-match application (10 coins) — spend on apply, refund if rejected
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION express_interest(request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_captain_id     uuid;
  v_applicant_name text;
BEGIN
  -- Already applied → no-op, no extra charge
  IF EXISTS (
    SELECT 1 FROM player_request_interests
    WHERE "requestId" = request_id AND "userId" = auth.uid()
  ) THEN
    RETURN;
  END IF;

  SELECT t."ownerId" INTO v_captain_id
  FROM player_requests pr
  JOIN teams t ON t.id = pr."teamId"
  WHERE pr.id = request_id AND pr.status = 'open';

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or closed';
  END IF;

  PERFORM wallet_spend(10);

  SELECT COALESCE(name || ' ' || "lastName", 'Jugador') INTO v_applicant_name
  FROM users WHERE id = auth.uid();

  INSERT INTO player_request_interests("requestId", "userId")
  VALUES (request_id, auth.uid())
  ON CONFLICT ("requestId", "userId") DO NOTHING;

  INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
  SELECT v_captain_id, 'player_request_interest', request_id, auth.uid(), v_applicant_name
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE "userId" = v_captain_id
      AND type = 'player_request_interest'
      AND "relatedId" = request_id
      AND "fromUserId" = auth.uid()
  );
END;
$$;

-- Reject refunds the 10 coins to the applicant.
CREATE OR REPLACE FUNCTION respond_to_interest(p_notification_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id   uuid;
  v_applicant_id uuid;
  v_match_id     uuid;
  v_captain_name text;
BEGIN
  SELECT "relatedId", "fromUserId" INTO v_request_id, v_applicant_id
  FROM notifications
  WHERE id = p_notification_id
    AND "userId" = auth.uid()
    AND type = 'player_request_interest';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  SELECT "matchId" INTO v_match_id FROM player_requests WHERE id = v_request_id;

  SELECT COALESCE(name || ' ' || "lastName", 'El capitán') INTO v_captain_name
  FROM users WHERE id = auth.uid();

  UPDATE notifications
  SET read = true,
      response = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_notification_id;

  IF p_accept THEN
    UPDATE matches
    SET "confirmedPlayerIds" = array_append(
      COALESCE("confirmedPlayerIds", '{}'::uuid[]),
      v_applicant_id
    )
    WHERE id = v_match_id
      AND NOT (v_applicant_id = ANY(COALESCE("confirmedPlayerIds", '{}'::uuid[])));

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'player_request_accepted', v_match_id, auth.uid(), v_captain_name);
  ELSE
    -- Refund the 10 coins to the applicant's wallet.
    INSERT INTO wallets("userId", coins) VALUES (v_applicant_id, 10)
    ON CONFLICT ("userId") DO UPDATE
      SET coins = wallets.coins + 10, "updatedAt" = now();

    INSERT INTO notifications("userId", type, "relatedId", "fromUserId", "fromName")
    VALUES (v_applicant_id, 'player_request_rejected', v_match_id, auth.uid(), v_captain_name);
  END IF;
END;
$$;
