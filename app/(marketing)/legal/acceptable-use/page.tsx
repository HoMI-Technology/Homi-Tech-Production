import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "The rules and guidelines for using HōMI's Services.",
  alternates: { canonical: "/legal/acceptable-use" },
};

// Text recovered verbatim from the v153 build (src/pages/AcceptableUsePage.tsx);
// heading/paragraph order corrected here (the built page rendered several
// headings after their bodies). Counsel should confirm before launch.
export default function AcceptableUsePage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Acceptable Use Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="type-h3">1. Purpose</h2>
            <p className="mt-3 leading-relaxed">
              This Acceptable Use Policy (&ldquo;AUP&rdquo;) defines the rules and guidelines for
              using {BRAND.legalEntity}&rsquo;s Services. By using our Services, you agree to comply
              with this AUP.
            </p>
          </div>

          <div>
            <h2 className="type-h3">2. Prohibited Activities</h2>
            <p className="mt-3 leading-relaxed">You may not use our Services to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>Violate any applicable law, regulation, or ordinance</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Distribute malware, viruses, or other harmful code</li>
              <li>
                Attempt to gain unauthorized access to our systems or other users&rsquo; accounts
              </li>
              <li>Conduct denial-of-service attacks or other disruptive activities</li>
              <li>Scrape, crawl, or otherwise collect data without authorization</li>
            </ul>
          </div>

          <div>
            <h2 className="type-h3">3. Account Security</h2>
            <p className="mt-3 leading-relaxed">
              You are responsible for maintaining the security of your account. Notify us
              immediately of any unauthorized access or security breach.
            </p>
          </div>

          <div>
            <h2 className="type-h3">4. Content Standards</h2>
            <p className="mt-3 leading-relaxed">
              Any content you submit must not be unlawful, defamatory, obscene, or otherwise
              objectionable. We reserve the right to remove any content that violates this policy.
            </p>
          </div>

          <div>
            <h2 className="type-h3">5. Enforcement</h2>
            <p className="mt-3 leading-relaxed">
              Violations of this AUP may result in suspension or termination of your account, legal
              action, and referral to law enforcement where appropriate.
            </p>
          </div>

          <div>
            <h2 className="type-h3">6. Reporting Violations</h2>
            <p className="mt-3 leading-relaxed">
              Report suspected violations to{" "}
              <a href="mailto:abuse@homitechnology.com" className="text-cyan hover:underline">
                abuse@homitechnology.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
