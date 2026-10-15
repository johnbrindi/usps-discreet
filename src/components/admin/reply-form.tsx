"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export function ReplyForm({ action, agentName }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; agentName: string }) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const error = state.fieldErrors?.body?.[0] ?? (state.status === "error" ? state.message : undefined);
  return (
    <form action={formAction} className="space-y-2 border-t border-line p-4">
      <label htmlFor="reply" className="text-sm font-semibold text-ink">Reply as {agentName}</label>
      <Textarea id="reply" name="body" rows={3} maxLength={2000} required aria-invalid={error ? true : undefined} aria-describedby={error ? "reply-error" : undefined} />
      {error && <p id="reply-error" role="alert" className="text-sm font-medium text-danger-700">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          Send reply
        </Button>
      </div>
    </form>
  );
}
