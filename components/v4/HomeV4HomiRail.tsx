import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { HOME_V4_HOMI_PROMPTS } from "@/lib/v4/home-state";
import { V4_HOMI_RAIL_WIDTH_PX } from "@/lib/layout/v4-shell";

/**
 * Contextual right HōMI — educational prompts only.
 * Not a permanent Companion peer. No Homie cast, no second score, no orb.
 */
export function HomeV4HomiRail() {
  return (
    <aside
      className="space-y-4 border-l border-white/[0.06] pl-5"
      data-home-v4-homi=""
      aria-label="HōMI"
      style={{
        width: V4_HOMI_RAIL_WIDTH_PX,
        maxWidth: V4_HOMI_RAIL_WIDTH_PX,
        backgroundColor: COLORS.navyLight,
      }}
    >
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">HōMI</p>
      <p className="text-sm text-light/85">Educational prompts. Not a second score.</p>
      <ul className="space-y-2">
        {HOME_V4_HOMI_PROMPTS.map((prompt) => (
          <li key={prompt.label}>
            <Link
              href={prompt.href}
              className="block py-1 text-sm text-light/85 hover:text-light"
              data-home-v4-homi-prompt=""
            >
              {prompt.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
