"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PHASE0_EVENT,
  isPhase0FreezeActive,
  loadPhase0Freeze,
  personKeyForUserId,
  rememberPhase0Person,
  selectPhase0Surface,
  type Phase0FreezeRecord,
  type Phase0Surface,
} from "@/lib/advisor/phase0";

export interface Phase0FreezeState {
  status: Phase0Surface;
  personKey: string | null;
  record: Phase0FreezeRecord | null;
}

const PENDING: Phase0FreezeState = {
  status: "pending",
  personKey: null,
  record: null,
};

export async function resolvePhase0PersonKey(): Promise<string> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const key = personKeyForUserId(data?.user?.id);
    rememberPhase0Person(key);
    return key;
  } catch {
    const key = personKeyForUserId(null);
    rememberPhase0Person(key);
    return key;
  }
}

export function usePhase0Freeze(): Phase0FreezeState {
  const [state, setState] = useState<Phase0FreezeState>(PENDING);

  useEffect(() => {
    let active = true;

    function apply(personKey: string | null, resolved: boolean) {
      const record = loadPhase0Freeze();
      const live = isPhase0FreezeActive(record) ? record : null;
      setState({
        status: selectPhase0Surface(personKey, resolved),
        personKey,
        record: live && (!personKey || live.personKey === personKey) ? live : null,
      });
    }

    apply(null, false);

    async function resolve() {
      let personKey = personKeyForUserId(null);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        personKey = personKeyForUserId(data?.user?.id);
      } catch {
        personKey = personKeyForUserId(null);
      }
      if (!active) return;
      rememberPhase0Person(personKey);
      apply(personKey, true);
    }

    function onChange() {
      void resolve();
    }

    void resolve();
    window.addEventListener(PHASE0_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      active = false;
      window.removeEventListener(PHASE0_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return state;
}
