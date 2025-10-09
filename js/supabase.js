// supabase.js - Secure Supabase client configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/+esm';

// Secure environment variable loader
const getSupabaseConfig = () => {
  // Method 1: Vite environment variables (development)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      console.info('Using Vite environment variables');
      return { url, key };
    }
  }

  // Method 2: Global environment variables (Netlify/Production)
  if (typeof window !== 'undefined' && window.__ENV__) {
    const url = window.__ENV__.VITE_SUPABASE_URL;
    const key = window.__ENV__.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      console.info('Using global environment variables');
      return { url, key };
    }
  }

  // Method 3: Throw error - never hardcode credentials
  throw new Error(
    'Supabase configuration is missing. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'are set in your environment variables.'
  );
};

const config = getSupabaseConfig();

// Validate URL format
if (!config.url.startsWith('https://')) {
  throw new Error('Supabase URL must use HTTPS');
}

// Validate key format (basic JWT format check)
if (!config.key.startsWith('eyJ')) {
  throw new Error('Invalid Supabase anon key format');
}

const supabase = createClient(config.url, config.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // More secure than implicit flow
  }
});

// Test connection with timeout
const connectionTest = Promise.race([
  supabase.auth.getSession(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Connection timeout')), 10000)
  )
]);

connectionTest.then(({ data, error }) => {
  // const { data, error } = result;
  if (error) {
    console.error('Supabase connection failed:', error);
  } else {
    console.info('Supabase connected successfully');
  }
}).catch(error => {
  console.error('Supabase connection test failed:', error);
});

export default supabase;