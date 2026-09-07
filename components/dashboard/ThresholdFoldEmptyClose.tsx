"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDraft } from "@/lib/assessment/draft";
import { resumeDraftCopy } from "@/lib/dashboard/fold-truth";
import {
  PRIMARY_CLOSE_LABEL,
  SIGNED_IN_ASSESS_HREF,
} from "@/components/marketing/first-moment-copy";

/**
 * Empty fold close — Assess, or resume a started 45-q draft.
 * No compass here — SHELL_CRAFT v3 keeps the mark in the quiet top bar.
 */
export function ThresholdFoldEmptyClose() {
  const [copy, setCopy] = useState<ReturnType<typeof resumeDraftCopy>>(null);

  useEffect(() => {
    setCopy(resumeDraftCopy(loadDraft()));
  }, []);

  const href = copy?.href ?? SIGNED_IN_ASSESS_HREF;
  const label = copy?.label ?? PRIMARY_CLOSE_LABEL;

  return (
    <Link href={href} className="btn btn-primary" data-home-fold-empty-close="">
      {label}
    </Link>
  );
}
