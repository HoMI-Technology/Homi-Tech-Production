import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Policy",
  description: "HōMI's notice-and-takedown policy for copyright infringement claims.",
  alternates: { canonical: "/legal/dmca" },
};

// Text recovered verbatim from the v153 build (src/pages/DmcaPage.tsx);
// heading/paragraph order corrected here. Counsel should confirm the
// designated-agent address before launch.
export default function DmcaPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black text-light">DMCA Policy</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="text-xl font-bold text-light">1. DMCA Notice and Takedown Policy</h2>
            <p className="mt-3 leading-relaxed">
              HOMI TECHNOLOGIES LLC respects the intellectual property rights of others and expects
              users of our Services to do the same.
            </p>
            <p className="mt-3 leading-relaxed">
              If you believe that your copyrighted work has been copied in a way that constitutes
              copyright infringement and is accessible via our Services, please notify our designated
              copyright agent.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">2. Reporting Copyright Infringement</h2>
            <p className="mt-3 leading-relaxed">
              A valid notice of claimed infringement should include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>A physical or electronic signature of the copyright owner or authorized agent</li>
              <li>Identification of the copyrighted work claimed to have been infringed</li>
              <li>Identification of the material that is claimed to be infringing</li>
              <li>Your contact information (address, telephone number, email)</li>
              <li>A statement that you have a good faith belief the use is not authorized</li>
              <li>A statement that the information is accurate, under penalty of perjury</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">3. Designated Copyright Agent</h2>
            <p className="mt-3 leading-relaxed">
              Email:{" "}
              <a href="mailto:dmca@homitechnology.com" className="text-cyan hover:underline">
                dmca@homitechnology.com
              </a>
              <br />
              Mailing Address: HOMI TECHNOLOGIES LLC, Attn: Copyright Agent, 651 N Broad St, Suite
              201, Middletown, DE 19709
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">4. Counter-Notification</h2>
            <p className="mt-3 leading-relaxed">
              If you believe your content was removed in error, you may submit a counter-notification
              containing your contact information, identification of the removed material, and a
              statement under penalty of perjury.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-light">5. Repeat Infringers</h2>
            <p className="mt-3 leading-relaxed">
              We will terminate the accounts of users who are repeat infringers in appropriate
              circumstances.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
