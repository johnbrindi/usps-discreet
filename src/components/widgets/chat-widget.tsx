"use client";

import { AlertCircle, ImagePlus, Loader2, Lock, MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

type Message = { id: string; sender: "VISITOR" | "AGENT"; body: string; imageUrl: string | null; createdAt: string };
type LoadState = "idle" | "loading" | "ready" | "error";

const POLL_MS = 5_000;

export function ChatWidget({ agentName, hoursLabel, alwaysOpen = false }: { agentName: string; hoursLabel: string; alwaysOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [load, setLoad] = useState<LoadState>("idle");
  const [withinHours, setWithinHours] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  /** Photo waiting to be sent, as a resized JPEG data URL. */
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const panelId = useId();
  const inputId = useId();

  const fetchMessages = useCallback(async (initial: boolean) => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { messages: Message[]; withinSupportHours: boolean };
      setMessages(data.messages);
      setWithinHours(data.withinSupportHours);
      setLoad("ready");
    } catch {
      if (initial) setLoad("error");
    }
  }, []);

  // Poll for replies while the panel is open and the tab is visible.
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchMessages(false);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, fetchMessages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, load]);

  function openChat() {
    setLoad("loading");
    setOpen(true);
    void fetchMessages(true);
  }

  function retry() {
    setLoad("loading");
    void fetchMessages(true);
  }

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function pickPhoto(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setSendError(null);
    try {
      setPhoto(await compressImage(file));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "That photo couldn't be added.");
    }
    inputRef.current?.focus();
  }

  async function send() {
    const body = draft.trim();
    if ((!body && !photo) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, ...(photo && { image: photo }) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        messages?: Message[];
        withinSupportHours?: boolean;
        error?: string;
      };
      if (!res.ok || !data.messages) throw new Error(data.error ?? "Your message couldn't be sent. Please try again.");
      setMessages(data.messages);
      if (typeof data.withinSupportHours === "boolean") setWithinHours(data.withinSupportHours);
      setDraft("");
      setPhoto(null);
      setLoad("ready");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Your message couldn't be sent.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        aria-label={`Chat with ${agentName}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : openChat())}
        className="group pointer-events-auto relative inline-flex items-center justify-center rounded-full bg-navy-700 text-white shadow-float transition-colors hover:bg-navy-800 active:bg-navy-900 focus-visible:outline-offset-4"
        style={{ width: "var(--fab-size)", height: "var(--fab-size)" }}
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
        <span
          aria-hidden
          className="pointer-events-none absolute right-full mr-3 hidden rounded-md bg-navy-950 px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap text-white opacity-0 shadow-float transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
        >
          {open ? "Close chat" : `Chat with ${agentName}`}
        </span>
      </button>

      <section
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!open}
        className={cn(
          "pointer-events-auto fixed flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-float",
          // Docked above both launchers at every size so neither launcher is ever covered.
          "right-[var(--fab-right)] bottom-[calc(var(--fab-bottom)+2*var(--fab-size)+2*var(--fab-gap))]",
          "w-[min(22.5rem,calc(100vw-2*var(--fab-inset)))]",
          "h-[min(36rem,calc(100dvh-var(--fab-bottom)-2*var(--fab-size)-2*var(--fab-gap)-var(--fab-inset)-env(safe-area-inset-top,0px)))]",
        )}
        style={{ zIndex: "var(--z-chat)" }}
      >
        <header className="flex items-center gap-3 bg-navy-800 px-4 py-3 text-white">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-base font-bold text-navy-950"
          >
            {agentName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="leading-tight font-semibold">
              {agentName} · Customer support
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-navy-100">
              {withinHours !== null && (
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", withinHours ? "bg-whatsapp" : "bg-navy-100/50")}
                />
              )}
              {alwaysOpen
                ? "Available 24/7 — replies are sent here"
                : withinHours === null
                  ? `Support hours: ${hoursLabel}`
                  : withinHours
                    ? "Within support hours — replies are sent here"
                    : `Outside support hours (${hoursLabel})`}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/10"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close chat</span>
          </button>
        </header>

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-surface px-4 py-4"
          aria-live="polite"
          aria-busy={load === "loading"}
        >
          <p className="flex items-center justify-center gap-1.5 text-center text-[0.6875rem] text-muted">
            <Lock className="size-3" aria-hidden /> Secure chat
          </p>
          <p className="rounded-md border border-line bg-white p-3 text-xs leading-5 text-muted">
            {alwaysOpen
              ? `Messages are saved and answered by our support team (${agentName}) around the clock — replies may take a few minutes.`
              : `Messages are saved and answered by our support team (${agentName}) during support hours — replies are not instant.`}{" "}
          </p>

          {load === "loading" && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading conversation…
            </div>
          )}

          {load === "error" && (
            <div className="rounded-md border border-danger-700/25 bg-danger-50 p-3 text-sm text-danger-700">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="size-4" aria-hidden /> Chat couldn&apos;t be loaded.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
              >
                <RefreshCw className="size-3.5" aria-hidden /> Try again
              </button>
            </div>
          )}

          {load === "ready" && messages.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No messages yet. Ask about a parcel — include your tracking number if you have it.
            </p>
          )}

          {messages.map((m) => {
            const mine = m.sender === "VISITOR";
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <p className="mb-0.5 px-1 text-[0.6875rem] font-semibold text-muted">{mine ? "You" : agentName}</p>
                {m.imageUrl && (
                  <a href={m.imageUrl} target="_blank" rel="noopener" className="mb-1 block max-w-[85%]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie-authenticated image */}
                    <img src={m.imageUrl} alt="Photo" loading="lazy" className="max-h-64 rounded-2xl border border-line object-cover" />
                    <span className="sr-only">(opens full size in a new tab)</span>
                  </a>
                )}
                {m.body && (
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-6 break-words whitespace-pre-wrap",
                      mine ? "rounded-br-sm bg-navy-700 text-white" : "rounded-bl-sm border border-line bg-white text-ink",
                    )}
                  >
                    {m.body}
                  </div>
                )}
                <time dateTime={m.createdAt} className="mt-0.5 px-1 text-[0.6875rem] text-muted">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </time>
              </div>
            );
          })}
        </div>

        <form
          className="border-t border-line bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {sendError && (
            <p role="alert" className="mb-2 text-sm font-medium text-danger-700">
              {sendError}
            </p>
          )}
          {photo && (
            <div className="relative mb-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={photo} alt="Photo to send" className="h-20 rounded-md border border-line object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-navy-950 text-white"
              >
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">Remove photo</span>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line-strong text-navy-700 hover:bg-navy-50 disabled:opacity-50"
            >
              <ImagePlus className="size-5" aria-hidden />
              <span className="sr-only">Attach a photo</span>
            </button>
            <label htmlFor={inputId} className="sr-only">
              Message
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              rows={1}
              maxLength={2000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={photo ? "Add a caption (optional)…" : "Write a message…"}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-line-strong px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-3 focus:ring-navy-600/20 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !photo)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
              <span className="sr-only">Send message</span>
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
