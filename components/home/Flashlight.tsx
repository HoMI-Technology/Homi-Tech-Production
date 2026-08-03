"use client";

import { useEffect, useRef, useState } from "react";

import { COLORS } from "@/lib/brand";

/**
 * The flashlight — a room kept dark on purpose. The cursor is a torch;
 * only what the light touches can be read. The four truths hiding in
 * the dark are the ones the industry never says out loud.
 *
 * Touch devices and reduced-motion get the lights on: full content,
 * no gimmick, same truths.
 */

const TRUTHS = [
  {
    color: COLORS.cyan,
    title: "Nobody in the chain is paid to say wait",
    body: "Agents earn on the sale. Lenders earn on the loan. The moment you hesitate, everyone in the room loses money — except you.",
  },
  {
    color: COLORS.emerald,
    title: "The numbers can say yes while you drown",
    body: "Approval measures whether they get paid back. It has never once measured whether you'll be okay.",
  },
  {
    color: COLORS.yellow,
    title: "Timing failures look like money failures",
    body: "Most regret isn't about the decision. It's about the moment. Rushed timing is the most expensive thing you'll never see on a statement.",
  },
  {
    color: COLORS.crimson,
    title: "Pressure is designed to feel like readiness",
    body: "Deadlines, rising prices, someone else's offer. If the urgency is coming from outside you, it isn't readiness — it's marketing.",
  },
];

export function Flashlight() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [torchOff, setTorchOff] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return; // lights stay on
    setTorchOff(false);

    const zone = zoneRef.current;
    if (!zone) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = zone.getBoundingClientRect();
        zone.style.setProperty("--tx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
        zone.style.setProperty("--ty", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
      });
    };
    zone.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      zone.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={zoneRef}
      className={`torch-zone overflow-hidden rounded-3xl border border-slate-high/30 ${torchOff ? "torch-off" : ""}`}
      style={{ background: "#040b16" }}
    >
      <div className="torch-beamlight" aria-hidden />

      {/* Always-visible invitation */}
      <div className="px-8 pt-10 text-center sm:px-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan">
          The dark room
        </p>
        <h3 className="mt-4 font-display text-3xl font-semibold text-light sm:text-4xl">
          Four truths the industry keeps in the dark.
        </h3>
        <p className="mt-3 text-sm text-dim">
          {torchOff ? "Lights on — read them all." : "Move your light across the room."}
        </p>
      </div>

      {/* Revealed only by the torch */}
      <div className="torch-content grid gap-6 px-8 pb-12 pt-8 sm:grid-cols-2 sm:px-12">
        {TRUTHS.map((t) => (
          <div
            key={t.title}
            className="rounded-2xl border p-6"
            style={{ borderColor: `${t.color}40`, background: `${t.color}08` }}
          >
            <div
              className="h-1 w-8 rounded-full"
              style={{ background: t.color, boxShadow: `0 0 12px ${t.color}` }}
              aria-hidden
            />
            <h4 className="mt-4 text-base font-bold" style={{ color: t.color }}>
              {t.title}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-light/90">{t.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
