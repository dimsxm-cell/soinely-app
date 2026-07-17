import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const eqSelectMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: () => ({ maybeSingle: eqSelectMock }) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("next/headers", () => ({
  headers: () => new Map([["origin", "https://soinely.app"]]),
}));

const checkoutSessionsCreateMock = vi.fn();
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function() {
    return {
      checkout: { sessions: { create: checkoutSessionsCreateMock } },
    };
  }),
}));

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_PRICE_ID_SOLO = "price_solo_test";
  process.env.STRIPE_PRICE_ID_CABINET = "price_cabinet_test";
});

describe("createCheckoutSessionAction", () => {
  it("crée une session Checkout avec le bon prix et redirige vers son URL", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "marie@example.com" } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session_123" });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "solo");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        client_reference_id: "u1",
        line_items: [{ price: "price_solo_test", quantity: 1 }],
        subscription_data: { trial_period_days: 14 },
        success_url: "https://soinely.app/abonnement/succes",
        cancel_url: "https://soinely.app/abonnement",
      })
    );
    expect(redirectMock).toHaveBeenCalledWith("https://checkout.stripe.com/session_123");
  });

  it("utilise le prix cabinet quand plan=cabinet", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "marie@example.com" } } });
    eqSelectMock.mockResolvedValue({ data: null, error: null });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session_456" });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "cabinet");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_cabinet_test", quantity: 1 }] })
    );
  });

  it("réutilise le stripe_customer_id existant s'il y en a déjà un", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "marie@example.com" } } });
    eqSelectMock.mockResolvedValue({ data: { stripe_customer_id: "cus_existant" }, error: null });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session_789" });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "solo");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existant" })
    );
  });

  it("ne fait rien si l'utilisateur n'est pas authentifié", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "solo");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ne fait rien si le plan est inconnu", async () => {
    const { createCheckoutSessionAction } = await import("./abonnement-actions");

    const formData = new FormData();
    formData.set("plan", "inconnu");

    await createCheckoutSessionAction(formData);

    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });
});
