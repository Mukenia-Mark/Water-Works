// supabase.js - Supabase client configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/+esm';

// Get environment variables
const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Fallback for direct browser usage
  if (!url || !key) {
    console.warn('Environment variables not found. Using development defaults or checking window object.');

    // Check if we're in development and use defaults
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return {
        url: 'url',
        key: 'anon_key'
      };
    }

    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }

  return { url, key };
};

const config = getSupabaseConfig();
const supabase = createClient(config.url, config.key);

// Test connection on startup
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.info('Supabase connected successfully!');
  }
});

export default supabase;