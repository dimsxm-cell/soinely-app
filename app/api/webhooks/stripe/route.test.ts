import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const constructEventMock = vi.fn();
const subscriptionsRetrieveMock = vi.fn();
vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: constructEventMock };
    subscriptions = { retrieve: subscriptionsRetrieveMock };
  } as unknown as typeof Stripe,
}));

const upsertMock = vi.fn().mockResolvedValue({ error: null });
const eqUpdateMock = vi.fn().mockResolvedValue({ error: null });
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const fromMock = vi.fn(() => ({ upsert: upsertMock, update: updateMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRICE_ID_SOLO = "price_solo_test";
  process.env.STRIPE_PRICE_ID_CABINET = "price_cabinet_test";
});

function fakeRequest(body: string, signature: string | null) {
  return new Request("https://soinely.app/api/webhooks/stripe", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  it("rejette une requête sans en-tête de signature", async () => {
    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", null));

    expect(response.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("rejette un payload dont la signature ne vérifie pas", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("signature invalide");
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_invalide"));

    expect(response.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("checkout.session.completed : crée/complète la ligne abonnements avec le bon plan", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "u1",
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });
    subscriptionsRetrieveMock.mockResolvedValue({
      status: "trialing",
      trial_end: 1750000000,
      items: { data: [{ price: { id: "price_cabinet_test" }, current_period_end: 1751000000 }] },
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("abonnements");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "u1",
        plan: "cabinet",
        statut: "essai",
        stripe_customer_id: "cus_1",
        stripe_subscription_id: "sub_1",
      }),
      { onConflict: "profile_id" }
    );
  });

  it("customer.subscription.updated : synchronise le statut sur stripe_subscription_id", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "past_due",
          items: { data: [{ current_period_end: 1751000000 }] },
        },
      },
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ statut: "impaye" })
    );
    expect(eqUpdateMock).toHaveBeenCalledWith("stripe_subscription_id", "sub_1");
  });

  it("customer.subscription.deleted : passe le statut à annule", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          items: { data: [{ current_period_end: 1751000000 }] },
        },
      },
    });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ statut: "annule" })
    );
  });

  it("checkout.session.completed : retourne 500 si l'écriture en base échoue (pour que Stripe réessaie)", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "u1",
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });
    subscriptionsRetrieveMock.mockResolvedValue({
      status: "trialing",
      trial_end: 1750000000,
      items: { data: [{ price: { id: "price_solo_test" }, current_period_end: 1751000000 }] },
    });
    upsertMock.mockResolvedValueOnce({ error: { message: "boom" } });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(500);
  });

  it("customer.subscription.updated : retourne 500 si la mise à jour en base échoue", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          items: { data: [{ current_period_end: 1751000000 }] },
        },
      },
    });
    eqUpdateMock.mockResolvedValueOnce({ error: { message: "boom" } });

    const { POST } = await import("./route");

    const response = await POST(fakeRequest("{}", "sig_valide"));

    expect(response.status).toBe(500);
  });
});
