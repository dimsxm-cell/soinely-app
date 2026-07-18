import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAbonnement } from "@/lib/data/abonnement";

// Routes nécessitant une connexion. "/compte" en fait partie mais est
// volontairement absente de SUBSCRIPTION_REQUIRED_PATHS ci-dessous : une
// IDEL dont le paiement échoue doit toujours pouvoir atteindre son compte
// pour le corriger (portail Stripe), sinon la garde d'abonnement
// l'enfermerait hors de la seule page qui le lui permet.
const AUTH_REQUIRED_PATHS = ["/ma-journee", "/recherche", "/situations", "/ely", "/compte", "/patients"];

// Routes nécessitant en plus un abonnement essai/actif.
const SUBSCRIPTION_REQUIRED_PATHS = ["/ma-journee", "/recherche", "/situations", "/ely", "/patients"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const needsAuth = AUTH_REQUIRED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!needsAuth) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const needsSubscription = SUBSCRIPTION_REQUIRED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (needsSubscription) {
    const abonnement = await getAbonnement(supabase, user.id);
    const acces = abonnement?.statut === "essai" || abonnement?.statut === "actif";

    if (!acces) {
      return NextResponse.redirect(new URL("/abonnement", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/ma-journee/:path*",
    "/recherche/:path*",
    "/situations/:path*",
    "/ely/:path*",
    "/compte/:path*",
    "/patients/:path*",
  ],
};
