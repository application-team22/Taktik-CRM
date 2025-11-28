/*
  # Create Clients Table for Taktik CRM

  1. New Tables
    - `clients`
      - `id` (uuid, primary key) - Unique identifier for each client
      - `name` (text) - Client's full name
      - `phone_number` (text) - Client's phone number
      - `destination` (text) - Travel destination client is interested in
      - `status` (text) - Current status in sales pipeline (New Lead, Contacted, Interested, Not Interested, Booked)
      - `price` (numeric) - Trip cost/price quote
      - `country` (text) - Client's home country
      - `created_at` (timestamptz) - When the client record was created
      - `updated_at` (timestamptz) - When the client record was last updated

  2. Security
    - Enable RLS on `clients` table
    - Add policy for public access to allow CRM operations
    
  3. Notes
    - Status field will be validated at application level
    - Price stored as numeric for precise financial calculations
    - Timestamps for tracking and sorting by recency
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'New Lead',
  price numeric(10, 2) DEFAULT 0,
  country text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on clients"
  ON clients
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);