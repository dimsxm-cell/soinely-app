import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAbonnement } from "@/lib/data/abonnement";

const PROTECTED_PATHS = ["/ma-journee", "/recherche", "/situations", "/ely"];

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

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtected) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const abonnement = await getAbonnement(supabase, user.id);
  const acces = abonnement?.statut === "essai" || abonnement?.statut === "actif";

  if (!acces) {
    return NextResponse.redirect(new URL("/abonnement", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/ma-journee/:path*",
    "/recherche/:path*",
    "/situations/:path*",
    "/ely/:path*",
  ],
};
