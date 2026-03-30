import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client — safe to use in browser and server components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — server-side only, bypasses RLS
// Use only in API routes and server actions with SUPABASE_SERVICE_KEY
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is not set");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}
