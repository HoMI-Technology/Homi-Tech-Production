import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatTile } from "@/components/ui/StatTile";
import {
  shapeCalibration,
  totalResponses,
  readinessDividend,
  verdictLabel,
  verdictColor,
  type CalibrationRow,
} from "@/lib/outcomes/calibration";

export const metadata: Metadata = {
  title: "Readiness Calibration | HōMI",
  description:
    "The Outcome Verification Network — proof, from real outcomes, that the verdict predicts how decisions actually turn out.",
};

export default async function CalibrationPage() {
  const supabase = await createClient();

  let rows: CalibrationRow[] = shapeCalibration(null);
  try {
    const { data } = await supabase.rpc("get_readiness_calibration");
    rows = shapeCalibration(data as Partial<CalibrationRow>[] | null);
  } catch {
    rows = shapeCalibration(null);
  }

  const total = totalResponses(rows);
  const dividend = readinessDividend(rows);
  const maxCount = Math.max(1, ...rows.map((r) => r.response_count));

  return (
    <div className="field">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="eyebrow">Outcome Verification Network</p>
        <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Readiness Calibration</h1>
        <p className="mt-2 max-w-2xl text-dim">
          Every verdict HōMI gives is a prediction. This is where those predictions get checked against
          what actually happened — anonymized across everyone who reported an outcome. No opinions, just
          the record.
        </p>

        {/* Headline dividend */}
        {dividend ? (
          <div className="glass panel-focus mt-8 p-8">
            <p className="eyebrow">How outcomes track with the verdict</p>
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="score-numeral text-5xl font-bold text-emerald" style={{ textShadow: "0 0 40px #34d39955" }}>
                {dividend.deltaPct >= 0 ? "+" : ""}
                {Math.round(dividend.deltaPct)}%
              </span>
              <span className="pb-1 text-lg text-light">higher satisfaction</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
              Members the compass cleared as <span className="text-emerald">READY</span> reported{" "}
              {dividend.readyAvg.toFixed(1)}/5 satisfaction with how their decision turned out — versus{" "}
              {dividend.waitedAvg.toFixed(1)}/5 among those it told to wait. That&rsquo;s an{" "}
              <em>association</em>, not proof of cause: people who are ready differ in many ways from people
              who aren&rsquo;t, and this is self-reported. We show it because a working readiness signal
              should line up with real outcomes — and we&rsquo;ll show it just as plainly if it ever
              doesn&rsquo;t.
            </p>
          </div>
        ) : (
          <div className="glass mt-8 p-8">
            <p className="eyebrow">The network is still learning</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
              Calibration needs completed outcomes to report against. As members reach their 30-, 90-, and
              365-day check-ins and tell us how their decision actually turned out, this page fills in — and
              the honest test begins: do the people we cleared as <span className="text-emerald">READY</span>{" "}
              really end up more satisfied than the people we asked to wait? We publish the answer either way.
            </p>
            <div className="mt-6">
              <Link href="/outcomes" className="btn btn-ghost !px-4 !py-2 text-sm">
                Record an outcome
              </Link>
            </div>
          </div>
        )}

        {/* Per-verdict calibration */}
        <div className="glass mt-8 p-8">
          <SectionHeader
            eyebrow="By verdict"
            title="How each verdict turned out"
            subtitle={`${total.toLocaleString()} completed outcome${total === 1 ? "" : "s"} in the network.`}
          />
          <div className="mt-6 space-y-5">
            {rows.map((r) => {
              const color = verdictColor(r.verdict);
              const hasData = r.response_count > 0;
              const widthPct = Math.max(2, Math.round((r.response_count / maxCount) * 100));
              return (
                <div key={r.verdict}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-light">
                      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      {verdictLabel(r.verdict)}
                    </span>
                    <span className="score-numeral text-dim">
                      {hasData ? (
                        <>
                          {r.avg_satisfaction.toFixed(1)}/5 avg · {Math.round(r.positive_rate * 100)}% positive ·{" "}
                          {r.response_count.toLocaleString()} reported
                        </>
                      ) : (
                        "not enough reported yet"
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${hasData ? widthPct : 0}%`,
                        background: `linear-gradient(90deg, ${color}88, ${color})`,
                        boxShadow: hasData ? `0 0 16px -4px ${color}` : "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Method note */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatTile label="Total outcomes" value={total.toLocaleString()} accent="#22d3ee" footer="30/90/365-day check-ins" />
          <StatTile
            label="READY satisfaction"
            value={dividend ? `${dividend.readyAvg.toFixed(1)}` : "—"}
            unit={dividend ? "/5" : undefined}
            accent="#34d399"
            footer="Cleared to proceed"
          />
          <StatTile
            label="Waited-anyway"
            value={dividend ? `${dividend.waitedAvg.toFixed(1)}` : "—"}
            unit={dividend ? "/5" : undefined}
            accent="#f24822"
            footer="Told to wait"
          />
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-dim">
          Calibration is computed from anonymized, aggregated outcome surveys — never individual records,
          and no cohort with fewer than five reported outcomes is ever shown. These are associations
          between the verdict you received and later self-reported satisfaction, not proof that the verdict
          caused the outcome. Educational evidence about decision readiness, not financial advice.
        </p>
      </div>
    </div>
  );
}
