"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updatePasswordAction } from "./actions";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await updatePasswordAction(formData);
    if (result.success) {
      router.push("/ma-journee");
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F7F5] text-navy">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-14">
        <h1 className="text-center font-display text-[28px] font-medium leading-tight">
          Nouveau mot de passe
        </h1>
        <form
          action={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-[20px] border border-navy/10 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_rgba(15,23,42,.06)]"
        >
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Nouveau mot de passe"
            className="min-h-[44px] rounded-card border border-navy/20 px-3"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit">Enregistrer</Button>
        </form>
      </div>
    </main>
  );
}
