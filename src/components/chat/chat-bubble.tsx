"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** One chat message: an optional photo with an optional caption, timestamp tucked inside like messaging apps. */
export function ChatBubble({
  mine,
  body,
  imageUrl,
  time,
  dateTime,
  author,
  tail = true,
}: {
  mine: boolean;
  body: string;
  imageUrl: string | null;
  time: string;
  dateTime: string;
  /** Shown above the first bubble of a run from the same sender. */
  author?: string;
  /** False for the follow-up bubbles in a run, which then sit closer together. */
  tail?: boolean;
}) {
  const [viewing, setViewing] = useState(false);
  const stamp = (
    <time dateTime={dateTime} className={cn("text-[0.6875rem] whitespace-nowrap", mine ? "text-white/70" : "text-muted")}>
      {time}
    </time>
  );

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start", tail ? "mt-3" : "mt-1")}>
      {author && <p className="mb-1 px-1 text-[0.6875rem] font-semibold text-muted">{author}</p>}
      <div
        className={cn(
          "max-w-[80%] overflow-hidden rounded-2xl text-sm leading-6 shadow-[0_1px_1px_rgba(16,24,40,0.06)]",
          mine ? "bg-navy-700 text-white" : "border border-line bg-white text-ink",
          tail && (mine ? "rounded-br-md" : "rounded-bl-md"),
          imageUrl && "p-1",
        )}
      >
        {imageUrl && (
          <button type="button" onClick={() => setViewing(true)} className="relative block overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie/session-authenticated image */}
            <img src={imageUrl} alt="Photo" loading="lazy" className="block max-h-72 w-full min-w-40 object-cover" />
            <span className="sr-only">View photo full size</span>
            {!body && (
              <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[0.6875rem] text-white">
                {time}
              </span>
            )}
          </button>
        )}
        {body && (
          <p className={cn("break-words whitespace-pre-wrap", imageUrl ? "px-2 pt-1 pb-0.5" : "px-3 pt-1.5 pb-1")}>
            {body}
            <span className="float-right mt-1.5 ml-3 leading-none">{stamp}</span>
          </p>
        )}
        {!body && !imageUrl && <p className="px-3 py-1.5">{stamp}</p>}
      </div>
      {viewing && imageUrl && <PhotoViewer src={imageUrl} onClose={() => setViewing(false)} />}
    </div>
  );
}

function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center bg-navy-950/95 p-4"
      style={{ zIndex: "calc(var(--z-chat) + 10)" }}
    >
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        <X className="size-6" aria-hidden />
        <span className="sr-only">Close photo</span>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie/session-authenticated image */}
      <img src={src} alt="Photo" className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body,
  );
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex justify-center">
      <span className="rounded-full bg-white px-3 py-1 text-[0.6875rem] font-semibold text-muted shadow-[0_1px_1px_rgba(16,24,40,0.06)]">{label}</span>
    </div>
  );
}
