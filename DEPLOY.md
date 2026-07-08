# HōMI — Vercel Production Build

This folder is the complete source of the live deployment.

- Live URL: https://homitechnology.com (alias: homi-platform-homi-tech.vercel.app)
- Vercel project: homi-platform (team: homi-tech, id: prj_LSgxv4XcVDWEQVvvMzmelruM7Xtb)
- Supabase project: giyycykxkzfbowiapxpd (migrations 00001–00010 applied)

## Run locally
npm install
npm run dev        # http://localhost:3000

## Verify
npm run typecheck && npm test && npm run brand-check

## Deploy
npx vercel deploy --prod --yes --token <YOUR_VERCEL_TOKEN>
(env NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are committed in .env.production;
server-only keys — ANTHROPIC_API_KEY, STRIPE_*, RESEND_API_KEY, PLAID_* —
are set in Vercel → Project → Settings → Environment Variables.)
