// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveStatusBanner } from "./SaveStatusBanner";
import { clearSaveStatus, recordSaveStatus } from "@/lib/assessment/save-status";
import { loadLocalResult, saveLocalResult } from "@/lib/assessment/storage";

const sampleStored = () =>
  ({
    inputs: { debtToIncomeRatio: 0.2 },
    result: { score: 70, verdict: "ALMOST_THERE" },
    completedAt: new Date().toISOString(),
    kind: "full",
    decisionType: "home_buying",
  }) as unknown as Parameters<typeof saveLocalResult>[0];

describe("SaveStatusBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    clearSaveStatus();
    vi.restoreAllMocks();
  });

  it("renders nothing when there is no status, or the save succeeded, or the user is anonymous", () => {
    const { container, rerender } = render(<SaveStatusBanner />);
    expect(container).toBeEmptyDOMElement();

    recordSaveStatus("saved");
    rerender(<SaveStatusBanner />);
    expect(container).toBeEmptyDOMElement();

    recordSaveStatus("unauthenticated");
    rerender(<SaveStatusBanner />);
    expect(container).toBeEmptyDOMElement();

    recordSaveStatus("pending");
    rerender(<SaveStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the upgrade path when the free-tier gate declined the save", async () => {
    recordSaveStatus("locked");
    render(<SaveStatusBanner />);
    expect(await screen.findByText(/saved on this device only/i)).toBeInTheDocument();
    expect(screen.getByText(/one completed assessment per decision/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /see plans/i });
    expect(cta).toHaveAttribute("href", "/pricing");
  });

  it("shows retry on failure and records success when the retry lands", async () => {
    saveLocalResult(sampleStored());
    recordSaveStatus("failed");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "srv-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SaveStatusBanner />);
    const retry = await screen.findByRole("button", { name: /try again/i });
    await userEvent.click(retry);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/assessments",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.kind).toBe("full");
    expect(body.inputs).toBeTruthy();
    expect(body.decisionType).toBe("home_buying");
    // Banner clears itself once the retry saves, and the server id is attached.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    });
    expect(loadLocalResult()?.serverId).toBe("srv-1");
  });

  it("updates live when the background save settles after mount", async () => {
    render(<SaveStatusBanner />);
    expect(screen.queryByText(/couldn't save/i)).not.toBeInTheDocument();
    recordSaveStatus("failed");
    expect(await screen.findByText(/couldn't save/i)).toBeInTheDocument();
  });

  it("omits decisionType when the stored result predates the field (legacy local payload)", async () => {
    saveLocalResult({
      inputs: { debtToIncomeRatio: 0.2 },
      result: { score: 70, verdict: "ALMOST_THERE" },
      completedAt: new Date().toISOString(),
      kind: "full",
    } as unknown as Parameters<typeof saveLocalResult>[0]);
    recordSaveStatus("failed");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "srv-legacy" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SaveStatusBanner />);
    await userEvent.click(await screen.findByRole("button", { name: /try again/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.kind).toBe("full");
    expect(body).not.toHaveProperty("decisionType");
  });

});
