// supabase.js - Supabase client configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/+esm';

// Replace these with your actual Supabase project details
const SUPABASE_URL = 'https://bhnyabnvhhgshkzjduvr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobnlhYm52aGhnc2hrempkdXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTc4NTIsImV4cCI6MjA3NDM5Mzg1Mn0.fcDn7uCEVpZsEbePDQHomeJOgtrjUeuFV0bS6RjTgdw';

// Create and export Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export default supabase;