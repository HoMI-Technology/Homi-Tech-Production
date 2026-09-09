import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";

export function WhatChangedV4({ line }: { line: string | null }) {
  return (
    <HomeSectionV4
      kicker="What changed"
      data-home-v4-changed=""
      aria-label="What changed"
      className="v4-changed"
    >
      <p className="v4-changed-line">{line ?? "Nothing to compare until a read lands."}</p>
    </HomeSectionV4>
  );
}
