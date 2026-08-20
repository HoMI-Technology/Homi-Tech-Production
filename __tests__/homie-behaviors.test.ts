/**
 * Homie five-behavior contracts + voice latency + card highlight mapping.
 */

// @vitest-environment jsdom

import { describe, expect, it, afterEach, vi } from "vitest";
import { readEmotionalMirror } from "@/lib/advisor/emotional-mirror";
import {
  buildMemoryPalace,
  memoryReferenceLine,
  recallRelevantMemories,
} from "@/lib/advisor/memory-palace";
import { decideGentleInterrupt } from "@/lib/advisor/gentle-interrupter";
import { projectFutureSelf } from "@/lib/advisor/future-self";
import { decideSilentWitness } from "@/lib/advisor/silent-witness";
import { orchestrateHomieBehaviors } from "@/lib/advisor/behaviors";
import {
  HOMIE_HIGHLIGHT_CLASS,
  cardsForSpeech,
  clearHomieCardHighlights,
  highlightHomieCards,
} from "@/lib/advisor/card-highlight";
import {
  estimateSpeechRateWpm,
  measureVoiceLatency,
  speakText,
} from "@/lib/advisor/voice";
import { HOMIE_VOICE_LATENCY_BUDGET_MS } from "@/types/companion";

describe("Emotional Mirror", () => {
  it("reflects anxious language without clinical claims", () => {
    const reading = readEmotionalMirror("I'm so worried and stressed about debt");
    expect(reading.tone).toBe("anxious");
    expect(reading.reflection.toLowerCase()).not.toMatch(/diagnos|disorder|therapy/);
    expect(reading.confidence).toBeGreaterThan(0.5);
  });

  it("defaults to steady when cues are absent", () => {
    expect(readEmotionalMirror("Tell me about my score.").tone).toBe("steady");
  });
});

describe("Memory Palace", () => {
  it("builds and recalls user moments", () => {
    const palace = buildMemoryPalace([
      { role: "user", content: "My runway is only two months and that scares me." },
      { role: "assistant", content: "Two months of runway is a real constraint." },
      { role: "user", content: "ok" },
    ]);
    expect(palace.length).toBeGreaterThan(0);
    expect(palace[0].role).toBe("user");
    const recalled = recallRelevantMemories(palace, "Can we talk about runway again?");
    expect(recalled.length).toBeGreaterThan(0);
    expect(memoryReferenceLine(recalled)).toMatch(/runway/i);
  });
});

describe("Gentle Interrupter", () => {
  it("stays quiet for short turns", () => {
    expect(
      decideGentleInterrupt({ transcript: "How is my score?", speakingMs: 1000 })
        .shouldInterrupt,
    ).toBe(false);
  });

  it("interrupts long monologues with an insight", () => {
    const long = Array.from({ length: 90 }, () => "worry").join(" ");
    const decision = decideGentleInterrupt({
      transcript: long,
      speakingMs: 30_000,
    });
    expect(decision.shouldInterrupt).toBe(true);
    expect(decision.reason).toBe("long_monologue");
    expect(decision.insight).toBeTruthy();
  });
});

describe("Future Self", () => {
  it("projects from READY without promising outcomes", () => {
    const projection = projectFutureSelf({
      score: 82,
      verdict: "READY",
      pillars: { financial: 80, emotional: 70, timing: 90 },
    });
    expect(projection.weakestPillar).toBe("emotional");
    expect(projection.projection).toMatch(/not a guarantee|mirror/i);
    expect(projection.projection).not.toMatch(/you will definitely|guaranteed/i);
  });

  it("handles missing assessment honestly", () => {
    expect(projectFutureSelf({}).projection).toMatch(/clearer readiness/i);
  });
});

describe("Silent Witness", () => {
  it("honors an explicit request for silence", () => {
    const d = decideSilentWitness({ utterance: "Just sit with me for a minute." });
    expect(d.remainSilent).toBe(true);
    expect(d.reason).toBe("presence");
  });

  it("does not silence ordinary questions", () => {
    const d = decideSilentWitness({
      utterance: "What does my Financial Reality pillar mean?",
      presenceRoll: 0.99,
    });
    expect(d.remainSilent).toBe(false);
  });
});

