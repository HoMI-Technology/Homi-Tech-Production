import { existsSync } from "node:fs";

/**
 * Resolve a Playwright browser launch config that works on locked-down Windows
 * (Application Control / SAC blocks Playwright's bundled chrome-headless-shell).
 *
 * Priority:
 * 1. PLAYWRIGHT_CHANNEL=chrome|msedge|…
 * 2. PLAYWRIGHT_CHROME_PATH / CHROME_PATH
 * 3. Local Windows (non-CI): system Chrome, then Edge
 * 4. CI / default: Playwright bundled Chromium
 */

export type BrowserLaunchUse = {
  channel?: string;
  launchOptions?: { executablePath?: string; args?: string[] };
};

function systemBrowserPaths(): string[] {
  if (process.platform !== "win32") return [];
  const pf = process.env.ProgramFiles ?? "C:\\Program Files";
  const pf86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const local = process.env.LOCALAPPDATA ?? "";
  return [
    `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
    `${local}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${local}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];
}

function firstExisting(paths: string[]): string | undefined {
  return paths.find((p) => Boolean(p) && existsSync(p));
}

export function resolveBrowserUse(): BrowserLaunchUse {
  if (process.env.PLAYWRIGHT_USE_BUNDLED === "1") return {};

  const channel = process.env.PLAYWRIGHT_CHANNEL?.trim();
  if (channel) return { channel };

  const exe =
    process.env.PLAYWRIGHT_CHROME_PATH?.trim() ||
    process.env.CHROME_PATH?.trim() ||
    (!process.env.CI && process.platform === "win32"
      ? firstExisting(systemBrowserPaths())
      : undefined);

  if (!exe) return {};

  if (/[\\/]Google[\\/]Chrome[\\/]/i.test(exe) || /chrome\.exe$/i.test(exe)) {
    return { channel: "chrome", launchOptions: { args: ["--disable-dev-shm-usage"] } };
  }
  if (/[\\/]msedge\.exe$/i.test(exe) || /[\\/]Microsoft[\\/]Edge[\\/]/i.test(exe)) {
    return { channel: "msedge", launchOptions: { args: ["--disable-dev-shm-usage"] } };
  }
  return {
    launchOptions: { executablePath: exe, args: ["--disable-dev-shm-usage"] },
  };
}
