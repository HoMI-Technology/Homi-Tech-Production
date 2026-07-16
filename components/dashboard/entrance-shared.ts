/**
 * Shared (server + client) constants for the dashboard entrance. No "use
 * client" directive on purpose: the server page needs the boot script string,
 * and a client module's non-component exports can't cross that boundary.
 */

export const ENTRANCE_KEY = "homi:dash-entrance";

/**
 * Inline pre-paint script for the dashboard container. Runs synchronously
 * during HTML parse — before hydration, before first paint — and stamps the
 * container "play" (first visit this session) or "instant" (repeat visit /
 * reduced motion / storage blocked). React never renders the attribute, so
 * hydration doesn't fight the mutation. With no JS at all the attribute is
 * never set and every stage stays visible.
 */
export const ENTRANCE_BOOT_SCRIPT = `(function(){var e=document.getElementById("dash-root");if(!e)return;var played=true;try{played=sessionStorage.getItem("${ENTRANCE_KEY}")==="1"}catch(err){}var reduced=false;try{reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(err){}e.dataset.entrance=(played||reduced)?"instant":"play";})();`;
