import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Route tests for GET /api/plaid/accounts — the route serves connected
 * accounts from the database (user-scoped client, safe plaid_items columns
 * only) and never calls the Plaid API.
 */

type ItemRow = {
  id: string;
  institution_name: string | null;
  status: string;
  last_successful_sync: string | null;
};

type AccountRow = Record<string, unknown> & { item_id: string };

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  items: [] as ItemRow[],
  itemsError: null as { code?: string; message: string } | null,
  accounts: [] as AccountRow[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "plaid_items") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          order: async () => ({ data: state.items, error: state.itemsError }),
        };
        return builder;
      }
      // plaid_accounts
      const builder = {
        select: () => builder,
        in: async () => ({ data: state.accounts, error: null }),
      };
      return builder;
    },
  }),
}));

import { GET } from "@/app/api/plaid/accounts/route";

let requestCount = 0;

function req(): Request {
  requestCount += 1;
  return new Request("http://localhost/api/plaid/accounts", {
    // Distinct IP per request so the per-IP limiter never trips across tests.
    headers: { "x-forwarded-for": `10.3.0.${requestCount}` },
  });
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.items = [];
  state.itemsError = null;
  state.accounts = [];
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/plaid/accounts", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns an empty configured list when nothing is connected", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true, items: [] });
  });

  it("reports configured:false (still 200, still serving db state) without Plaid env", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "");
    vi.stubEnv("PLAID_SECRET", "");
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false, items: [] });
  });

  it("returns items with their accounts nested, straight from the database", async () => {
    state.items = [
      {
        id: "item-1",
        institution_name: "First Test Bank",
        status: "healthy",
        last_successful_sync: "2026-07-14T12:00:00Z",
      },
      {
        id: "item-2",
        institution_name: "Second Credit Union",
        status: "login_required",
        last_successful_sync: null,
      },
    ];
    state.accounts = [
      {
        id: "a1",
        item_id: "item-1",
        account_id: "acc_1",
        name: "Checking",
        mask: "1234",
        type: "depository",
        subtype: "checking",
        current_balance: 1500.25,
        available_balance: 1400.5,
        iso_currency: "USD",
        updated_at: "2026-07-14T12:00:00Z",
      },
      {
        id: "a2",
        item_id: "item-1",
        account_id: "acc_2",
        name: "Savings",
        mask: "5678",
        type: "depository",
        subtype: "savings",
        current_balance: 9000,
        available_balance: 9000,
        iso_currency: "USD",
        updated_at: "2026-07-14T12:00:00Z",
      },
    ];

    // No Plaid API call should ever happen in this route.
    const networkSpy = vi.fn().mockRejectedValue(new Error("network call attempted"));
    vi.stubGlobal("fetch", networkSpy);

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      configured: boolean;
      items: { id: string; accounts: unknown[] }[];
    };
    expect(body.configured).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toEqual({
      id: "item-1",
      institution_name: "First Test Bank",
      status: "healthy",
      last_successful_sync: "2026-07-14T12:00:00Z",
      accounts: [
        {
          id: "a1",
          account_id: "acc_1",
          name: "Checking",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          current_balance: 1500.25,
          available_balance: 1400.5,
          iso_currency: "USD",
          updated_at: "2026-07-14T12:00:00Z",
        },
        {
          id: "a2",
          account_id: "acc_2",
          name: "Savings",
          mask: "5678",
          type: "depository",
          subtype: "savings",
          current_balance: 9000,
          available_balance: 9000,
          iso_currency: "USD",
          updated_at: "2026-07-14T12:00:00Z",
        },
      ],
    });
    expect(body.items[1].accounts).toEqual([]);
    expect(networkSpy).not.toHaveBeenCalled();
  });

  it("degrades to an empty list while migration 00017 is not applied yet", async () => {
    state.itemsError = { code: "42P01", message: 'relation "plaid_items" does not exist' };
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true, items: [] });
  });

  it("500s with a correlation id on an unexpected database error", async () => {
    state.itemsError = { code: "XX000", message: "boom" };
    const res = await GET(req());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { correlationId?: string };
    expect(body.correlationId).toBeTruthy();
  });
});
