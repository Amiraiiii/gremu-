import "server-only";

export type EmailMessage = { to: string; subject: string; text: string; replyTo?: string };
export type EmailResult = { status: "sent" | "logged" };

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

/**
 * MOCK MODE: no provider configured. Logs that an email *would* be sent — subject and
 * recipient only, never the body (it contains personal data). Nothing is delivered.
 */
class LogEmailProvider implements EmailProvider {
  async send(m: EmailMessage): Promise<EmailResult> {
    console.info(`[email:log-mode] to=${m.to} subject="${m.subject}" (not delivered — EMAIL_PROVIDER is not configured)`);
    return { status: "logged" };
  }
}

/** Resend adapter — active when EMAIL_PROVIDER=resend and EMAIL_API_KEY/EMAIL_FROM are set. */
class ResendEmailProvider implements EmailProvider {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async send(m: EmailMessage): Promise<EmailResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [m.to], subject: m.subject, text: m.text, reply_to: m.replyTo }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return { status: "sent" };
  }
}

export function getEmailProvider(): EmailProvider {
  const { EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM } = process.env;
  if (EMAIL_PROVIDER === "resend" && EMAIL_API_KEY && EMAIL_FROM) return new ResendEmailProvider(EMAIL_API_KEY, EMAIL_FROM);
  return new LogEmailProvider();
}

export function managerEmail(): string | null {
  return process.env.MANAGER_EMAIL?.trim() || null;
}
