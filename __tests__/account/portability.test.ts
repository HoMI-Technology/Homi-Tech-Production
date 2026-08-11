import { describe, expect, it } from "vitest";
import { parseImport, PORTABLE_FORMAT_VERSION } from "@/lib/account/portability";
import { BUDGET_LEDGER_STORAGE_KEY } from "@/lib/finance/local-ledger";
import { PLANNER_STORAGE_KEY } from "@/lib/planner/store";

function exportFile(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    formatVersion: PORTABLE_FORMAT_VERSION,
    exportedAt: "2026-08-11T00:00:00.000Z",
    server: { profile: {} },
    localMoney: { [BUDGET_LEDGER_STORAGE_KEY]: '{"schemaVersion":2,"goals":[]}' },
    ...over,
  });
}

describe("parseImport", () => {
  it("accepts a well-formed export", () => {
    const r = parseImport(exportFile());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.localMoney[BUDGET_LEDGER_STORAGE_KEY]).toContain("schemaVersion");
    }
  });

  it("rejects invalid JSON with a readable reason", () => {
    const r = parseImport("{ not json");
    expect(r).toEqual({ ok: false, error: "That file isn't valid JSON." });
  });

  it("rejects JSON that isn't an object", () => {
    expect(parseImport("[1,2,3]").ok).toBe(false);
    expect(parseImport('"a string"').ok).toBe(false);
    expect(parseImport("null").ok).toBe(false);
  });

  it("rejects a file with no format version — it isn't ours", () => {
    const r = parseImport(JSON.stringify({ localMoney: {} }));
    expect(r).toEqual({ ok: false, error: "That file isn't a HōMI export." });
  });

  /** Forward-compat: a newer export may contain keys this build would drop. */
  it("refuses an export from a newer format rather than silently dropping data", () => {
    const r = parseImport(exportFile({ formatVersion: PORTABLE_FORMAT_VERSION + 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("newer version");
  });

  it("accepts an older format version", () => {
    expect(parseImport(exportFile({ formatVersion: 0 })).ok).toBe(true);
  });

  /**
   * An export is user-supplied input. It must not be able to write storage keys
   * outside the ones we own.
   */
  it("ignores unknown storage keys", () => {
    const r = parseImport(
      exportFile({
        localMoney: {
          [BUDGET_LEDGER_STORAGE_KEY]: "{}",
          "homi:auth-token": "stolen",
          "some-other-app": "junk",
        },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.data.localMoney)).toEqual([BUDGET_LEDGER_STORAGE_KEY]);
    }
  });

  it("ignores non-string values for known keys", () => {
    const r = parseImport(
      exportFile({
        localMoney: { [BUDGET_LEDGER_STORAGE_KEY]: { not: "a string" } },
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("carries the planner workspace when present", () => {
    const r = parseImport(
      exportFile({
        localMoney: {
          [BUDGET_LEDGER_STORAGE_KEY]: "{}",
          [PLANNER_STORAGE_KEY]: '{"state":{}}',
        },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.data.localMoney)).toHaveLength(2);
  });

  it("rejects an export with nothing restorable rather than reporting success", () => {
    const r = parseImport(exportFile({ localMoney: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("doesn't contain any money data");
  });

  it("tolerates a missing exportedAt without failing the import", () => {
    const r = parseImport(exportFile({ exportedAt: undefined }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.exportedAt).toBe("");
  });
});
