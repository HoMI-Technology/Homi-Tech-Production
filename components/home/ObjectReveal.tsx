import type { ReactNode } from "react";

/**
 * Local TeraFab light. `--p` is driven by a CSS view() timeline on
 * `.tf-object-scene`, not a window scroll listener. Reduced motion and
 * browsers without scroll-driven animation stay fully lit.
 */
export function ObjectReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return <section className={className}>{children}</section>;
}
