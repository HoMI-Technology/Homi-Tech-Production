"use client";

/**
 * useHomieVoice — microphone listen + TTS speak with avatar state + latency
 * samples. Keeps Web Speech details out of CompanionWidget.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelSpeech,
  detectHomieVoiceCapabilities,
  playGentleChime,
  speakText,
  startListening,
  type ListenHandle,
} from "@/lib/advisor/voice";
import type {
  HomieAvatarState,
  HomieVoiceCapabilities,
  HomieVoiceError,
  VoiceLatencySample,
} from "@/types/companion";

export function useHomieVoice(options?: {
  onLatency?: (sample: VoiceLatencySample) => void;
  onError?: (error: HomieVoiceError) => void;
  /** When true, speak assistant replies aloud. */
  ttsEnabled?: boolean;
}) {
  const [caps, setCaps] = useState<HomieVoiceCapabilities>({
    recognition: false,
    synthesis: false,
  });
  const [avatarState, setAvatarState] = useState<HomieAvatarState>("breathing");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const handleRef = useRef<ListenHandle | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  // Utterance generation: cancelling an utterance still fires its async
  // end/error events later — bumping this makes those events stale so they
  // can never stomp a newer state (e.g. flip "listening" back to "breathing").
  const speakSeqRef = useRef(0);
  const onLatencyRef = useRef(options?.onLatency);
  const onErrorRef = useRef(options?.onError);
  const ttsEnabledRef = useRef(options?.ttsEnabled ?? true);
  onLatencyRef.current = options?.onLatency;
  onErrorRef.current = options?.onError;
  ttsEnabledRef.current = options?.ttsEnabled ?? true;

  useEffect(() => {
    setCaps(detectHomieVoiceCapabilities());
    return () => {
      handleRef.current?.abort();
      cancelSpeech();
    };
  }, []);

  const stopListening = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
    setInterim("");
    setAvatarState("breathing");
  }, []);

  const listen = useCallback(async (): Promise<string> => {
    if (!detectHomieVoiceCapabilities().recognition) {
      const err: HomieVoiceError = {
        code: "unsupported",
        message: "Voice input isn't available in this browser.",
      };
      onErrorRef.current?.(err);
      return "";
    }

    cancelSpeakRef.current?.();
    cancelSpeech();
    speakSeqRef.current += 1;
    setListening(true);
    setAvatarState("listening");
    setInterim("");

    const handle = startListening({
      onInterim: setInterim,
      onStart: (sample) => onLatencyRef.current?.(sample),
      onError: (error) => {
        onErrorRef.current?.(error);
        setListening(false);
        setAvatarState("breathing");
      },
    });
    handleRef.current = handle;
    const text = await handle.done;
    handleRef.current = null;
    setListening(false);
    setInterim("");
    setAvatarState("breathing");
    return text;
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!ttsEnabledRef.current || !text.trim()) return () => undefined;
    if (!detectHomieVoiceCapabilities().synthesis) return () => undefined;

    const seq = ++speakSeqRef.current;
    setAvatarState("speaking");
    // The speech window closes exactly once — on natural end or on a real
    // synthesis failure — and never for a superseded (cancelled) utterance.
    let finished = false;
    const finish = () => {
      if (finished || speakSeqRef.current !== seq) return;
      finished = true;
      setAvatarState("breathing");
      onDone?.();
    };
    const cancel = speakText(text, {
      rate: 1,
      onStart: (sample) => {
        if (speakSeqRef.current === seq) onLatencyRef.current?.(sample);
      },
      onEnd: finish,
      onError: (error) => {
        if (speakSeqRef.current !== seq) return;
        onErrorRef.current?.(error);
      },
    });
    cancelSpeakRef.current = cancel;
    return () => {
      cancel();
      if (speakSeqRef.current === seq) {
        speakSeqRef.current += 1;
        setAvatarState("breathing");
      }
      cancelSpeakRef.current = null;
    };
  }, []);

  const chimeAndPause = useCallback(() => {
    playGentleChime();
    setAvatarState("interrupted");
  }, []);

  const setSilentPresence = useCallback(() => {
    setAvatarState("silent");
  }, []);

  const resetPresence = useCallback(() => {
    setAvatarState("breathing");
  }, []);

  return {
    caps,
    avatarState,
    setAvatarState,
    interim,
    listening,
    listen,
    stopListening,
    speak,
    chimeAndPause,
    setSilentPresence,
    resetPresence,
  };
}
