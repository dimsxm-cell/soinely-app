import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Client service_role : contourne RLS. Réservé au webhook Stripe
// (app/api/webhooks/stripe/route.ts) — jamais utilisé pour une requête
// initiée par un utilisateur, jamais exposé au navigateur.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
