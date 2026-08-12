export const WAITLIST_INTEREST_VALUES = [
  "home-buying",
  "career-change",
  "major-purchase",
  "teams",
] as const;

export type WaitlistInterest = (typeof WAITLIST_INTEREST_VALUES)[number];

export const WAITLIST_INTERESTS: { value: WaitlistInterest; label: string }[] = [
  { value: "home-buying", label: "Home buying" },
  { value: "career-change", label: "Career change" },
  { value: "major-purchase", label: "Major purchase" },
  { value: "teams", label: "Teams / benefits" },
];

export const WAITLIST_SOURCES = ["landing", "waitlist", "site"] as const;

export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];
