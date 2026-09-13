import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

/**
 * 404 body only — no SiteHeader/SiteFooter and no extra `main#main`.
 * Root `app/not-found.tsx` wraps this in chrome for unmatched URLs.
 * Group `not-found.tsx` files sit inside marketing/product layouts that
 * already provide chrome, so they render this alone.
 */
export function NotFoundContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <ThresholdCompass size={180} className="compass-float" />
      <h1 className="mt-8 type-h1">Off the compass.</h1>
      <p className="mt-3 max-w-md text-dim">
        This page doesn&rsquo;t exist. That&rsquo;s not a no &mdash; it&rsquo;s just not here.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Back to true north
      </Link>
    </div>
  );
}
