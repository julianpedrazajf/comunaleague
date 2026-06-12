-- Daily matches created by Comuna League also need a scheduled time.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "startTime" time;
