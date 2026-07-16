/**
 * Shared (server + client) consent constants. No "use client" on purpose:
 * the root layout (a server component) needs the boot script string, and a
 * client module's non-component exports can't cross that boundary.
 */

export const CONSENT_KEY = "homi:consent";

/**
 * Pre-paint consent gate. Runs synchronously at the top of <body>, before the
 * server-rendered consent bar could paint:
 *  · already-consented visitor → <html data-homi-consent> (CSS hides the bar,
 *    zero flash)
 *  · first-visit homepage → <html data-homi-consent-hold> so the bar never
 *    competes with the landing cinematic; CookieConsent lifts the hold after
 *    the sequence resolves.
 * With storage blocked or JS off, the bar simply shows — content over polish.
 */
export const CONSENT_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;if(localStorage.getItem("${CONSENT_KEY}")==="1"){d.setAttribute("data-homi-consent","1");}else if(location.pathname==="/"&&sessionStorage.getItem("homi:hero-seen")!=="1"){d.setAttribute("data-homi-consent-hold","1");}}catch(e){}})();`;
