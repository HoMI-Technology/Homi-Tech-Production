"use client";

/** PR1 placeholders — full Calendar/Banks/Wealth/Plan land in PR2–3. */

function Shell({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="glass rounded-xl border border-line p-6 sm:p-8">
      <p className="eyebrow text-cyan">Coming in this stream</p>
      <h2 className="mt-2 font-display text-2xl italic text-light">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-dim">{body}</p>
    </section>
  );
}

export function CalendarPlaceholder() {
  return (
    <Shell
      title="Decision calendar"
      body="Month, week, and agenda views with projected runway and bill pay land next. Overview already tracks cash flow and transactions."
    />
  );
}

export function BankingPlaceholder() {
  return (
    <Shell
      title="Banks & bills"
      body="Manual accounts and closed-loop bill pay land next. Prefer Connections for live Plaid when available."
    />
  );
}

export function WealthPlaceholder() {
  return (
    <Shell
      title="Wealth"
      body="Holdings, brokers, and net-worth stack land next. Sample data can seed portfolio numbers from Overview."
    />
  );
}

export function PlanPlaceholder() {
  return (
    <Shell
      title="Plan Lab"
      body="Path to Ready, housing lens, debt, household dual score, and Monte Carlo land next. Generate Path from Overview once profile is set."
    />
  );
}
