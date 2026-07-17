"use server";

import { createClient } from "@/lib/supabase/server";

export async function updatePasswordAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
