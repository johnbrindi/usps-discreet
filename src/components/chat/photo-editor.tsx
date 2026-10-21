"use client";

import { Check, Crop, Loader2, RotateCcw, RotateCw, SendHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FULL_CROP, cropPhoto, exportPhoto, loadPhotoForEditing, rotatePhoto, type CropRect } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

type Handle = "move" | "nw" | "ne" | "sw" | "se";

/** Smallest crop, as a fraction of each side. */
const MIN_CROP = 0.08;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function adjust(r: CropRect, handle: Handle, dx: number, dy: number): CropRect {
  if (handle === "move") return { ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) };
  let { x, y } = r;
  let right = r.x + r.w;
  let bottom = r.y + r.h;
  if (handle.includes("w")) x = clamp(r.x + dx, 0, right - MIN_CROP);
  if (handle.includes("e")) right = clamp(right + dx, x + MIN_CROP, 1);
  if (handle.includes("n")) y = clamp(r.y + dy, 0, bottom - MIN_CROP);
  if (handle.includes("s")) bottom = clamp(bottom + dy, y + MIN_CROP, 1);
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * Full-screen preview shown after picking a photo: crop, rotate and add a caption before sending,
 * like messaging apps do. The photo is re-encoded in the browser, so nothing is uploaded until Send.
 */
export function PhotoEditor({
  file,
  initialCaption = "",
  sending = false,
  error,
  onCancel,
  onSend,
}: {
  file: File;
  initialCaption?: string;
  sending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSend: (image: string, caption: string) => void;
}) {
  const [original, setOriginal] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState<CropRect>(FULL_CROP);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
  const captionRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    let live = true;
    loadPhotoForEditing(file).then(
      (data) => {
        if (!live) return;
        setOriginal(data);
        setSrc(data);
      },
      (err: unknown) => live && setLoadError(err instanceof Error ? err.message : "That photo couldn't be opened."),
    );
    return () => {
      live = false;
    };
  }, [file]);

  useEffect(() => {
    if (src && !cropping) captionRef.current?.focus();
  }, [src, cropping]);

  // Escape leaves crop mode first, then closes. Captured so the chat panel behind doesn't close too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (cropping) setCropping(false);
      else if (!sending) onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [cropping, sending, onCancel]);

  // Keep the page behind from scrolling while the editor is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    try {
      setSrc(await task());
    } finally {
      setBusy(false);
    }
  }

  async function applyCrop() {
    const rect = crop;
    setCropping(false);
    if (rect.w < 0.999 || rect.h < 0.999) await run(() => cropPhoto(src!, rect));
  }

  async function send() {
    if (!src || busy || sending) return;
    setBusy(true);
    try {
      onSend(await exportPhoto(src), caption.trim());
    } finally {
      setBusy(false);
    }
  }

  const working = busy || sending;
  const toolButton = "inline-flex size-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 disabled:opacity-40";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 flex flex-col bg-navy-950/[0.97] text-white"
      style={{ zIndex: "calc(var(--z-chat) + 10)" }}
    >
      <header className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5">
        {cropping ? (
          <>
            <button type="button" onClick={() => setCropping(false)} className={toolButton}>
              <X className="size-5" aria-hidden />
              <span className="sr-only">Cancel crop</span>
            </button>
            <h2 id={titleId} className="flex-1 text-base font-semibold">Crop</h2>
            <button type="button" onClick={() => setCrop(FULL_CROP)} className="rounded-full px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10">
              Reset
            </button>
            <button type="button" onClick={() => void applyCrop()} className="inline-flex size-10 items-center justify-center rounded-full bg-amber-500 text-navy-950 hover:bg-amber-400">
              <Check className="size-5" aria-hidden />
              <span className="sr-only">Apply crop</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onCancel} disabled={sending} className={toolButton}>
              <X className="size-5" aria-hidden />
              <span className="sr-only">Discard photo</span>
            </button>
            <h2 id={titleId} className="flex-1 text-base font-semibold">Send photo</h2>
            <button
              type="button"
              onClick={() => {
                setCrop(FULL_CROP);
                setCropping(true);
              }}
              disabled={!src || working}
              className={toolButton}
              title="Crop"
            >
              <Crop className="size-5" aria-hidden />
              <span className="sr-only">Crop</span>
            </button>
            <button type="button" onClick={() => void run(() => rotatePhoto(src!))} disabled={!src || working} className={toolButton} title="Rotate">
              <RotateCw className="size-5" aria-hidden />
              <span className="sr-only">Rotate</span>
            </button>
            <button
              type="button"
              onClick={() => setSrc(original)}
              disabled={!src || working || src === original}
              className={toolButton}
              title="Undo all edits"
            >
              <RotateCcw className="size-5" aria-hidden />
              <span className="sr-only">Undo all edits</span>
            </button>
          </>
        )}
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        {loadError ? (
          <p role="alert" className="max-w-xs text-center text-sm text-white/90">{loadError}</p>
        ) : !src ? (
          <Loader2 className="size-8 animate-spin text-white/70" aria-label="Opening photo" />
        ) : (
          <CropStage src={src} cropping={cropping} crop={crop} onCrop={setCrop} dimmed={busy} />
        )}
      </div>

      {!cropping && (
        <form
          className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {error && (
            <p role="alert" className="absolute inset-x-0 bottom-20 text-center text-sm font-medium text-red-300">
              {error}
            </p>
          )}
          <label htmlFor={`${titleId}-caption`} className="sr-only">Caption</label>
          <input
            id={`${titleId}-caption`}
            ref={captionRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2000}
            placeholder="Add a caption (optional)…"
            className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/10 px-5 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:bg-white/15 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!src || working}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-navy-950 shadow-float transition hover:bg-amber-400 disabled:opacity-50"
          >
            {working ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <SendHorizontal className="size-5" aria-hidden />}
            <span className="sr-only">Send photo</span>
          </button>
        </form>
      )}
    </div>,
    document.body,
  );
}

