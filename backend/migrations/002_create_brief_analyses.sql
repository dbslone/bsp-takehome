CREATE TABLE IF NOT EXISTS brief_analyses (
  id uuid PRIMARY KEY,
  brief_id uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'error')),
  model text,
  result jsonb,
  error text,
  raw_response text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS brief_analyses_brief_created
  ON brief_analyses (brief_id, created_at DESC);
