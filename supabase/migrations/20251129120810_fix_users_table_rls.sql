/*
  # Fix Users Table RLS for Login

  Temporarily disable RLS to allow unauthenticated logins via the users table.
  
  NOTE: For production, you should use Supabase Auth instead of a custom users table.
  This is a workaround for demo purposes.
*/

-- Disable RLS on users table to allow public login queries
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
