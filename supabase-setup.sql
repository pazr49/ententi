-- Create the articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  pub_date TEXT,
  content TEXT,
  content_snippet TEXT,
  guid TEXT NOT NULL UNIQUE,
  iso_date TEXT,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the user_id column for faster queries
CREATE INDEX IF NOT EXISTS articles_user_id_idx ON articles (user_id);

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policies for the single user case
-- For now, we'll use a simple policy that allows all operations
-- This can be refined later when implementing multi-user support
CREATE POLICY "Allow all operations for now" 
  ON articles 
  USING (true) 
  WITH CHECK (true); 