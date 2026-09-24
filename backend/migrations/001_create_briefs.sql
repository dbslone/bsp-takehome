CREATE TABLE IF NOT EXISTS briefs (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  content_type text NOT NULL,
  target_audience text NOT NULL,
  notes text NOT NULL,
  file_name text NOT NULL,
  file_mime text NOT NULL,
  file_size integer NOT NULL,
  file_bytes bytea NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
