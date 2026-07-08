import { Chat } from "@/components/advisor/Chat";

export const metadata = {
  title: "Decision Companion",
  description: "Talk it through with HōMI — your homie, not your banker.",
};

export default function AdvisorPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-light sm:text-3xl">
          Talk it through
        </h1>
        <p className="mt-2 text-sm text-dim">
          Your homie for this decision, not your banker. Ask anything — you&rsquo;ll get the truth,
          even when it&rsquo;s &ldquo;not yet.&rdquo;
        </p>
      </div>

      <Chat />
    </div>
  );
}
