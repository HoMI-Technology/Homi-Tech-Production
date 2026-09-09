import Link from "next/link";
import { HOME_V4_HOMI_PROMPTS } from "@/lib/v4/home-state";

/**
 * Optional right HōMI — educational prompts only.
 * No Homie cast, no second score, no companion orb.
 */
export function HomeV4HomiRail() {
  return (
    <aside
      className="space-y-4 rounded-2xl border border-white/[0.04] bg-navy-light/40 p-5"
      data-home-v4-homi=""
      aria-label="HōMI"
    >
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">HōMI</p>
      <p className="text-sm text-light/85">Educational prompts. Not a second score.</p>
      <ul className="space-y-2">
        {HOME_V4_HOMI_PROMPTS.map((prompt) => (
          <li key={prompt.label}>
            <Link
              href={prompt.href}
              className="block rounded-xl border border-white/[0.04] px-3 py-2 text-sm text-light/85 hover:border-cyan/40 hover:text-cyan"
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
