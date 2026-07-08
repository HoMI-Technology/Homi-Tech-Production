import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { LEGAL_DISCLAIMER } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="field grain flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="HōMI home" className="mb-6">
        <Wordmark size="text-2xl" />
      </Link>

      <ThresholdCompass size={96} glow className="mb-6" />

      <div className="glass w-full max-w-md p-8">{children}</div>

      <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-dim/70">
        {LEGAL_DISCLAIMER}
      </p>
    </div>
  );
}
