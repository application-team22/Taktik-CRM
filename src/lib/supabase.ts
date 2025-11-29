import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqedudmsebenrclxakpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZWR1ZG1zZWJlbnJjbHhha3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDY3MjQsImV4cCI6MjA3OTk4MjcyNH0.MQAwv_PirqtNdHBYRWcvb_vD7Yzx8Yyp5gbMaEUCv2w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'agent';
};
