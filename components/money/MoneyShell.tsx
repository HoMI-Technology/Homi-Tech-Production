import type { ReactNode } from "react";
import { PageFrame } from "@/components/operate/PageFrame";
import { MoneyModeNav } from "@/components/money/MoneyModeNav";

/**
 * Shared chrome for every Money Reality surface.
 * Mode nav is the product spine: Stand · Track · Plan · Decide.
 */
export function MoneyShell({
  children,
  width = "content",
}: {
  children: ReactNode;
  width?: "content" | "default" | "full";
}) {
  return (
    <PageFrame width={width} density="spacious" role="personal">
      <p className="eyebrow">Operate · reality</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Money</h1>
      <p className="mt-2 max-w-2xl text-dim">
        One honest picture of your finances — then the math behind decisions that matter.
        Educational guidance only.
      </p>
      <MoneyModeNav />
      <div className="mt-8">{children}</div>
    </PageFrame>
  );
}
