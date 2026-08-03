import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <ThresholdCompass size={180} className="compass-float" />
        <h1 className="mt-8 text-4xl font-black text-light">Off the compass.</h1>
        <p className="mt-3 max-w-md text-dim">
          This page doesn&rsquo;t exist. That&rsquo;s not a no &mdash; it&rsquo;s just not here.
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Back to true north
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
