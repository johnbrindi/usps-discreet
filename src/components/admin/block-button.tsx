"use client";

import { Ban, ShieldCheck } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Block / unblock the visitor behind a conversation, with a confirmation first. */
export function BlockButton({ blocked, onToggle }: { blocked: boolean; onToggle: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  function click() {
    const ok = window.confirm(
      blocked
        ? "Unblock this visitor? They will be able to use the website and chat again."
        : "Block this visitor? They will no longer be able to chat or open any page of the website.",
    );
    if (ok) startTransition(() => onToggle());
  }

  return (
    <Button type="button" variant={blocked ? "secondary" : "danger"} size="sm" onClick={click} disabled={pending}>
      {blocked ? <ShieldCheck className="size-4" aria-hidden /> : <Ban className="size-4" aria-hidden />}
      {pending ? (blocked ? "Unblocking…" : "Blocking…") : blocked ? "Unblock visitor" : "Block visitor"}
    </Button>
  );
}
