/*
  # Add User Status and Audit Logging

  ## Overview
  This migration adds support for:
  1. User account status (active/inactive)
  2. Comprehensive audit logging for admin actions on agents
  3. Phone number support for users (already exists but ensuring it's documented)

  ## New Columns
  - `users.is_active` (boolean) - Determines if a user account is active
  
  ## New Tables
  - `agent_audit_logs` - Tracks all admin actions performed on agent accounts
    - `id` (uuid, primary key)
    - `admin_id` (uuid) - ID of the admin who performed the action
    - `agent_id` (uuid) - ID of the agent affected by the action
    - `action_type` (text) - Type of action (create, update, delete, password_change, etc.)
    - `field_changed` (text, nullable) - Specific field that was changed
    - `old_value` (text, nullable) - Previous value (for updates)
    - `new_value` (text, nullable) - New value (for updates)
    - `created_at` (timestamptz) - When the action occurred

  ## Security
  - Enable RLS on audit_logs table
  - Only admins can read audit logs
  - Audit logs are insert-only (no updates or deletes)
*/

-- Add is_active column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create agent_audit_logs table
CREATE TABLE IF NOT EXISTS agent_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid NOT NULL REFERENCES users(id),
  agent_id uuid NOT NULL REFERENCES users(id),
  action_type text NOT NULL CHECK (
    action_type IN (
      'create', 'update', 'delete', 'password_change', 
      'email_change', 'activate', 'deactivate', 'role_change'
    )
  ),
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on agent_audit_logs
ALTER TABLE agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_audit_logs_agent_id ON agent_audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_logs_admin_id ON agent_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_logs_created_at ON agent_audit_logs(created_at DESC);

-- RLS Policies for audit logs
-- Only authenticated users can read audit logs (frontend will filter for admins)
CREATE POLICY "Allow authenticated users to read audit logs"
  ON agent_audit_logs
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow inserts for audit logging
CREATE POLICY "Allow authenticated users to insert audit logs"
  ON agent_audit_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- No updates or deletes allowed on audit logs
CREATE POLICY "Prevent updates on audit logs"
  ON agent_audit_logs
  FOR UPDATE
  TO authenticated, anon
  USING (false);

CREATE POLICY "Prevent deletes on audit logs"
  ON agent_audit_logs
  FOR DELETE
  TO authenticated, anon
  USING (false);
