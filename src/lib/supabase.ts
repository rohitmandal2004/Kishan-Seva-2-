import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
 console.error(
 '[Kishan Seva] FATAL: Supabase environment variables not configured.\n' +
 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n' +
 'Get these from: https://supabase.com/dashboard → Settings → API'
 );
}

// Supabase is DATABASE ONLY — no auth configuration needed.
// Authentication is handled entirely by Clerk. We inject the Clerk JWT dynamically.
let clerkGetToken: ((options?: { template?: string }) => Promise<string | null>) | null = null;

export const setClerkTokenProvider = (provider: (options?: { template?: string }) => Promise<string | null>) => {
  clerkGetToken = provider;
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options?.headers);
        if (clerkGetToken) {
          try {
            const token = await clerkGetToken({ template: 'supabase' });
            if (token) {
              headers.set('Authorization', `Bearer ${token}`);
            }
          } catch (e) {
            console.warn('[Kishan Seva] Failed to fetch Clerk Supabase token:', e);
          }
        }
        return fetch(url, { ...options, headers });
      }
    }
  }
);

/**
 * Returns true only when real Supabase credentials are configured.
 * This gates all Supabase API calls — if false, the app uses local-only mode.
 */
export const isSupabaseConfigured = (): boolean => {
 return Boolean(
 supabaseUrl && 
 supabaseKey && 
 !supabaseUrl.includes('placeholder') &&
 !supabaseKey.includes('placeholder')
 );
};

export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string; latencyMs?: number }> {
 if (!isSupabaseConfigured()) {
 return { connected: false, message: 'Supabase not configured — running in local-only mode' };
 }

 const start = performance.now();
 try {
 const { data, error } = await supabase.from('procurement_centres').select('count', { count: 'exact', head: true });
 const latency = Math.round(performance.now() - start);
 
 if (error) {
 return { 
 connected: false, 
 message: `Supabase query error (${latency}ms) — [${error.message}]`, 
 latencyMs: latency 
 };
 }
 return { connected: true, message: `Connected to Supabase (${latency}ms)`, latencyMs: latency };
 } catch (err: any) {
 return { connected: false, message: err?.message || 'Failed to connect to Supabase' };
 }
}
