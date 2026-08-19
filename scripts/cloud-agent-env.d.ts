export const PRODUCTION_SUPABASE_HOST: string;
export const BUILD_SAFE_SUPABASE_URL: string;
export const BUILD_SAFE_ANON_KEY: string;
export const MANAGED_BEGIN: string;
export const MANAGED_END: string;

export type CloudEnvFailure = {
  ok: false;
  code: "INCOMPLETE_DEV_SUPABASE" | "PRODUCTION_DENIED" | "LIVE_INTEGRATION_DENIED";
  error: string;
};

export type CloudEnvSuccess = {
  ok: true;
  mode: "BUILD-SAFE" | "FULL-STACK DEV";
  action: "write" | "leave-human";
  projectRef: string | null;
  log: string;
};

export type CloudEnvResult = CloudEnvFailure | CloudEnvSuccess;

export function reconcileCloudEnv(args: {
  envFile: string;
  env: Record<string, string | undefined>;
}): CloudEnvResult;

export function main(argv?: string[], env?: NodeJS.ProcessEnv): number;
