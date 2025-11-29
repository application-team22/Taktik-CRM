/*
  # Add Phone Column to Users Table

  1. Changes
    - Add `phone` column to the `users` table
      - Type: text
      - Optional field
      - Stores agent/user phone numbers

  2. Notes
    - This is a safe additive change
    - Existing rows will have NULL phone values by default
    - No data loss or disruption
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
END $$;