function CropStage({
  src,
  cropping,
  crop,
  onCrop,
  dimmed,
}: {
  src: string;
  cropping: boolean;
  crop: CropRect;
  onCrop: (r: CropRect) => void;
  dimmed: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  const startDrag = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const box = stageRef.current!.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, rect: crop };
    const move = (ev: PointerEvent) =>
      onCrop(adjust(start.rect, handle, (ev.clientX - start.x) / box.width, (ev.clientY - start.y) / box.height));
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const nudge = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onCrop(adjust(crop, "move", d[0]!, d[1]!));
  };

  return (
    <div ref={stageRef} className="relative inline-block touch-none overflow-hidden select-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL being edited */}
      <img
        src={src}
        alt="Photo to send"
        draggable={false}
        className={cn(
          "block max-h-[calc(100dvh-10.5rem)] max-w-full object-contain transition-opacity",
          dimmed && "opacity-50",
        )}
      />
      {cropping && (
        <div
          role="slider"
          tabIndex={0}
          aria-label="Crop area. Drag or use arrow keys to move it; drag the corners to resize."
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(crop.x * 100)}
          aria-valuetext={`${Math.round(crop.w * 100)}% by ${Math.round(crop.h * 100)}%`}
          onPointerDown={startDrag("move")}
          onKeyDown={nudge}
          className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] outline-none focus-visible:border-amber-400"
          style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
        >
          {/* Rule-of-thirds guides */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 right-1/3 border-x border-white/40" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 bottom-1/3 border-y border-white/40" />
          {(["nw", "ne", "sw", "se"] as const).map((h) => (
            <span
              key={h}
              aria-hidden
              onPointerDown={startDrag(h)}
              className={cn(
                "absolute size-7 border-white",
                h === "nw" && "-top-1 -left-1 cursor-nwse-resize border-t-4 border-l-4",
                h === "ne" && "-top-1 -right-1 cursor-nesw-resize border-t-4 border-r-4",
                h === "sw" && "-bottom-1 -left-1 cursor-nesw-resize border-b-4 border-l-4",
                h === "se" && "-right-1 -bottom-1 cursor-nwse-resize border-r-4 border-b-4",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
