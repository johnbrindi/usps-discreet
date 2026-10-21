"use client";

import { Camera, Image as ImageIcon, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** "+" button that opens a menu of things to attach, like messaging apps do. */
export function AttachMenu({ onPick, disabled, className }: { onPick: (file: File) => void; disabled?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [touch, setTouch] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function toggle() {
    // A camera option only makes sense on phones and tablets.
    if (!open) setTouch(window.matchMedia("(pointer: coarse)").matches);
    setOpen((o) => !o);
  }

  function choose(input: HTMLInputElement | null) {
    setOpen(false);
    input?.click();
  }

  const fileInput = (ref: React.RefObject<HTMLInputElement | null>, capture?: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={capture ? "environment" : undefined}
      className="hidden"
      tabIndex={-1}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onPick(file);
      }}
    />
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full text-navy-700 transition hover:bg-navy-50 disabled:opacity-50",
          open && "bg-navy-50",
        )}
      >
        <Plus className={cn("size-6 transition-transform duration-200", open && "rotate-45")} aria-hidden />
        <span className="sr-only">Attach</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute bottom-full left-0 z-10 mb-2 w-48 origin-bottom-left overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-float"
        >
          <MenuItem first icon={<ImageIcon className="size-4" aria-hidden />} tone="bg-sky-100 text-sky-700" onClick={() => choose(galleryRef.current)}>
            Photo
          </MenuItem>
          {touch && (
            <MenuItem icon={<Camera className="size-4" aria-hidden />} tone="bg-rose-100 text-rose-700" onClick={() => choose(cameraRef.current)}>
              Camera
            </MenuItem>
          )}
        </div>
      )}
      {fileInput(galleryRef)}
      {fileInput(cameraRef, true)}
    </div>
  );
}

function MenuItem({
  icon,
  tone,
  onClick,
  first,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  onClick: () => void;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      autoFocus={first}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
    >
      <span className={cn("inline-flex size-8 items-center justify-center rounded-full", tone)}>{icon}</span>
      {children}
    </button>
  );
}
