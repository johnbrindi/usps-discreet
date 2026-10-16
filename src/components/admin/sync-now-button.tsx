"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/types";
import { idleState } from "@/server/actions/types";

export function SyncNowButton({ action }: { action: (prev: ActionState) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
        {pending ? "Contacting carrier…" : "Sync now"}
      </Button>
      {state.message && (
        <Alert key={state.attempt} tone={state.status === "success" ? "success" : "danger"} live>
          {state.message}
        </Alert>
      )}
    </form>
  );
}
