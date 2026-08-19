import type { AssessmentProvenance } from "@/lib/scoring/public";

function creditLabel(credit: AssessmentProvenance["credit"]): string {
  switch (credit) {
    case "band_ignored":
      return "credit band (not scored)";
    case "self_report_digit":
      return "credit self-report";
    case "none":
      return "credit none";
    default: {
      const _exhaustive: never = credit;
      return _exhaustive;
    }
  }
}

function sourceLabel(value: "self_report" | "verified" | "ledger_earmark"): string {
  switch (value) {
    case "verified":
      return "linked";
    case "ledger_earmark":
      return "linked earmark";
    case "self_report":
      return "self-report";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

/**
 * One quiet honesty line. Not a second score. Not a second compass.
 */
export function ProvenanceLine({
  provenance,
  className = "",
}: {
  provenance?: AssessmentProvenance | null;
  className?: string;
}) {
  if (!provenance) {
    return (
      <p className={`text-xs leading-relaxed text-dim/70 ${className}`}>
        Numbers: self-report. Link a bank on Money to confirm DTI and runway.
      </p>
    );
  }

  const lookback =
    provenance.lookbackDays != null ? ` · ${provenance.lookbackDays}d lookback` : "";

  return (
    <p className={`text-xs leading-relaxed text-dim/70 ${className}`}>
      Numbers: DTI {sourceLabel(provenance.dti)} · down payment{" "}
      {sourceLabel(provenance.downPayment)} · runway {sourceLabel(provenance.runway)} ·{" "}
      {creditLabel(provenance.credit)}
      {lookback}.
    </p>
  );
}
