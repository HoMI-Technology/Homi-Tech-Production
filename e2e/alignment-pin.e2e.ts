import { test, expect } from "@playwright/test";

/**
 * Homepage AlignmentScene pinned-scroll cinema.
 *
 * Asserts the sticky stage stays in viewport while scroll progress advances
 * data-step through all four ring states — the regression that previously
 * showed blank navy between states when body overflow-x:hidden killed sticky.
 *
 * Title checks use DOM text on the active `.pin-step` (not getByRole visibility):
 * inactive steps are aria-hidden, and `.pin-step` opacity transitions over 600ms,
 * so role+visible assertions race the reveal and flake under short lg viewports.
 */

const STEP_TITLES = [
  "Financial Reality",
  "Emotional Truth",
  "Perfect Timing",
  "The compass becomes a key",
] as const;

async function scrollPinThrough(page: import("@playwright/test").Page) {
  const scene = page.locator(".pin-scene");
  await expect(scene).toBeVisible();
  const stage = page.getByTestId("alignment-pin-stage");
  await expect(stage).toBeVisible();

  const vh = page.viewportSize()?.height ?? 900;
  const sceneTop = (await scene.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY;
  })) as number;
  const sceneHeight = (await scene.evaluate((el) => (el as HTMLElement).offsetHeight)) as number;
  const travel = Math.max(1, sceneHeight - vh);

  const seen = new Set<number>();
  // Walk the pin range in fine steps so we catch every data-step.
  for (let i = 0; i <= 40; i++) {
    const p = i / 40;
    await page.evaluate(
      ({ top, travel, p }) => {
        window.scrollTo(0, top + travel * p);
      },
      { top: sceneTop, travel, p },
    );
    // Allow rAF + React setState to flush (not the full 600ms CSS fade).
    await page.waitForTimeout(50);

    const stepAttr = await stage.getAttribute("data-step");
    const step = Number(stepAttr);
    expect(Number.isFinite(step)).toBe(true);
    expect(step).toBeGreaterThanOrEqual(0);
    expect(step).toBeLessThanOrEqual(3);
    seen.add(step);

    const stageBox = await stage.boundingBox();
    expect(stageBox).toBeTruthy();
    // Sticky: stage top should sit near the viewport top while we are inside
    // the pin range. Allow a few px of subpixel / mobile chrome slack.
    if (p > 0.08 && p < 0.92) {
      expect(Math.abs(stageBox!.y)).toBeLessThanOrEqual(16);
      expect(stageBox!.height).toBeGreaterThanOrEqual(vh - 24);
      // Active step copy is present in the DOM for the current data-step.
      // Avoid getByRole(...).toBeVisible() — aria-hidden siblings + opacity
      // transitions make that race the 600ms .pin-step fade.
      const titleText = await stage.locator(".pin-step").nth(step).locator("h3").innerText();
      expect(titleText.trim()).toBe(STEP_TITLES[step as 0 | 1 | 2 | 3]);
    }
  }
  return seen;
}

test.describe("AlignmentScene pinned scroll", () => {
  test.use({
    colorScheme: "dark",
  });

  for (const viewport of [
    { width: 1440, height: 900, name: "desktop-1440" },
    { width: 1024, height: 768, name: "laptop-1024" },
    { width: 390, height: 844, name: "mobile-390" },
  ] as const) {
    test(`keeps stage sticky and advances all four steps @ ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addInitScript(() => {
        try {
          sessionStorage.clear();
        } catch {
          /* ignore */
        }
      });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });

      // Dismiss cookie banner if present so it does not eat viewport height.
      const consent = page.getByRole("button", { name: /accept|agree|got it|allow/i });
      if (await consent.count()) {
        await consent.first().click().catch(() => undefined);
        await page.waitForTimeout(100);
      }

      const seen = await scrollPinThrough(page);
      for (const expected of [0, 1, 2, 3]) {
        expect(
          seen.has(expected),
          `expected to visit step ${expected} (${STEP_TITLES[expected]})`,
        ).toBe(true);
      }
    });
  }
});
