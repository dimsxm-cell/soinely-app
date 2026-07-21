"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signUpAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const fullName = String(formData.get("fullName"));
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Supabase ne renvoie pas d'erreur pour un email déjà inscrit et confirmé
  // (protection anti-énumération) : il renvoie un faux succès avec un tableau
  // identities vide et n'envoie aucun email. On détecte ce cas pour ne pas
  // afficher un message "vérifiez votre boîte mail" trompeur.
  if (data?.user?.identities?.length === 0) {
    return {
      success: false,
      error: "Un compte existe déjà avec cette adresse. Connectez-vous plutôt.",
    };
  }

  return { success: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const email = String(formData.get("email"));
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
