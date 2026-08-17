import { COLORS } from "@/lib/brand";

/**
 * HōMI colour grade for the compass stills.
 *
 * The rendered object is brass on near-black. Rather than commission new art,
 * its luminance is gradient-mapped onto the canon ramp — navy in the shadows,
 * cyan-deep through cyan in the mids, light at the specular highlights. Brass
 * becomes instrument cyan and keeps every bit of its modelling, because the
 * map preserves luminance ordering.
 *
 * A hue rotation would have been one line and wrong: it drags the near-black
 * ground off navy too, and there is no rotation that lands brass on cyan
 * without sending the blue lens glint somewhere off-canon.
 *
 * `color-interpolation-filters="sRGB"` is required — the linearRGB default
 * washes the mids out badly.
 *
 * Every stop is derived from lib/brand COLORS, including the intermediates,
 * so the grade can never fork from the palette (and so no raw hex literal
 * lands in this file).
 */

/** Canon anchors and where they sit on the 0–1 luminance axis. */
const ANCHORS = [
  { at: 0, color: COLORS.navy },
  /**
   * Navy is held to here on purpose. The still's "black" ground is not
   * luminance zero — it sits around 0.1–0.2 — so a ramp that starts climbing
   * immediately lifts the whole backdrop to mid-teal and the panel reads as a
   * bright rectangle pasted on the page. Holding navy through the low end
   * keeps the panel ground level with the page ground and spends the entire
   * cyan range on the object itself.
   */
  { at: 0.28, color: COLORS.navy },
  { at: 0.62, color: COLORS.cyanDeep },
  { at: 0.8, color: COLORS.cyan },
  { at: 1, color: COLORS.light },
] as const;

/** feComponentTransfer reads tableValues as evenly spaced samples. */
const SAMPLES = 9;

function channelOf(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

/** Piecewise-linear sample of the anchor ramp at `t`, for one channel. */
function sample(t: number, index: number): number {
  const upper = ANCHORS.findIndex((a) => a.at >= t);
  if (upper <= 0) return channelOf(ANCHORS[0].color, index);
  const a = ANCHORS[upper - 1];
  const b = ANCHORS[upper];
  const span = b.at - a.at;
  const k = span === 0 ? 0 : (t - a.at) / span;
  return channelOf(a.color, index) + (channelOf(b.color, index) - channelOf(a.color, index)) * k;
}

function tableValues(index: number): string {
  return Array.from({ length: SAMPLES }, (_, i) =>
    sample(i / (SAMPLES - 1), index).toFixed(3),
  ).join(" ");
}

export const COMPASS_FILTER_ID = "homi-compass-grade";

export function CompassFilter() {
  return (
    <svg aria-hidden focusable="false" width="0" height="0" className="absolute">
      <defs>
        <filter id={COMPASS_FILTER_ID} colorInterpolationFilters="sRGB">
          {/* Luminance first — the map is a function of brightness alone. */}
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tableValues(0)} />
            <feFuncG type="table" tableValues={tableValues(1)} />
            <feFuncB type="table" tableValues={tableValues(2)} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
