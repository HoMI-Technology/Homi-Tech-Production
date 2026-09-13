"use client";

import { SystemWorkspaceV4 } from "@/components/v4/system/SystemWorkspaceV4";
import type { EmployeeV4View } from "@/lib/v4/employee-workspace";

export function EmployeeWorkspaceV4({ view }: { view: EmployeeV4View }) {
  return (
    <div data-employee-v4="" data-employee-v4-kind={view.kind}>
      <SystemWorkspaceV4
        surface="employee"
        kind={view.kind}
        hardStopActive={view.hardStopActive}
        decisionContext={view.decisionContext}
        verdictLabel={view.verdictLabel}
        holdLead={view.holdLead}
        holdMeta={view.holdMeta}
        title={view.title}
        body={view.body}
        ageLabel={view.ageLabel}
        cta={view.cta}
        prompts={view.prompts}
        askPlaceholder={view.askPlaceholder}
      >
        {view.jobs.length > 0 ? (
          <ul className="v4-system-rows" aria-label="Operate jobs" data-employee-v4-jobs="">
            {view.jobs.map((job) => (
              <li
                key={job.id}
                id={job.id}
                className="v4-system-row"
                data-employee-v4-job={job.id}
              >
                <span className="v4-system-row-copy">
                  <span className="v4-system-row-title">{job.title}</span>
                  <span className="v4-system-row-follow">{job.follow}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </SystemWorkspaceV4>
    </div>
  );
}
