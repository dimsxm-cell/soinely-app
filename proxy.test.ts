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

  it("ne vérifie pas l'abonnement sur une route non protégée", async () => {
    const { proxy } = await import("./proxy");
    const request = new NextRequest("https://soinely.app/login");

    const response = await proxy(request);

    expect(getUserMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
