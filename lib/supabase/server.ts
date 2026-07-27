import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Mémorisé par requête (via React cache) : plusieurs appels à createClient()
// pendant le rendu d'une même requête (layout + page, par ex.) réutilisent
// le même client au lieu de relire les cookies à chaque fois. La mémorisation
// est propre à chaque requête, jamais partagée entre utilisateurs/requêtes.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component during render. Safe to
            // ignore here because proxy.ts refreshes the session on
            // every request to the routes that need it.
          }
        },
      },
    }
  );
});

// supabase.auth.getUser() revalide toujours l'utilisateur auprès du serveur
// Supabase (contrairement à getSession()) — un vrai aller-retour réseau à
// chaque appel. proxy.ts fait déjà cet appel pour les routes protégées ;
// sans mémorisation, le layout et chaque page le refaisaient chacun de leur
// côté, multipliant les allers-retours réseau à chaque navigation. Mémorisé
// par requête ici, un seul appel réseau est effectué même si plusieurs
// composants serveur demandent l'utilisateur pendant le même rendu.
export const getUtilisateurConnecte = cache(async function getUtilisateurConnecte(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
