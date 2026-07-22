"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadLocalResult } from "@/lib/assessment/storage";
import { deriveNotifications, type NotificationItem } from "@/lib/notifications/rules";

/** localStorage key: ISO-free numeric timestamp (ms) of the last "mark all read" action. */
const READ_KEY = "homi:notif-read";

function loadReadAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveReadAt(ts: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, String(ts));
  } catch {
    // Storage full, disabled, or private mode — fail silently. Not fatal.
  }
}

/**
 * Bell icon + dropdown panel. Renders for signed-in users and for anonymous
 * "local-result visitors" (loadLocalResult() present, no account). Does its
 * own light data-fetching (auth, due outcome_surveys, last daily_checkins)
 * and feeds it into the pure lib/notifications/rules deriveNotifications().
 */
export function NotificationBell() {
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readAt, setReadAt] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const storedAssessment = loadLocalResult();
      let dueSurvey = false;
      let lastCheckinDate: string | null = null;
      let signedIn = false;

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        signedIn = Boolean(data?.user);

        if (data?.user) {
          const [{ data: surveys }, { data: checkins }] = await Promise.all([
            supabase
              .from("outcome_surveys")
              .select("id")
              .eq("user_id", data.user.id)
              .is("completed_at", null)
              .lt("due_at", new Date().toISOString())
              .limit(1),
            supabase
              .from("daily_checkins")
              .select("created_at")
              .eq("user_id", data.user.id)
              .order("created_at", { ascending: false })
              .limit(1),
          ]);
          dueSurvey = Boolean(surveys && surveys.length > 0);
          lastCheckinDate = checkins && checkins.length > 0 ? (checkins[0] as { created_at: string }).created_at : null;
        }
      } catch {
        // Not fatal — the bell still shows what it can derive locally.
      }

      if (!active) return;
      setVisible(signedIn || Boolean(storedAssessment));
      setItems(deriveNotifications({ storedAssessment, dueSurvey, lastCheckinDate }));
      setReadAt(loadReadAt());
      setHydrated(true);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Escape closes the panel and returns focus to the bell. Click-outside also closes it.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  if (!hydrated || !visible) return null;

  const unread = items.filter((item) => new Date(item.createdAt).getTime() > readAt).length;

  function markAllRead() {
    const now = Date.now();
    saveReadAt(now);
    setReadAt(now);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="homi-notification-panel"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="btn btn-ghost relative !p-2"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.4 1.5 5H3.5C4 12.4 5 11.2 5 8Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.2 15.5a1.8 1.8 0 0 0 3.6 0" strokeLinecap="round" />
        </svg>
        {unread > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan" />}
      </button>

      {open && (
        <div
          id="homi-notification-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="glass absolute right-0 top-full z-50 mt-2 w-[320px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl p-2 shadow-2xl"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-dim">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-cyan transition-colors hover:text-light"
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-dim">Nothing new right now.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-surface"
                  >
                    <p className="text-sm font-medium text-light">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-dim">{item.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
