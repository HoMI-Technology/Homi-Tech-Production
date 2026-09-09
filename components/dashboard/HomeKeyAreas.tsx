import Link from "next/link";
import { KEY_AREA_STATUS, type KeyArea, type KeyAreaStatus } from "@/lib/dashboard/key-areas";
import {
  HOME_KEY_AREAS_HEADING,
  HOME_SEE_FULL_BREAKDOWN,
} from "@/lib/dashboard/fold-truth";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";

const DENSITY_FOOTER_LINK =
  "text-sm text-dim underline underline-offset-2 hover:text-cyan";

function keyAreaStatusAttr(status: KeyAreaStatus): "needs-work" | "strong" | "not-assessed" {
  switch (status) {
    case KEY_AREA_STATUS.needsWork:
      return "needs-work";
    case KEY_AREA_STATUS.strong:
      return "strong";
    case KEY_AREA_STATUS.notAssessed:
      return "not-assessed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function keyAreaDotClass(status: KeyAreaStatus): string {
  switch (status) {
    case KEY_AREA_STATUS.needsWork:
      return "bg-amber";
    case KEY_AREA_STATUS.strong:
      return "bg-emerald";
    case KEY_AREA_STATUS.notAssessed:
      return "bg-dim";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function keyAreaLabelClass(status: KeyAreaStatus): string {
  switch (status) {
    case KEY_AREA_STATUS.needsWork:
      return "text-amber";
    case KEY_AREA_STATUS.strong:
      return "text-emerald";
    case KEY_AREA_STATUS.notAssessed:
      return "text-dim";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function HomeKeyAreas({ areas }: { areas: readonly KeyArea[] }) {
  return (
    <section className="mt-3" data-home-key-areas="" aria-label={HOME_KEY_AREAS_HEADING}>
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
        {HOME_KEY_AREAS_HEADING}
      </p>
      <ul className="home-key-areas mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {areas.map((area) => {
          const statusAttr = keyAreaStatusAttr(area.status);
          return (
            <li
              key={area.id}
              data-home-key-area={area.id}
              data-home-key-area-status={statusAttr}
              className="rounded-xl border border-white/[0.04] bg-navy-light/50 p-4"
            >
              <p className="flex items-center gap-2 text-sm font-medium text-light">
                <span aria-hidden className={`size-1.5 rounded-full ${keyAreaDotClass(area.status)}`} />
                {area.title}
              </p>
              <p
                className={`mt-1 text-xs ${keyAreaLabelClass(area.status)}`}
                data-home-key-area-label=""
              >
                {area.status}
              </p>
              <p className="mt-1 text-xs text-dim">{area.note}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3">
        <Link
          href={SIGNED_IN_ASSESS_HREF}
          className={DENSITY_FOOTER_LINK}
          data-home-key-areas-breakdown=""
        >
          {HOME_SEE_FULL_BREAKDOWN} →
        </Link>
      </p>
    </section>
  );
}
