/**
 * Shared (server + client) consent constants and state. No "use client" on
 * purpose: the root layout (a server component) needs the boot script string,
 * and a client module's non-component exports can't cross that boundary.
 *
 * CONSENT IS A GATE, NOT A BANNER DISMISSAL.
 *
 * This module is the single source of truth for whether OPTIONAL analytics may
 * run. Anything that loads an SDK, opens a third-party connection, or forwards
 * an event must ask `readConsent() === "granted"` first. Essential cookies
 * (session/auth) are not covered by this gate and never were — they are
 * strictly necessary and carry no choice.
 *
 * Storage values are intentionally backward compatible: "1" was the historical
 * accepted marker and still reads as granted.
 */

export const CONSENT_KEY = "homi:consent";

export type ConsentState = "granted" | "denied" | "unset";

const GRANTED = "1";
const DENIED = "0";

/** Fires on the window whenever the choice changes, so listeners can react. */
export const CONSENT_EVENT = "homi:consent-change";

/**
 * Reads the stored choice. Returns "unset" when undecided OR when storage is
 * unavailable — failing closed, because "we could not ask" is not consent.
 */
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw === GRANTED) return "granted";
    if (raw === DENIED) return "denied";
    return "unset";
  } catch {
    return "unset";
  }
}

/**
 * Records a choice and notifies listeners. Used by both the banner and any
 * later "change your mind" control — withdrawal is just writing "denied".
 */
export function writeConsent(state: Exclude<ConsentState, "unset">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, state === "granted" ? GRANTED : DENIED);
  } catch {
    // Storage unavailable: the choice cannot persist, but still notify so the
    // current page view honors it.
  }
  // The boot script uses this attribute to hide the bar pre-paint; it means
  // "a decision exists", not "analytics is allowed".
  document.documentElement.setAttribute("data-homi-consent", "1");
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

/** Subscribes to consent changes. Returns an unsubscribe function. */
export function onConsentChange(listener: (state: ConsentState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener(readConsent());
  window.addEventListener(CONSENT_EVENT, handler);
  // `storage` covers the choice being changed in another tab.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Pre-paint consent gate. Runs synchronously at the top of <body>, before the
 * server-rendered consent bar could paint:
 *  · visitor who has already decided → <html data-homi-consent> (CSS hides the
 *    bar, zero flash)
 *  · first-visit homepage → <html data-homi-consent-hold> so the bar never
 *    competes with the landing cinematic; CookieConsent lifts the hold after
 *    the sequence resolves.
 * With storage blocked or JS off, the bar simply shows — content over polish.
 *
 * Note this only controls BANNER VISIBILITY. It deliberately does not enable
 * analytics: that decision is made in client code via readConsent().
 */
export const CONSENT_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var v=localStorage.getItem("${CONSENT_KEY}");if(v==="${GRANTED}"||v==="${DENIED}"){d.setAttribute("data-homi-consent","1");}else if(location.pathname.indexOf("/home")===0&&/[?&]visual=/.test(location.search)){d.setAttribute("data-homi-consent","1");}else if(location.pathname==="/"&&sessionStorage.getItem("homi:hero-seen")!=="1"){d.setAttribute("data-homi-consent-hold","1");}}catch(e){}})();`;
