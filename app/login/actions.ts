"use server";

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
