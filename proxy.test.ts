import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

describe("proxy", () => {
  beforeEach(() => {
    getUserMock.mockClear();
    eqSelectMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
  });
  it("redirige vers /login si non connecté sur une route protégée", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirige vers /abonnement si connecté mais sans abonnement essai/actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "impaye" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("redirige vers /abonnement si connecté et aucune ligne abonnements n'existe encore", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("laisse passer si aucun abonnement mais le compte a moins de 15 jours (essai gratuit)", async () => {
    const ilYA5Jours = new Date(Date.now() - 5 * 86_400_000).toISOString();
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", created_at: ilYA5Jours } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirige vers /abonnement si aucun abonnement et le compte a plus de 15 jours", async () => {
    const ilYA20Jours = new Date(Date.now() - 20 * 86_400_000).toISOString();
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", created_at: ilYA20Jours } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("redirige vers /abonnement même dans les 15 jours si l'abonnement existe avec un statut impayé", async () => {
    const ilYA5Jours = new Date(Date.now() - 5 * 86_400_000).toISOString();
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", created_at: ilYA5Jours } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "impaye" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("laisse passer si connecté avec un abonnement en essai", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "essai" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("laisse passer si connecté avec un abonnement actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "actif" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/ma-journee");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirige vers /login si non connecté sur /compte", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/compte");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("laisse passer sur /compte même sans abonnement essai/actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "impaye" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/compte");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirige vers /abonnement si connecté sur /patients mais sans abonnement essai/actif", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    eqSelectMock.mockResolvedValue({ data: { statut: "impaye" }, error: null });

    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/patients");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/abonnement");
  });

  it("ne vérifie pas l'abonnement sur une route non protégée", async () => {
    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/login");

    const response = await proxy(request);

    expect(getUserMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
