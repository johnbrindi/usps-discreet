"use client";

import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { compressImage } from "@/lib/compress-image";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export function ReplyForm({ action, agentName }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; agentName: string }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Clear the form once a reply is sent.
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (next.status === "success") {
      formRef.current?.reset();
      setPhoto(null);
    }
    return next;
  }, idleState);
  const error = photoError ?? state.fieldErrors?.body?.[0] ?? (state.status === "error" ? state.message : undefined);

  async function pickPhoto(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await compressImage(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "That photo couldn't be added.");
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2 border-t border-line p-4">
      <label htmlFor="reply" className="text-sm font-semibold text-ink">Reply as {agentName}</label>
      <Textarea id="reply" name="body" placeholder={photo ? "Add a caption (optional)…" : undefined} rows={3} maxLength={2000} required={!photo} aria-invalid={error ? true : undefined} aria-describedby={error ? "reply-error" : undefined} />
      {photo && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img src={photo} alt="Photo to send" className="h-24 rounded-md border border-line object-cover" />
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
      <input type="hidden" name="image" value={photo ?? ""} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={(e) => void pickPhoto(e.target.files?.[0])} />
      {error && <p id="reply-error" role="alert" className="text-sm font-medium text-danger-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden />
          Add photo
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          Send reply
        </Button>
      </div>
    </form>
  );
}
