import type { Metadata } from "next";
import Link from "next/link";
import { InventChromeEmpty } from "@/components/dashboard/InventChromeEmpty";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";

export const metadata: Metadata = {
  title: "Learn",
  description: "In-app Learn is an empty shell. Public guides stay on the live /guides route.",
  alternates: { canonical: "/learn" },
};

/** PR13 invent-chrome. No live /learn curriculum — do not invent courses. */
export default function LearnPage() {
  return (
    <JobDepthFrame job="learn">
      <InventChromeEmpty
        job="learn"
        eyebrow="Learn"
        title="Learn"
        body="There is no live in-app Learn surface yet. Public guides stay on the live site — this rail row is an honest empty shell, not a second curriculum."
        connect={false}
      />
      <p className="mt-6 text-sm text-dim">
        <Link href="/guides" className="text-cyan underline-offset-2 hover:underline">
          Open public guides
        </Link>
      </p>
    </JobDepthFrame>
  );
}
