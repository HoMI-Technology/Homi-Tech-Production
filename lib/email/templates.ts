/**
 * HōMI transactional email templates.
 * Pure functions, no side effects — return { subject, html } and let the
 * caller (app/api/email/route.ts) handle delivery. Inline-styled HTML,
 * since email clients don't reliably support external or embedded CSS.
 */

import { LEGAL_DISCLAIMER, BRAND, type VerdictKey } from "@/lib/brand";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://homitechnology.com";

const VERDICT_COLOR: Record<VerdictKey, string> = {
  READY: "#34d399",
  ALMOST_THERE: "#facc15",
  BUILD_FIRST: "#fab633",
  NOT_YET: "#f24822",
};

const VERDICT_LABEL: Record<VerdictKey, string> = {
  READY: "READY",
  ALMOST_THERE: "ALMOST THERE",
  BUILD_FIRST: "BUILD FIRST",
  NOT_YET: "DO NOT PROCEED",
};

const VERDICT_LINE: Record<VerdictKey, string> = {
  READY: "All three rings align. Your compass becomes a key.",
  ALMOST_THERE: "You're close. One or two things are worth closing before you move.",
  BUILD_FIRST: "Build First is not failure. It is the map.",
  NOT_YET: "Not yet is not no. It is clarity. It is protection.",
};

function wordmark(): string {
  return (
    `<span style="color:#22d3ee">H</span>` +
    `<span style="color:#34d399">&#333;</span>` +
    `<span style="color:#facc15">M</span>` +
    `<span style="color:#22d3ee">I</span>`
  );
}

function layout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0a1628;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1628;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#0f172a;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="font-size:22px;font-weight:700;">${wordmark()}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px;color:#e2e8f0;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;border-top:1px solid #1e293b;">
                <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
                  ${LEGAL_DISCLAIMER}
                </p>
                <p style="margin:12px 0 0 0;color:#94a3b8;font-size:11px;">
                  ${BRAND.legalEntity}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#ffffff;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Welcome to HōMI. Think of this as a decision companion, not a salesperson — we're here to
      give you an honest read on where you stand, not to talk you into anything.
    </p>
    <p style="margin:0 0 16px 0;">
      The read comes from three pillars, weighed differently:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
          <span style="color:#22d3ee;font-weight:700;">Financial Reality</span> &mdash; can you afford it?
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e293b;">
          <span style="color:#34d399;font-weight:700;">Emotional Truth</span> &mdash; do you really want it?
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="color:#facc15;font-weight:700;">Perfect Timing</span> &mdash; is now the right moment?
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px 0;">
      About five minutes tells you the truth about where you stand today.
    </p>
    <p style="margin:0;">
      <a href="${SITE}/assessment" style="color:#22d3ee;text-decoration:none;font-weight:700;">Start your assessment &rarr;</a>
    </p>
  `;
  return { subject: "Welcome to HōMI", html: layout(body) };
}

export function verdictEmail(
  name: string,
  score: number,
  verdict: VerdictKey,
): { subject: string; html: string } {
  const color = VERDICT_COLOR[verdict];
  const label = VERDICT_LABEL[verdict];
  const line = VERDICT_LINE[verdict];

  const body = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#ffffff;">Hi ${name},</p>
    <p style="margin:0 0 20px 0;">Your latest Decision Readiness Score is in.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      <tr>
        <td align="center" style="padding:20px 0;">
          <div style="font-size:42px;font-weight:700;color:#ffffff;">${score}</div>
          <div style="margin-top:6px;display:inline-block;padding:6px 16px;border-radius:999px;border:1px solid ${color}55;color:${color};font-weight:700;font-size:13px;letter-spacing:0.05em;">
            ${label}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px 0;">${line}</p>
    <p style="margin:0;">
      <a href="${SITE}/dashboard" style="color:#22d3ee;text-decoration:none;font-weight:700;">Continue on Home &rarr;</a>
    </p>
  `;
  // Privacy: the score and verdict never go in the subject line. Subjects
  // surface in lock-screen notifications and inbox previews; the full read
  // belongs inside the email the user deliberately opened.
  return { subject: "Your Decision Readiness Score is in", html: layout(body) };
}

export function reassessmentReminder(
  name: string,
  daysSince: number,
): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#ffffff;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      It's been ${daysSince} days since your last assessment. Numbers move — income, savings,
      debt, life. A quick retake makes sure your plan still reflects where you actually stand,
      not where you stood ${daysSince} days ago.
    </p>
    <p style="margin:0 0 20px 0;">
      No rush, and no penalty for waiting. Just an open door whenever you're ready to look again.
    </p>
    <p style="margin:0;">
      <a href="${SITE}/assessment" style="color:#22d3ee;text-decoration:none;font-weight:700;">Retake your assessment &rarr;</a>
    </p>
  `;
  return { subject: "A quick check-in on your readiness", html: layout(body) };
}

export function outcomeSurveyReminder(
  name: string,
  days: number,
): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#ffffff;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      It's been about ${days} days since your decision. HōMI gave you an honest read back then —
      now we'd love an honest read back: how is it actually going?
    </p>
    <p style="margin:0 0 20px 0;">
      It's a 30-second check-in, and there's no wrong answer. Whether it went well or didn't, your
      outcome is what keeps every future verdict honest.
    </p>
    <p style="margin:0;">
      <a href="${SITE}/outcomes" style="color:#22d3ee;text-decoration:none;font-weight:700;">Share how it went &rarr;</a>
    </p>
  `;
  return { subject: "How did it go? A quick outcome check-in", html: layout(body) };
}

export function waitlistConfirmation(): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px 0;font-size:18px;color:#ffffff;">You're on the list.</p>
    <p style="margin:0 0 16px 0;">
      HōMI gives you an honest, three-pillar read on whether you're ready to buy a home —
      financially, emotionally, and in terms of timing — before anyone with a stake in the sale
      gets a chance to weigh in.
    </p>
    <p style="margin:0;">
      We'll be in touch when it's your turn.
    </p>
  `;
  return { subject: "You're on the HōMI waitlist", html: layout(body) };
}

/**
 * Broadcast campaign wrapper (admin composer). The body HTML is admin-authored
 * in /admin/email and trusted as-is; this reuses the shared shell and appends
 * the CAN-SPAM unsubscribe footer so every broadcast carries a working opt-out.
 */
export function campaignEmail(bodyHtml: string, unsubscribeHref: string): { html: string } {
  const body = `${bodyHtml}
    <p style="margin:32px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      You're receiving this because you signed up for HōMI updates.
      <a href="${unsubscribeHref}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
    </p>
  `;
  return { html: layout(body) };
}
