import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — used in client components
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server client — used in server components, API routes, proxy
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
