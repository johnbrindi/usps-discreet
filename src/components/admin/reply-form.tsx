"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { startTransition, useActionState, useRef, useState } from "react";
import { AttachMenu } from "@/components/chat/attach-menu";
import { PhotoEditor } from "@/components/chat/photo-editor";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export function ReplyForm({
  action,
  agentName,
}: {
  action: (p: ActionState, fd: FormData) => Promise<ActionState>;
  agentName: string;
}) {
  /** Photo picked from the attach menu, open in the editor until sent or discarded. */
  const [picked, setPicked] = useState<File | null>(null);
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  // Clear the composer once a reply is sent.
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const next = await action(prev, fd);
      if (next.status === "success") {
        setDraft("");
        setPicked(null);
      }
      return next;
    },
    idleState,
  );
  const error =
    state.fieldErrors?.body?.[0] ??
    (state.status === "error" ? state.message : undefined);

  function sendPhoto(image: string, caption: string) {
    const fd = new FormData();
    fd.set("body", caption);
    fd.set("image", image);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="border-t border-line bg-white p-3"
      >
        <label
          htmlFor="reply"
          className="mb-1.5 block px-1 text-xs font-semibold text-muted"
        >
          Reply as {agentName}
        </label>
        {error && !picked && (
          <p
            id="reply-error"
            role="alert"
            className="mb-2 px-1 text-sm font-medium text-danger-700"
          >
            {error}
          </p>
        )}
        <div className="flex items-end gap-1">
          <AttachMenu disabled={pending} onPick={setPicked} />
          <textarea
            id="reply"
            name="body"
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) formRef.current?.requestSubmit();
              }
            }}
            placeholder="Type a reply"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "reply-error" : undefined}
            className="max-h-40 min-h-10 flex-1 resize-none rounded-3xl border border-transparent bg-surface px-4 py-2 text-sm leading-6 field-sizing-content focus:border-navy-600/40 focus:bg-white focus:ring-3 focus:ring-navy-600/15 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-700 text-white transition hover:bg-navy-800 disabled:bg-navy-700/40"
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="size-5" aria-hidden />
            )}
            <span className="sr-only">Send reply</span>
          </button>
        </div>
      </form>
      {picked && (
        <PhotoEditor
          file={picked}
          initialCaption={draft}
          sending={pending}
          error={error}
          onCancel={() => setPicked(null)}
          onSend={sendPhoto}
        />
      )}
    </>
  );
}
