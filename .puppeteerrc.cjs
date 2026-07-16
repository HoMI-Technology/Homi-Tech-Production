/**
 * puppeteer is a devDependency only for the Lighthouse CI login script
 * (scripts/lhci-login.cjs). Never download its ~130MB Chrome on install —
 * every environment that runs the script provides a browser:
 *   · GitHub Actions: PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
 *     (set in .github/workflows/lighthouse.yml)
 *   · Local: point PUPPETEER_EXECUTABLE_PATH at any Chrome/Chromium.
 * Vercel builds install devDependencies too — without this, every deploy
 * would pay the download.
 */
module.exports = {
  skipDownload: true,
};
