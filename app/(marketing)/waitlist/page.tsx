import type { Metadata } from "next";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { Reveal } from "@/components/ui/Reveal";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export const metadata: Metadata = {
  title: "Get Notified",
  description:
    "Tell HōMI what you're deciding on, and we'll reach out when it's your turn. No filler, no spam — just the truth when it's ready.",
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistPage() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <ThresholdCompass size={140} className="compass-float" />
        <h1 className="mt-8 type-h1">We&rsquo;ll tell you when it&rsquo;s your turn.</h1>
        <p className="mt-4 text-dim">
          Tell us what you&rsquo;re deciding on. We&rsquo;ll reach out with the truth, not a sales
          sequence.
        </p>

        <Reveal className="mt-10 w-full">
          <WaitlistForm source="waitlist" idPrefix="waitlist-page" />
        </Reveal>
      </div>
    </section>
  );
}
