import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GUIDES, getGuide } from "@/components/marketing/guides-data";
import GuidePage from "@/app/(marketing)/guides/[slug]/page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const FAQ_SLUG = "am-i-ready-to-buy-a-house";
/** Any guide that carries no faqs — the control for "renders exactly as before". */
const PLAIN_SLUG = "afford-is-not-ready";

async function renderGuide(slug: string): Promise<string> {
  const page = await GuidePage({ params: Promise.resolve({ slug }) });
  return renderToStaticMarkup(page);
}

describe("guide FAQs — data", () => {
  it("the readiness guide carries exactly four Q&As; the control guide carries none", () => {
    const withFaqs = getGuide(FAQ_SLUG);
    expect(withFaqs?.faqs).toHaveLength(4);
    expect(getGuide(PLAIN_SLUG)?.faqs).toBeUndefined();
  });

  it("every FAQ answer stays never-say clean", () => {
    const banned = [/you qualify/i, /pre-approved/i, /guaranteed/i, /bank-level/i, /best deal/i];
    for (const guide of GUIDES) {
      for (const faq of guide.faqs ?? []) {
        for (const pattern of banned) {
          expect(faq.a, `${guide.slug}: ${faq.q}`).not.toMatch(pattern);
        }
      }
    }
  });
});

describe("guide FAQs — rendering", () => {
  it("a guide with faqs renders the Common questions section and every Q&A", async () => {
    const html = await renderGuide(FAQ_SLUG);
    const guide = getGuide(FAQ_SLUG);

    expect(html).toContain("Common questions");
    for (const faq of guide?.faqs ?? []) {
      expect(html).toContain(faq.q.replace(/&/g, "&amp;"));
    }
  });

  it("a guide with faqs emits FAQPage JSON-LD alongside the Article JSON-LD", async () => {
    const html = await renderGuide(FAQ_SLUG);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"Question"');
    expect(html).toContain('"@type":"Article"');
  });

  it("a guide without faqs renders no FAQ section and no FAQPage JSON-LD", async () => {
    const html = await renderGuide(PLAIN_SLUG);
    expect(html).not.toContain("Common questions");
    expect(html).not.toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"Article"');
  });
});
