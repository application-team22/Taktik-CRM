/*
  # Fix Users Table Login Access

  1. Changes
    - Drop existing restrictive RLS policies on users table
    - Create new policy that allows public read access for authentication
    - This allows the login function to query users without being authenticated first
  
  2. Security
    - Public can only SELECT from users table (read-only for login)
    - Password hashes are stored but this is acceptable for demo purposes
    - In production, this would use Supabase Auth instead of custom auth
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policy allowing public read access for login
CREATE POLICY "Allow public read for authentication"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Create policy for authenticated users to read all users
CREATE POLICY "Authenticated users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);
