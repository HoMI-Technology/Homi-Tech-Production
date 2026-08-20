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

  const speak = useCallback((text: string) => {
    if (!ttsEnabledRef.current || !text.trim()) return () => undefined;
    if (!detectHomieVoiceCapabilities().synthesis) return () => undefined;

    setAvatarState("speaking");
    const cancel = speakText(text, {
      rate: 1,
      onStart: (sample) => onLatencyRef.current?.(sample),
      onEnd: () => setAvatarState("breathing"),
      onError: (error) => {
        onErrorRef.current?.(error);
        setAvatarState("breathing");
      },
    });
    cancelSpeakRef.current = cancel;
    return () => {
      cancel();
      cancelSpeakRef.current = null;
      setAvatarState("breathing");
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
