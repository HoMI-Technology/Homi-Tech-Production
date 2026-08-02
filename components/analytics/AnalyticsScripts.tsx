"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { sanitizePosthogHost } from "@/lib/analytics/posthog-host";
import { readConsent, onConsentChange } from "@/components/consent/consent-shared";

/**
 * Loads the PostHog snippet only when BOTH are true:
 *   1. NEXT_PUBLIC_POSTHOG_KEY is set (the app ships zero analytics weight
 *      until the owner adds the key), and
 *   2. the visitor has granted consent for optional analytics.
 *
 * Condition 2 is the one that was missing. This component previously rendered
 * the snippet on key presence alone, so the moment the key was configured the
 * SDK initialized and fetched `us-assets.i.posthog.com/static/array.js` BEFORE
 * the visitor had answered the banner — confirmed with a network trace.
 * Memory-only persistence limited the damage (no cookie, no persistent device
 * id), but an SDK load plus a third-party request is exactly what "no
 * analytics before opt-in" forbids.
 *
 * The decision is resolved in an effect rather than read during render, so the
 * server and first client paint agree (no hydration mismatch) and nothing
 * loads until the choice is known. Unset reads as "not allowed": silence is
 * not consent.
 *
 * Privacy posture once allowed: no autocapture, no session recording, no
 * automatic pageviews — only the explicit occurrence events track() sends.
 *
 * Sentry is intentionally NOT wired here: its Next SDK needs a package install
 * + instrumentation files, which is the owner's follow-up once SENTRY_DSN
 * exists. The env var name is reserved in .env.example.
 */
export function AnalyticsScripts() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = sanitizePosthogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(readConsent() === "granted");
    // Reacts to Accept, Reject, and later withdrawal — including from another tab.
    return onConsentChange((state) => setAllowed(state === "granted"));
  }, []);

  if (!key || !allowed) return null;

  return (
    <Script id="posthog-init" strategy="afterInteractive">
      {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(
        key,
      )},{api_host:${JSON.stringify(
        host,
      )},persistence:"memory",autocapture:false,disable_session_recording:true,capture_pageview:false});`}
    </Script>
  );
}
