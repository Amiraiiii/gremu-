"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { formatUZS } from "@/lib/format";
import { CloseIcon } from "@/components/ui/icons";

type T = Dictionary["assistant"];
type Card = { sku: string; title: string; url: string; priceMinor: number; availability: string; isDemo: boolean };
type Msg = { role: "user" | "model"; text: string; products?: Card[]; error?: boolean };

const STORE = "gremu-assistant-v1";
const MAX = 1000;

function Spark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

/**
 * Floating AI assistant. Answers come only from /api/assistant/chat (Gemini + read-only catalog
 * tools). When the server has no Gemini key, the panel says so and offers the manager form instead.
 * The conversation lives in this tab only (sessionStorage).
 */
export function AssistantWidget({ locale, t, enabled }: { locale: Locale; t: T; enabled: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "handoff">(enabled ? "chat" : "handoff");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) setMessages(JSON.parse(raw) as Msg[]);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30)));
    } catch {}
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => (view === "chat" ? field.current : panel.current?.querySelector<HTMLElement>("input,textarea"))?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [open, view]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy || text.length > MAX) return;
    const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", text }];
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessages((m) => [...m, { role: "model", text: data.reply, products: data.products }]);
      } else {
        const key = (data.error ?? "generic") as keyof T["errors"];
        setMessages((m) => [...m, { role: "model", text: t.errors[key] ?? t.errors.generic, error: true }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "model", text: t.errors.generic, error: true }]);
    }
    setBusy(false);
  };

  return (
    <>
      <button
        ref={launcher}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
        className={`btn btn-primary fixed right-4 bottom-4 z-40 rounded-full shadow-lg md:right-6 md:bottom-6 ${open ? "max-sm:hidden" : ""}`}
      >
        <Spark />
        <span>{t.open}</span>
      </button>

      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="dialog"
          aria-labelledby={`${id}-title`}
          data-lenis-prevent
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(640px,calc(100svh-1.5rem))] flex-col overflow-hidden rounded-[26px] bg-paper shadow-2xl ring-1 ring-line sm:inset-x-auto sm:right-6 sm:bottom-24 sm:max-h-[min(640px,calc(100svh-7.5rem))] sm:w-[400px]"
        >
          <div className="bg-brand flex items-start justify-between gap-3 px-5 pt-4 pb-3 text-cream">
            <div className="min-w-0">
              <h2 id={`${id}-title`} className="flex items-center gap-2 font-display text-base font-semibold">
                <Spark className="size-4" /> {t.title}
              </h2>
              <p className="mt-1 text-xs text-cream/70">{t.disclaimer}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
              className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/10"
              aria-label={t.close}
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          {view === "chat" && enabled ? (
            <>
              <div ref={list} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
                <p className="max-w-[90%] rounded-2xl rounded-tl-md bg-paper-2 px-4 py-3 text-sm text-ink ring-1 ring-line">{t.greeting}</p>
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "rounded-tr-md bg-petrol-800 text-cream"
                          : m.error
                            ? "rounded-tl-md bg-bad/10 text-bad ring-1 ring-bad/25"
                            : "rounded-tl-md bg-paper-2 text-ink ring-1 ring-line"
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.products && m.products.length > 0 && (
                      <ul className="mt-2 grid gap-2">
                        {m.products.map((p) => (
                          <li key={p.sku}>
                            <Link href={p.url} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-line transition-colors hover:bg-paper-2">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-ink">{p.title}</span>
                                <span className="mono-num block text-xs text-muted">
                                  {p.sku}
                                  {p.isDemo ? ` · ${t.demo}` : ""}
                                </span>
                              </span>
                              <span className="mono-num shrink-0 text-sm text-petrol-800">{formatUZS(p.priceMinor, locale)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {busy && (
                  <p role="status" className="inline-flex items-center gap-2 text-sm text-muted">
                    <span className="size-2 animate-pulse rounded-full bg-petrol-600" /> {t.thinking}
                  </p>
                )}
              </div>

              <div className="border-t border-line px-4 pt-3 pb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setView("handoff")} className="inline-flex min-h-9 items-center text-sm font-medium text-petrol-700 hover:underline">
                    {t.manager}
                  </button>
                  {messages.length > 0 && (
                    <button type="button" onClick={() => setMessages([])} className="inline-flex min-h-9 items-center text-xs text-muted hover:text-ink">
                      {t.reset}
                    </button>
                  )}
                </div>
                <form onSubmit={send} className="flex items-end gap-2">
                  <label htmlFor={`${id}-input`} className="sr-only">
                    {t.placeholder}
                  </label>
                  <textarea
                    ref={field}
                    id={`${id}-input`}
                    rows={2}
                    value={input}
                    maxLength={MAX}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={t.placeholder}
                    aria-describedby={input.length > MAX - 100 ? `${id}-count` : undefined}
                    className="field max-h-32 min-h-14 resize-none py-2.5 text-[16px] leading-snug"
                  />
                  <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary h-12 shrink-0 px-4">
                    {t.send}
                  </button>
                </form>
                {input.length > MAX - 100 && (
                  <p id={`${id}-count`} className="mt-1 text-right text-xs text-muted">
                    {input.length}/{MAX}
                  </p>
                )}
              </div>
            </>
          ) : (
            <Handoff
              locale={locale}
              t={t}
              enabled={enabled}
              lastQuestion={[...messages].reverse().find((m) => m.role === "user")?.text ?? ""}
              transcript={messages.filter((m) => !m.error).map(({ role, text }) => ({ role, text }))}
              onBack={() => setView("chat")}
            />
          )}
        </div>
      )}
    </>
  );
}

function Handoff({
  locale,
  t,
  enabled,
  lastQuestion,
  transcript,
  onBack,
}: {
  locale: Locale;
  t: T;
  enabled: boolean;
  lastQuestion: string;
  transcript: { role: "user" | "model"; text: string }[];
  onBack: () => void;
}) {
  const id = useId();
  const h = t.handoff;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const payload = {
      locale,
      name: get("name"),
      phone: get("phone"),
      email: get("email"),
      question: get("question"),
      consent: fd.get("consent") === "on",
      website: get("website"),
      transcript: transcript.slice(-8),
    };
    const next: Record<string, string> = {};
    if (payload.name.length < 2) next.name = h.errors.name;
    if (!payload.phone && !payload.email) next.phone = h.errors.contact;
    if (payload.question.length < 5) next.question = h.errors.message;
    if (!payload.consent) next.consent = h.errors.consent;
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      const res = await fetch("/api/assistant/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setDone(data.id);
      else if (data.fields) {
        const map: Record<string, string> = {};
        for (const [k, code] of Object.entries(data.fields as Record<string, string>)) {
          const key = k === "question" || code === "message" ? "question" : k;
          map[key] = (h.errors as Record<string, string>)[code] ?? h.errors.server;
        }
        setErrors(map);
      } else setErrors({ form: h.errors.server });
    } catch {
      setErrors({ form: h.errors.server });
    }
    setSending(false);
  };

  const label = "mb-1 block text-sm font-medium text-ink";
  const err = (k: string) =>
    errors[k] ? (
      <p id={`${id}-${k}-err`} className="mt-1 text-xs text-bad">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });

  if (done) {
    return (
      <div role="status" className="px-5 py-6">
        <p className="text-sm text-ink">{h.done}</p>
        <p className="mono-num mt-1 text-lg text-petrol-900">{done}</p>
        {enabled && (
          <button type="button" onClick={onBack} className="btn btn-ghost mt-5 text-petrol-800">
            {h.back}
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
      {!enabled && <p className="mb-4 rounded-xl bg-paper-2 px-3 py-2 text-sm text-ink-2 ring-1 ring-line">{t.notConfigured}</p>}
      <h3 className="font-medium text-petrol-900">{h.title}</h3>
      <p className="mt-1 mb-4 text-xs text-muted">{h.lead}</p>
      <div className="grid gap-3">
        <div>
          <label htmlFor={`${id}-name`} className={label}>{h.name}</label>
          <input id={`${id}-name`} name="name" autoComplete="name" className="field" {...aria("name")} />
          {err("name")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-phone`} className={label}>{h.phone}</label>
            <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+998" className="field" {...aria("phone")} />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={label}>{h.email}</label>
            <input id={`${id}-email`} name="email" type="email" autoComplete="email" className="field" {...aria("email")} />
            {err("email")}
          </div>
        </div>
        {err("phone") ?? <p className="-mt-2 text-xs text-muted">{h.contactHint}</p>}
        <div>
          <label htmlFor={`${id}-q`} className={label}>{h.question}</label>
          <textarea id={`${id}-q`} name="question" rows={3} maxLength={1000} defaultValue={lastQuestion} className="field min-h-20 py-2.5" {...aria("question")} />
          {err("question")}
        </div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-ink-2">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[var(--petrol-700)]" {...aria("consent")} />
          <span>{h.consent}</span>
        </label>
        {err("consent")}
        {errors.form && <p role="alert" className="text-sm text-bad">{errors.form}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={sending} className="btn btn-primary">
            {h.submit}
          </button>
          {enabled && (
            <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center text-sm text-petrol-700 hover:underline">
              {h.back}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
