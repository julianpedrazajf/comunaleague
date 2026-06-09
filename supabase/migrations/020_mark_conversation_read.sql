-- RPC to mark all messages from a specific sender as read for the current user.
-- SECURITY DEFINER ensures the update works regardless of RLS configuration,
-- but the WHERE clause strictly limits it to the current user's received messages.
CREATE OR REPLACE FUNCTION mark_conversation_read(p_peer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET read = true
  WHERE "fromId" = p_peer_id
    AND "toId" = auth.uid()
    AND read = false;
END;
$$;
