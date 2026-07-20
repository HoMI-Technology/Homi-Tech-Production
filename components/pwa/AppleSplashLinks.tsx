/**
 * iOS "Add to Home Screen" launch images (apple-touch-startup-image).
 * ===================================================================
 *
 * iOS shows a custom splash only when a media query matches the device
 * exactly (device-width/height + -webkit-device-pixel-ratio + orientation).
 * Unmatched devices fall back to the manifest background_color splash, which
 * modern iOS renders fine — so this is a progressive enhancement, portrait,
 * covering the modern iPhone lineup. Assets are generated into /public/splash
 * (see scripts note in the PR); add a device by adding a row here + a PNG.
 *
 * Next hoists these <link> elements into <head>. Metadata API has no
 * apple-touch-startup-image support with media queries, so they're raw links.
 */

const SPLASH: { media: string; href: string }[] = [
  { device: "iphone-se", w: 375, h: 667, dpr: 2 },
  { device: "iphone-xr-11", w: 414, h: 896, dpr: 2 },
  { device: "iphone-x-xs-11pro", w: 375, h: 812, dpr: 3 },
  { device: "iphone-xsmax-11promax", w: 414, h: 896, dpr: 3 },
  { device: "iphone-12-13-14", w: 390, h: 844, dpr: 3 },
  { device: "iphone-14pro-15", w: 393, h: 852, dpr: 3 },
  { device: "iphone-promax-plus", w: 428, h: 926, dpr: 3 },
  { device: "iphone-15promax-16", w: 430, h: 932, dpr: 3 },
].map(({ device, w, h, dpr }) => ({
  href: `/splash/${device}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));

export function AppleSplashLinks() {
  return (
    <>
      {SPLASH.map((s) => (
        <link key={s.href} rel="apple-touch-startup-image" media={s.media} href={s.href} />
      ))}
    </>
  );
}
