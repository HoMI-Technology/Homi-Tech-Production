import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  BUILD_SAFE_SUPABASE_URL,
  MANAGED_BEGIN,
  MANAGED_END,
  PRODUCTION_SUPABASE_HOST,
  reconcileCloudEnv,
} from "../../scripts/cloud-agent-env.mjs";

type CloudEnvInput = Record<string, string | undefined>;

const DEV_URL = "https://abcdefghijklmnop.supabase.co";
const DEV_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiJ9.dev-anon";
const DEV_SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIn0.dev-service";
const PROD_URL = `https://${PRODUCTION_SUPABASE_HOST}`;

function input(partial: CloudEnvInput = {}): CloudEnvInput {
  return { ...partial };
}

function writeAndRead(existing: string | null, env: CloudEnvInput) {
  const dir = mkdtempSync(join(tmpdir(), "homi-cloud-env-"));
  const file = join(dir, ".env.local");
  if (existing !== null) writeFileSync(file, existing, "utf8");
  const result = reconcileCloudEnv({ envFile: file, env: input(env) });
  const content = existsSync(file) ? readFileSync(file, "utf8") : "";
  return { result, content, file };
}

describe("cloud-agent-env — mode resolution", () => {
  it("uses BUILD-SAFE when no DEV Supabase credentials are present", () => {
    const { result, content } = writeAndRead(null, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("BUILD-SAFE");
    expect(content).toContain(`NEXT_PUBLIC_SUPABASE_URL=${BUILD_SAFE_SUPABASE_URL}`);
    expect(content).not.toContain(PRODUCTION_SUPABASE_HOST);
    expect(content).not.toMatch(/^SUPABASE_SERVICE_ROLE_KEY=/m);
  });

  it("uses FULL-STACK DEV when the dedicated Supabase trio is complete", () => {
    const { result, content } = writeAndRead(null, {
      NEXT_PUBLIC_SUPABASE_URL: DEV_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: DEV_ANON,
      SUPABASE_SERVICE_ROLE_KEY: DEV_SERVICE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("FULL-STACK DEV");
    expect(content).toContain(`NEXT_PUBLIC_SUPABASE_URL=${DEV_URL}`);
    expect(content).toContain(`SUPABASE_SERVICE_ROLE_KEY=${DEV_SERVICE}`);
    expect(result.projectRef).toBe("abcdefghijklmnop");
  });

  it("fails closed when only the DEV URL is injected", () => {
    const { result, content } = writeAndRead(null, {
      NEXT_PUBLIC_SUPABASE_URL: DEV_URL,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INCOMPLETE_DEV_SUPABASE");
    expect(content).toBe("");
  });

  it("fails closed when only the service-role key is injected", () => {
    const { result } = writeAndRead(null, {
      SUPABASE_SERVICE_ROLE_KEY: DEV_SERVICE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INCOMPLETE_DEV_SUPABASE");
  });

  it("fails closed when URL + anon are present without service role", () => {
    const { result } = writeAndRead(null, {
      NEXT_PUBLIC_SUPABASE_URL: DEV_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: DEV_ANON,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INCOMPLETE_DEV_SUPABASE");
  });

  it("refuses production Supabase as a Cloud default or injected target", () => {
    const missing = writeAndRead(null, {});
    expect(missing.content).not.toContain(PRODUCTION_SUPABASE_HOST);

    const injected = writeAndRead(null, {
      NEXT_PUBLIC_SUPABASE_URL: PROD_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: DEV_ANON,
      SUPABASE_SERVICE_ROLE_KEY: DEV_SERVICE,
    });
    expect(injected.result.ok).toBe(false);
    if (injected.result.ok) return;
    expect(injected.result.code).toBe("PRODUCTION_DENIED");
  });

  it("refuses a live Stripe secret in Cloud-managed env", () => {
    const { result } = writeAndRead(null, {
      NEXT_PUBLIC_SUPABASE_URL: DEV_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: DEV_ANON,
      SUPABASE_SERVICE_ROLE_KEY: DEV_SERVICE,
      STRIPE_SECRET_KEY: "sk_live_not_a_real_key",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("LIVE_INTEGRATION_DENIED");
  });
});

describe("cloud-agent-env — .env.local safety", () => {
  it("does not overwrite a human-authored .env.local", () => {
    const human = "NEXT_PUBLIC_SITE_URL=http://localhost:3000\nHUMAN_ONLY=keep-me\n";
    const { result, content } = writeAndRead(human, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("leave-human");
    expect(content).toBe(human);
  });

  it("treats an empty .env.local as absent and writes a managed file", () => {
    const { result, content } = writeAndRead("", {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("write");
    expect(content).toContain(MANAGED_BEGIN);
    expect(content).toContain(MANAGED_END);
  });

  it("preserves unmanaged lines outside the managed block", () => {
    const existing = [
      "MANUAL_BEFORE=one",
      MANAGED_BEGIN,
      "NEXT_PUBLIC_SUPABASE_URL=http://old.example",
      MANAGED_END,
      "MANUAL_AFTER=two",
      "",
    ].join("\n");
    const { result, content } = writeAndRead(existing, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(content).toContain("MANUAL_BEFORE=one");
    expect(content).toContain("MANUAL_AFTER=two");
    expect(content).toContain(`NEXT_PUBLIC_SUPABASE_URL=${BUILD_SAFE_SUPABASE_URL}`);
    expect(content).not.toContain("http://old.example");
    expect(content.split(MANAGED_BEGIN).length).toBe(2);
  });

  it("is idempotent across repeated BUILD-SAFE writes", () => {
    const first = writeAndRead(null, {});
    const second = writeAndRead(first.content, {});
    const third = writeAndRead(second.content, {});
    expect(first.content).toBe(second.content);
    expect(second.content).toBe(third.content);
  });

  it("never writes a truthy fake service-role placeholder", () => {
    const { content } = writeAndRead(null, {});
    expect(content).not.toMatch(/placeholder-service-role/i);
    expect(content).not.toMatch(/^SUPABASE_SERVICE_ROLE_KEY=\s*\S+/m);
  });
});

describe("cloud-agent-env — committed Cloud defaults", () => {
  it("does not embed the production Supabase host in Cloud default files", () => {
    const files = [
      readFileSync(new URL("../../.cursor/environment.json", import.meta.url), "utf8"),
      readFileSync(new URL("../../scripts/cloud-agent-env.sh", import.meta.url), "utf8"),
    ];
    for (const body of files) {
      expect(body).not.toContain(PRODUCTION_SUPABASE_HOST);
      expect(body).not.toContain("giyycykxkzfbowiapxpd");
    }
  });
});

describe("cloud-agent-env — logging + denylist", () => {
  it("does not print secret values in the public log line", () => {
    const { result } = writeAndRead(null, {
      NEXT_PUBLIC_SUPABASE_URL: DEV_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: DEV_ANON,
      SUPABASE_SERVICE_ROLE_KEY: DEV_SERVICE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.log).not.toContain(DEV_ANON);
    expect(result.log).not.toContain(DEV_SERVICE);
    expect(result.log).toMatch(/FULL-STACK DEV/i);
    expect(result.log).toContain("abcdefghijklmnop");
  });

  it("CLI fails closed on a partial set and does not print credential values", () => {
    const dir = mkdtempSync(join(tmpdir(), "homi-cloud-cli-"));
    const script = fileURLToPath(new URL("../../scripts/cloud-agent-env.mjs", import.meta.url));
    const inherited = { ...process.env };
    delete inherited.NEXT_PUBLIC_SUPABASE_URL;
    delete inherited.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete inherited.SUPABASE_SERVICE_ROLE_KEY;
    delete inherited.STRIPE_SECRET_KEY;
    const ran = spawnSync(process.execPath, [script], {
      cwd: dir,
      env: { ...inherited, NEXT_PUBLIC_SUPABASE_URL: DEV_URL },
      encoding: "utf8",
    });
    expect(ran.status).toBe(1);
    expect(`${ran.stdout}${ran.stderr}`).toContain("INCOMPLETE_DEV_SUPABASE");
    expect(`${ran.stdout}${ran.stderr}`).not.toContain(DEV_URL);
    expect(existsSync(join(dir, ".env.local"))).toBe(false);
  });
});
