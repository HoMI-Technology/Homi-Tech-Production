/**
 * Shared matchMedia stub for T1 behavior tests.
 * jsdom has no CSSOM media queries; this is the sanctioned double.
 */

export type MatchMediaStubOptions = {
  reducedMotion?: boolean;
  hoverFine?: boolean;
};

export function stubMatchMedia(
  options: MatchMediaStubOptions = {},
): (query: string) => MediaQueryList {
  const reducedMotion = options.reducedMotion ?? false;
  const hoverFine = options.hoverFine ?? false;

  return (query: string): MediaQueryList => {
    const matches =
      query.includes("prefers-reduced-motion")
        ? reducedMotion
        : query.includes("hover: hover") && query.includes("pointer: fine")
          ? hoverFine
          : false;

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    };
  };
}
