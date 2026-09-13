import type { HTMLAttributes, ReactNode } from "react";

export function HomeSectionV4({
  title,
  kicker,
  children,
  className = "",
  ...attrs
}: {
  title?: string;
  kicker?: string;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`v4-section ${className}`.trim()} {...attrs}>
      {kicker ? <p className="v4-section-kicker">{kicker}</p> : null}
      {title ? <h2 className="v4-section-title">{title}</h2> : null}
      {children}
    </section>
  );
}
