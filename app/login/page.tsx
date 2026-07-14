"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signInAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await signInAction(formData);
    if (result.success) {
      router.push("/ma-journee");
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold text-navy">Connexion</h1>
      <form action={handleSubmit} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          required
          placeholder="Adresse email"
          className="min-h-[44px] rounded-card border border-navy/20 px-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Mot de passe"
          className="min-h-[44px] rounded-card border border-navy/20 px-2"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit">Se connecter</Button>
      </form>
    </main>
  );
}
