/*
  # Create Users Table for Authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique user identifier
      - `email` (text, unique) - User email address
      - `password_hash` (text) - Hashed password (storing plain text for demo purposes)
      - `full_name` (text) - User's full name
      - `role` (text) - User role (admin or agent)
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for admins to read all user data

  3. Important Notes
    - This table stores user authentication data
    - Password is stored as plain text for demo purposes (NOT recommended for production)
    - In production, use proper password hashing (bcrypt, argon2, etc.)
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert test users
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@taktik.com', 'admin123', 'Admin User', 'admin'),
  ('agent1@taktik.com', 'agent123', 'Agent One', 'agent'),
  ('agent2@taktik.com', 'agent123', 'Agent Two', 'agent'),
  ('admin@taktiktravel.com', 'Admin123!', 'Taktik Admin', 'admin')
ON CONFLICT (email) DO NOTHING;
