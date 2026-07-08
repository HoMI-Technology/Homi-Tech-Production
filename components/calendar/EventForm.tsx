"use client";

import { useState } from "react";
import type { CalendarEventKind } from "@/types/database";

const KIND_OPTIONS: { value: CalendarEventKind; label: string }[] = [
  { value: "milestone", label: "Milestone" },
  { value: "deadline", label: "Deadline" },
  { value: "review", label: "Review" },
  { value: "payment", label: "Payment" },
];

export function EventForm({
  defaultDate,
  onSubmit,
  submitting,
}: {
  defaultDate: string;
  onSubmit: (input: {
    title: string;
    kind: CalendarEventKind;
    event_date: string;
    notes: string | null;
  }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CalendarEventKind>("milestone");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    onSubmit({
      title: title.trim(),
      kind,
      event_date: eventDate,
      notes: notes.trim() || null,
    });
    setTitle("");
    setNotes("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-light">Title</label>
        <input
          type="text"
          className="input mt-2"
          placeholder="e.g. Re-take assessment"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-light">Kind</label>
          <select
            className="input mt-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as CalendarEventKind)}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-light">Date</label>
          <input
            type="date"
            className="input mt-2"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm text-light">Notes (optional)</label>
        <textarea
          className="input mt-2"
          rows={2}
          placeholder="Anything to remember about this one?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
        {submitting ? "Adding..." : "Add event"}
      </button>
    </form>
  );
}
