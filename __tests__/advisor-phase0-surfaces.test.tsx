// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { PHASE0_PAUSE_COPY, writePhase0Freeze } from "@/lib/advisor/phase0";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Phase 0 freeze surface", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("freeze screen is Brand-verbatim and has no verdict tokens", () => {
    writePhase0Freeze({
      personKey: "guest",
      until: Date.now() + 60_000,
      trippedAt: Date.now(),
      financialStress: false,
      selfHarm: false,
      signalIds: ["hopelessness", "self_reported_instability"],
    });
    window.sessionStorage.setItem("homi:phase0-just-tripped", "1");

    const { container } = render(
      <Phase0FreezeScreen
        record={{
          personKey: "guest",
          until: Date.now() + 60_000,
          trippedAt: Date.now(),
          financialStress: false,
          selfHarm: false,
          signalIds: ["hopelessness", "self_reported_instability"],
        }}
      />,
    );

    expect(container.textContent).toContain(PHASE0_PAUSE_COPY.split("\n")[0]);
    expect(container.textContent).not.toContain("READY");
    expect(container.textContent).not.toContain("DO NOT PROCEED");
    expect(container.textContent).not.toContain("NOT YET");
    expect(container.innerHTML).not.toMatch(/<strong>|<em>|<b>|<i>/);
  });
});
