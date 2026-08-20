/**
 * Homie voice I/O — Web Speech API wrappers with a hard 300ms local-feedback
 * latency budget. Recognition / synthesis start must paint UI feedback inside
 * that window; the advisor round-trip itself is out of scope for the budget.
 */

import {
  HOMIE_VOICE_LATENCY_BUDGET_MS,
  type HomieVoiceCapabilities,
  type HomieVoiceError,
  type HomieVoiceErrorCode,
  type VoiceLatencySample,
} from "@/types/companion";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function detectHomieVoiceCapabilities(): HomieVoiceCapabilities {
  if (typeof window === "undefined") {
    return { recognition: false, synthesis: false };
  }
  return {
    recognition: getRecognitionCtor() !== null,
    synthesis: typeof window.speechSynthesis !== "undefined",
  };
}

export function measureVoiceLatency(
  phase: VoiceLatencySample["phase"],
  startedAt: number,
  endedAt: number = Date.now(),
): VoiceLatencySample {
  const durationMs = Math.max(0, endedAt - startedAt);
  return {
    phase,
    startedAt,
    endedAt,
    durationMs,
    withinBudget: durationMs <= HOMIE_VOICE_LATENCY_BUDGET_MS,
  };
}

function mapRecognitionError(code: string): HomieVoiceError {
  const table: Record<string, HomieVoiceErrorCode> = {
    "not-allowed": "permission_denied",
    "service-not-allowed": "permission_denied",
    "no-speech": "no_speech",
    aborted: "aborted",
    network: "network",
  };
  const mapped = table[code] ?? "unknown";
  const messages: Record<HomieVoiceErrorCode, string> = {
    unsupported: "Voice input isn't available in this browser.",
    permission_denied: "Microphone access was blocked. You can still type.",
    no_speech: "I didn't catch that — try again when you're ready.",
    aborted: "Listening stopped.",
    network: "Speech recognition lost its connection. Try typing instead.",
    synthesis_failed: "I couldn't speak that aloud. The words are still in chat.",
    unknown: "Something interrupted voice. You can keep typing.",
  };
  return { code: mapped, message: messages[mapped] };
}

export interface ListenOptions {
  lang?: string;
  continuous?: boolean;
  onInterim?: (text: string) => void;
  onStart?: (sample: VoiceLatencySample) => void;
  onError?: (error: HomieVoiceError) => void;
}

export interface ListenHandle {
  stop: () => void;
  abort: () => void;
  /** Resolves with the final transcript (may be empty). */
  done: Promise<string>;
}

/**
 * Starts browser speech recognition. Resolves when recognition ends.
 * Callers must flip UI to "listening" before or immediately on onStart —
 * that paint is what the 300ms budget covers.
 */
export function startListening(options: ListenOptions = {}): ListenHandle {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    const error = mapRecognitionError("unsupported");
    error.code = "unsupported";
    options.onError?.(error);
    return {
      stop: () => undefined,
      abort: () => undefined,
      done: Promise.resolve(""),
    };
  }

  const startedAt = Date.now();
  const recognition = new Ctor();
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = true;
  recognition.lang = options.lang ?? "en-US";

  let settled = false;
  let finalText = "";

  const done = new Promise<string>((resolve) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(finalText.trim());
    };

    recognition.onstart = () => {
      options.onStart?.(measureVoiceLatency("listen_feedback", startedAt));
    };

    recognition.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0]?.transcript ?? "";
        if (ev.results[i].isFinal) {
          finalText += `${piece} `;
        } else {
          interim += piece;
        }
      }
      const live = (finalText + interim).trim();
      if (live) options.onInterim?.(live);
    };

    recognition.onerror = (ev) => {
      if (ev.error === "aborted") {
        finish();
        return;
      }
      options.onError?.(mapRecognitionError(ev.error));
      finish();
    };

    recognition.onend = () => finish();

    try {
      recognition.start();
    } catch {
      options.onError?.({
        code: "unknown",
        message: "Couldn't start the microphone. You can still type.",
      });
      finish();
    }
  });

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // already aborted
      }
    },
    done,
  };
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  /** Prefer a calm local voice when available. */
  voiceHint?: "female" | "male" | "any";
  onStart?: (sample: VoiceLatencySample) => void;
  onEnd?: () => void;
  onError?: (error: HomieVoiceError) => void;
}

/**
 * Speaks text via speechSynthesis. Cancels any in-flight utterance first.
 * Returns a cancel function. Empty / whitespace text is a no-op.
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options.onError?.({
      code: "unsupported",
      message: "Voice output isn't available in this browser.",
    });
    return () => undefined;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    options.onEnd?.();
    return () => undefined;
  }

  window.speechSynthesis.cancel();

  const startedAt = Date.now();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = options.lang ?? "en-US";
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0 && options.voiceHint && options.voiceHint !== "any") {
    const needle = options.voiceHint === "female" ? /female|samantha|victoria|karen/i : /male|daniel|alex|fred/i;
    const match = voices.find((v) => needle.test(v.name) && v.lang.startsWith("en"));
    if (match) utterance.voice = match;
  }

  utterance.onstart = () => {
    options.onStart?.(measureVoiceLatency("tts_start", startedAt));
  };
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (ev) => {
    // "interrupted" / "canceled" are the browser's normal response to
    // speechSynthesis.cancel() — a newer reply, listen start, or panel close.
    // Lifecycle, not failure: never surface an error for them.
    if (ev?.error === "interrupted" || ev?.error === "canceled") {
      options.onEnd?.();
      return;
    }
    options.onError?.({
      code: "synthesis_failed",
      message: "I couldn't speak that aloud. The words are still in chat.",
    });
    options.onEnd?.();
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    options.onError?.({
      code: "synthesis_failed",
      message: "I couldn't speak that aloud. The words are still in chat.",
    });
    options.onEnd?.();
  }

  return () => {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  };
}

/**
 * Estimate speaking pace in words per minute over a recognition window.
 * The Emotional Mirror uses pace as a voice-tone signal (fast → pressing,
 * very slow → uncertain). Returns null when the sample is too small to be
 * meaningful — a two-word blurt must never read as "fast speech".
 */
export function estimateSpeechRateWpm(
  transcript: string,
  elapsedMs: number,
): number | null {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (words < 4 || elapsedMs < 1500) return null;
  return Math.round((words / elapsedMs) * 60_000);
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

/**
 * Soft chime for the Gentle Interrupter — Web Audio oscillator, no asset.
 * Falls back silently when AudioContext is unavailable.
 */
export function playGentleChime(): void {
  if (typeof window === "undefined") return;
  type AudioCtxCtor = typeof AudioContext;
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
  if (!AC) return;

  try {
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.18); // E5
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => {
      void ctx.close().catch(() => undefined);
    };
  } catch {
    // Chime is enhancement only.
  }
}