describe("orchestrateHomieBehaviors", () => {
  it("routes future-self asks to Future Self", () => {
    const turn = orchestrateHomieBehaviors({
      utterance: "Show me my future self in five years",
      futureSelf: { score: 67, verdict: "ALMOST_THERE" },
    });
    expect(turn.primary).toBe("future_self");
    expect(turn.promptHint).toMatch(/Future Self/i);
    expect(turn.cards.length).toBeGreaterThan(0);
  });

  it("routes memory asks to Memory Palace when history exists", () => {
    const turn = orchestrateHomieBehaviors({
      utterance: "Remember what I said about runway last time?",
      thread: [
        {
          role: "user",
          content: "My runway is only two months and that scares me.",
        },
      ],
    });
    expect(turn.primary).toBe("memory_palace");
    expect(turn.memoryRefs?.length).toBeGreaterThan(0);
  });

  it("uses Silent Witness when the user asks for presence only", () => {
    const turn = orchestrateHomieBehaviors({
      utterance: "Please just be with me in silence",
    });
    expect(turn.primary).toBe("silent_witness");
  });
});

describe("card highlight", () => {
  afterEach(() => {
    clearHomieCardHighlights();
    document.getElementById("homie-card-highlight-styles")?.remove();
  });

  it("maps speech topics to cards", () => {
    expect(cardsForSpeech("Your hard stop on credit is protective.")).toEqual(
      expect.arrayContaining(["hard_stop", "verdict"]),
    );
    expect(cardsForSpeech("Look at Perfect Timing.")).toContain("timing");
  });

  it("applies and clears DOM highlights", () => {
    document.body.innerHTML = `<div data-home-score-rail></div>`;
    const clear = highlightHomieCards(["score"]);
    expect(document.querySelector("[data-home-score-rail]")?.classList.contains(HOMIE_HIGHLIGHT_CLASS)).toBe(
      true,
    );
    clear();
    expect(document.querySelector("[data-home-score-rail]")?.classList.contains(HOMIE_HIGHLIGHT_CLASS)).toBe(
      false,
    );
  });
});

describe("voice latency budget", () => {
  it("flags samples over 300ms", () => {
    expect(HOMIE_VOICE_LATENCY_BUDGET_MS).toBe(300);
    const ok = measureVoiceLatency("listen_feedback", 1000, 1200);
    expect(ok.withinBudget).toBe(true);
    const slow = measureVoiceLatency("tts_start", 1000, 1400);
    expect(slow.withinBudget).toBe(false);
    expect(slow.durationMs).toBe(400);
  });
});

describe("speech pace as voice tone", () => {
  it("estimates words per minute over the listen window", () => {
    const forty = Array.from({ length: 40 }, () => "word").join(" ");
    expect(estimateSpeechRateWpm(forty, 12_000)).toBe(200);
  });

  it("refuses samples too small to mean anything", () => {
    expect(estimateSpeechRateWpm("too few words", 10_000)).toBeNull();
    expect(estimateSpeechRateWpm("four words right here", 800)).toBeNull();
    expect(estimateSpeechRateWpm("", 5_000)).toBeNull();
  });

  it("raises anxious confidence when worried words come fast", () => {
    const base = readEmotionalMirror("I'm worried about the debt payment");
    const fast = readEmotionalMirror("I'm worried about the debt payment", 200);
    expect(fast.tone).toBe("anxious");
    expect(fast.confidence).toBeGreaterThan(base.confidence);
  });

  it("reads pure pace as pressing even without anxious words", () => {
    const r = readEmotionalMirror(
      "Let me walk through the numbers and the timeline together",
      195,
    );
    expect(r.tone).toBe("anxious");
    expect(r.signals).toContain("fast_speech");
  });

  it("carries pace through the orchestrator into the emotional read", () => {
    const turn = orchestrateHomieBehaviors({
      utterance: "Let me walk through the numbers and the timeline together",
      speechRateWpm: 200,
    });
    expect(turn.emotional?.signals).toContain("fast_speech");
  });
});

describe("speakText cancellation semantics", () => {
  class MockUtterance {
    text: string;
    lang = "";
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((ev: { error?: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }

  function setupSynthMock() {
    const spoken: MockUtterance[] = [];
    const synth = {
      cancel: vi.fn(),
      speak: vi.fn((u: unknown) => spoken.push(u as MockUtterance)),
      getVoices: vi.fn(() => []),
    };
    vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
    Object.defineProperty(window, "speechSynthesis", {
      value: synth,
      configurable: true,
    });
    return spoken;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "speechSynthesis");
  });

  it("treats browser-initiated interruption as lifecycle, not failure", () => {
    const spoken = setupSynthMock();
    const onError = vi.fn();
    const onEnd = vi.fn();
    speakText("The verdict still holds.", { onError, onEnd });
    expect(spoken).toHaveLength(1);
    spoken[0].onerror?.({ error: "interrupted" });
    spoken[0].onerror?.({ error: "canceled" });
    expect(onError).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it("still reports real synthesis failures", () => {
    const spoken = setupSynthMock();
    const onError = vi.fn();
    const onEnd = vi.fn();
    speakText("The verdict still holds.", { onError, onEnd });
    spoken[0].onerror?.({ error: "synthesis-failed" });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "synthesis_failed" }),
    );
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
