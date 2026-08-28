/** Pricing FAQ copy — sibling module so page.tsx only exports Next's allowed set. */

export interface PricingFaq {
  q: string;
  a: string;
}

export const FAQS: PricingFaq[] = [
  {
    q: "Why do you charge at all if you’re not selling a transaction?",
    a: "Someone has to pay for an honest voice to exist. We charge a subscription rather than taking commissions, so what HōMI earns doesn’t depend on what you decide.",
  },
  {
    q: "What happens if HōMI tells me DO NOT PROCEED?",
    a: "You still keep your report, your plan, and access to the tools. DO NOT PROCEED comes with a map for what to build first — it’s not a wall, it’s a starting line.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There’s no lock-in and no retention maze. Cancel from your account settings whenever you want; you keep access through the end of the billing period.",
  },
  {
    q: "Do you sell my financial data?",
    a: "No. Never. See our privacy policy for the full detail, but the short version is: your data is yours, and it isn’t for sale.",
  },
  {
    q: "Is HōMI financial advice?",
    a: "No. HōMI is a Decision Companion: educational guidance only. It helps you see your own situation clearly — it doesn’t recommend products, and it isn’t a substitute for a licensed advisor.",
  },
];
