"use client";

import { AlertCircle, Loader2, Lock, MessageCircle, RefreshCw, SendHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AttachMenu } from "@/components/chat/attach-menu";
import { ChatBubble, DaySeparator } from "@/components/chat/chat-bubble";
import { PhotoEditor } from "@/components/chat/photo-editor";
import { chatTime, dayLabel, startsRun } from "@/lib/chat-format";
import { cn } from "@/lib/utils";

type Message = { id: string; sender: "VISITOR" | "AGENT"; body: string; imageUrl: string | null; seen: boolean; createdAt: string };
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
  /** Photo picked from the attach menu, open in the editor until sent or discarded. */
  const [picked, setPicked] = useState<File | null>(null);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const panelId = useId();
  const inputId = useId();

  const fetchMessages = useCallback(async (initial: boolean) => {
    try {
      // Only called while the panel is open, so the visitor has seen any replies.
      const res = await fetch("/api/chat?read=1", { cache: "no-store" });
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

  async function send(body = draft.trim(), image?: string) {
    if ((!body && !image) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, ...(image && { image }) }),
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
      setPicked(null);
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
          className="flex-1 overflow-y-auto overscroll-contain bg-surface px-3 py-3"
          aria-live="polite"
          aria-busy={load === "loading"}
        >
          <p className="mx-auto mb-2 max-w-[17rem] rounded-lg bg-amber-50 px-3 py-2 text-center text-[0.6875rem] leading-4 text-amber-900">
            <Lock className="mr-1 inline size-3 align-[-1px]" aria-hidden />
            {alwaysOpen
              ? `Secure chat. Our support team (${agentName}) answers around the clock — replies may take a few minutes.`
              : `Secure chat. Our support team (${agentName}) answers during support hours — replies are not instant.`}
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

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.sender === "VISITOR";
            const newRun = startsRun(m, prev);
            return (
              <div key={m.id}>
                {(!prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt)) && <DaySeparator label={dayLabel(m.createdAt)} />}
                <ChatBubble
                  mine={mine}
                  body={m.body}
                  imageUrl={m.imageUrl}
                  time={chatTime(m.createdAt)}
                  dateTime={m.createdAt}
                  author={newRun && !mine ? agentName : undefined}
                  status={mine ? (m.seen ? "seen" : "sent") : undefined}
                  tail={newRun}
                />
              </div>
            );
          })}
        </div>

        <form
          className="border-t border-line bg-white px-2 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {sendError && !picked && (
            <p role="alert" className="mb-2 px-2 text-sm font-medium text-danger-700">
              {sendError}
            </p>
          )}
          <div className="flex items-end gap-1">
            <AttachMenu
              disabled={sending}
              onPick={(file) => {
                setSendError(null);
                setPicked(file);
              }}
            />
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
              placeholder="Type a message"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-3xl border border-transparent bg-surface px-4 py-2 text-sm leading-6 field-sizing-content focus:border-navy-600/40 focus:bg-white focus:ring-3 focus:ring-navy-600/15 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-700 text-white transition hover:bg-navy-800 disabled:bg-navy-700/40"
            >
              {sending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <SendHorizontal className="size-5" aria-hidden />}
              <span className="sr-only">Send message</span>
            </button>
          </div>
        </form>
        {picked && (
          <PhotoEditor
            file={picked}
            initialCaption={draft}
            sending={sending}
            error={sendError}
            onCancel={() => {
              setPicked(null);
              setSendError(null);
            }}
            onSend={(image, caption) => void send(caption, image)}
          />
        )}
      </section>
    </>
  );
}
