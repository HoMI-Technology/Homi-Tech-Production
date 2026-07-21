import Script from "next/script";
import { sanitizePosthogHost } from "@/lib/analytics/posthog-host";

/**
 * Loads the PostHog snippet ONLY when NEXT_PUBLIC_POSTHOG_KEY is set, so the
 * app ships zero analytics weight until the owner adds the key. Once present,
 * lib/analytics.ts `track()` forwards events to window.posthog automatically.
 *
 * Privacy posture matches the product: no autocapture, no session recording —
 * only the explicit occurrence events track() sends. Respects the cookie-
 * consent posture (essential-only) by disabling persistence to cookies.
 *
 * Sentry is intentionally NOT wired here: its Next SDK needs a package install
 * + instrumentation files, which is the owner's follow-up once SENTRY_DSN
 * exists. The env var name is reserved in .env.example.
 */
export function AnalyticsScripts() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = sanitizePosthogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  if (!key) return null;

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
