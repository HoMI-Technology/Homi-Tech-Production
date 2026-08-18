/**
 * Bank-file Identity (/identity/get) — not Identity Verification, not a CRA.
 * Name is the field Plaid always returns. Persist full owners server-side; the client gets
 * a redacted view (display name, initials, city/region).
 */

export interface PlaidIdentityEmail {
  data: string;
  primary?: boolean;
  type?: string;
}

export interface PlaidIdentityPhone {
  data: string;
  primary?: boolean;
  type?: string;
}

export interface PlaidIdentityAddress {
  primary?: boolean;
  data: {
    street?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };
}

export interface PlaidIdentityOwner {
  names?: string[];
  emails?: PlaidIdentityEmail[];
  phone_numbers?: PlaidIdentityPhone[];
  addresses?: PlaidIdentityAddress[];
}

export interface IdentityOwnerRow {
  item_id: string;
  user_id: string;
  account_id: string;
  names: string[];
  emails: PlaidIdentityEmail[];
  phone_numbers: PlaidIdentityPhone[];
  addresses: PlaidIdentityAddress[];
}

export function mapIdentityOwners(input: {
  itemId: string;
  userId: string;
  accounts: Array<{ account_id: string; owners?: PlaidIdentityOwner[] }>;
}): IdentityOwnerRow[] {
  return input.accounts.map((account) => {
    const owners = account.owners ?? [];
    return {
      item_id: input.itemId,
      user_id: input.userId,
      account_id: account.account_id,
      names: owners.flatMap((owner) => owner.names ?? []),
      emails: owners.flatMap((owner) => owner.emails ?? []),
      phone_numbers: owners.flatMap((owner) => owner.phone_numbers ?? []),
      addresses: owners.flatMap((owner) => owner.addresses ?? []),
    };
  });
}

export interface RedactedIdentity {
  display_name: string | null;
  initials: string | null;
  city: string | null;
  region: string | null;
}

export function redactIdentityForClient(owner: PlaidIdentityOwner): RedactedIdentity {
  const displayName = owner.names?.[0]?.trim() || null;
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .filter(Boolean)
        .filter((_, index, all) => index === 0 || index === all.length - 1)
        .join("")
    : null;
  const primaryAddress =
    owner.addresses?.find((address) => address.primary) ?? owner.addresses?.[0];
  return {
    display_name: displayName,
    initials,
    city: primaryAddress?.data?.city ?? null,
    region: primaryAddress?.data?.region ?? null,
  };
}
