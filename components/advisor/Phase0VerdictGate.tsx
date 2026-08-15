"use client";

import type { ReactNode } from "react";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { usePhase0Freeze } from "@/hooks/usePhase0Freeze";
import { Phase0FreezeScreen } from "./Phase0FreezeScreen";

/**
 * Detection must finish before any verdict / score / pathway renders.
 * Pending → skeleton (no verdict). Frozen → Brand freeze. Open → children.
 */
export function Phase0VerdictGate({
  children,
  onStartFresh,
}: {
  children: ReactNode;
  onStartFresh?: () => void;
}) {
  const freeze = usePhase0Freeze();

  if (freeze.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ProductLoadingSkeleton label="Loading" />
      </div>
    );
  }

  if (freeze.status === "frozen" && freeze.record) {
    return <Phase0FreezeScreen record={freeze.record} onStartFresh={onStartFresh} />;
  }

  return children;
}
