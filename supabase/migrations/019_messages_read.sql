-- Add read status to messages so recipients can track unread conversations.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Allow recipients to mark their received messages as read.
CREATE POLICY "recipient_mark_read"
  ON messages FOR UPDATE
  TO authenticated
  USING ("toId" = auth.uid())
  WITH CHECK ("toId" = auth.uid());
