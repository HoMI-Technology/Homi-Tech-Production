"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_V4_REFRESH_CTA } from "@/lib/v4/admin-workspace";

export function AdminRoomEmptyV4({
  title,
  body,
  actionLabel = ADMIN_V4_REFRESH_CTA,
  actionHref,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const router = useRouter();

  return (
    <div data-admin-v4-empty="">
      <h1 className="v4-system-title">{title}</h1>
      <p className="v4-system-meta mt-2">{body}</p>
      <div className="mt-6">
        {actionHref ? (
          <Link href={actionHref} className="btn btn-primary">
            {actionLabel}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => router.refresh()}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
