import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { UnsubscribeConfirm } from "@/components/marketing/UnsubscribeConfirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Manage your HōMI email preferences.",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const { e, t } = await searchParams;

  return (
    <section className="px-6 py-24">
      <div className="glass mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl text-light">Email preferences</h1>
        {e && t ? (
          <UnsubscribeConfirm email={e} token={t} />
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-dim">
            This unsubscribe link is missing its verification details. Use the link from the bottom
            of a HōMI email, or{" "}
            <Link href="/" className="text-cyan hover:underline">
              return home
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
