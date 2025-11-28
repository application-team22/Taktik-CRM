/*
  # Add Notes and Tasks Tables

  ## New Tables
  
  ### notes
  - `id` (uuid, primary key) - Unique identifier for each note
  - `client_id` (uuid, foreign key) - References the client this note belongs to
  - `content` (text) - The note content
  - `created_at` (timestamptz) - When the note was created
  - `updated_at` (timestamptz) - When the note was last updated
  
  ### tasks
  - `id` (uuid, primary key) - Unique identifier for each task
  - `client_id` (uuid, foreign key) - References the client this task is for
  - `description` (text) - Task description
  - `due_date` (date) - When the task is due
  - `status` (text) - Task status: 'pending' or 'completed'
  - `created_at` (timestamptz) - When the task was created
  - `updated_at` (timestamptz) - When the task was last updated
  - `completed_at` (timestamptz, nullable) - When the task was completed

  ## Security
  - Enable RLS on both tables
  - Add policies for public access (since auth is not implemented yet)
  
  ## Notes
  1. Both tables reference the clients table
  2. Foreign key constraints ensure data integrity
  3. Indexes added for performance on lookups by client_id
  4. Default values ensure timestamps are always set
*/

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  description text NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_client_id ON notes(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now since no auth)
CREATE POLICY "Allow public read access to notes"
  ON notes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to notes"
  ON notes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to notes"
  ON notes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to notes"
  ON notes FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to tasks"
  ON tasks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to tasks"
  ON tasks FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to tasks"
  ON tasks FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to tasks"
  ON tasks FOR DELETE
  TO public
  USING (true);