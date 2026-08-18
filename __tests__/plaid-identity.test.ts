import { describe, it, expect } from "vitest";
import { mapIdentityOwners, redactIdentityForClient } from "@/lib/plaid/identity";

const OWNERS = [
  {
    names: ["Alberta Bobbeth Charleson"],
    emails: [{ data: "accountholder0@example.com", primary: true, type: "primary" }],
    phone_numbers: [{ data: "2025550123", primary: false, type: "home" }],
    addresses: [
      {
        primary: true,
        data: {
          street: "2992 Cameron Road",
          city: "Malakoff",
          region: "NY",
          postal_code: "14236",
          country: "US",
        },
      },
    ],
  },
];

describe("mapIdentityOwners", () => {
  it("maps bank-file owners onto one row per account", () => {
    const rows = mapIdentityOwners({
      itemId: "item-uuid",
      userId: "user-uuid",
      accounts: [{ account_id: "acc_1", owners: OWNERS }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      item_id: "item-uuid",
      user_id: "user-uuid",
      account_id: "acc_1",
      names: ["Alberta Bobbeth Charleson"],
    });
    expect(rows[0].emails).toEqual(OWNERS[0].emails);
    expect(rows[0].phone_numbers).toEqual(OWNERS[0].phone_numbers);
    expect(rows[0].addresses).toEqual(OWNERS[0].addresses);
  });

  it("keeps a joint account as one owner object with multiple names", () => {
    const rows = mapIdentityOwners({
      itemId: "item-uuid",
      userId: "user-uuid",
      accounts: [
        {
          account_id: "acc_joint",
          owners: [{ names: ["Pat Lee", "Sam Lee"], emails: [], phone_numbers: [], addresses: [] }],
        },
      ],
    });
    expect(rows[0].names).toEqual(["Pat Lee", "Sam Lee"]);
  });
});

describe("redactIdentityForClient", () => {
  it("never returns street, email, or phone to the browser", () => {
    const redacted = redactIdentityForClient({
      names: ["Alberta Bobbeth Charleson"],
      emails: [{ data: "accountholder0@example.com", primary: true, type: "primary" }],
      phone_numbers: [{ data: "2025550123", primary: false, type: "home" }],
      addresses: [
        {
          primary: true,
          data: { city: "Malakoff", region: "NY", postal_code: "14236", country: "US" },
        },
      ],
    });
    expect(JSON.stringify(redacted)).not.toContain("Cameron");
    expect(JSON.stringify(redacted)).not.toContain("accountholder0");
    expect(JSON.stringify(redacted)).not.toContain("2025550123");
    expect(redacted.display_name).toBe("Alberta Bobbeth Charleson");
    expect(redacted.initials).toBe("AC");
    expect(redacted.city).toBe("Malakoff");
    expect(redacted.region).toBe("NY");
  });
});
