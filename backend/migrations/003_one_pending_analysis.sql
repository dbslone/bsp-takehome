UPDATE brief_analyses AS older
SET status = 'error',
    error = 'Superseded by a newer analysis',
    completed_at = now()
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM brief_analyses AS newer
    WHERE newer.brief_id = older.brief_id
      AND newer.status = 'pending'
      AND (
        newer.created_at > older.created_at
        OR (newer.created_at = older.created_at AND newer.id > older.id)
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS brief_analyses_one_pending
  ON brief_analyses (brief_id)
  WHERE status = 'pending';
