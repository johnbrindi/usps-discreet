import Link from "next/link";
import { Check, CheckCheck } from "lucide-react";
import { isSeen } from "@/server/chat";
import { chatDateTime } from "@/lib/chat-format";
import { AdminPageTitle } from "@/components/admin/page-title";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "Chat" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage();
  const { status: raw } = await searchParams;
  const status = raw === "CLOSED" ? "CLOSED" : "OPEN";
  const conversations = await db.chatConversation.findMany({
    where: { status },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: {
      id: true,
      lastMessageAt: true,
      visitorReadAt: true,
      agentReadAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, imageType: true, sender: true, createdAt: true } },
      _count: { select: { messages: true } },
    },
  });

  return (
    <>
      <AdminPageTitle title="Chat" description="Visitor messages from the website chat widget." />
      <div className="mb-4 flex gap-2" role="tablist">
        {(["OPEN", "CLOSED"] as const).map((s) => (
          <Link
            key={s}
            href={s === "OPEN" ? "/admin/messages" : "/admin/messages?status=CLOSED"}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold",
              status === s ? "bg-navy-700 text-white" : "border border-line bg-white text-navy-900 hover:bg-navy-50",
            )}
          >
            {s === "OPEN" ? "Open" : "Closed"}
          </Link>
        ))}
      </div>
      <Card>
        {conversations.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No {status.toLowerCase()} conversations.</p>
        ) : (
          <ul className="divide-y divide-line">
            {conversations.map((c) => {
              const last = c.messages[0];
              const awaiting = last?.sender === "VISITOR";
              const unread = awaiting && !isSeen(last, c);
              return (
                <li key={c.id}>
                  <Link href={`/admin/messages/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface">
                    <div className="min-w-0">
                      <p className={cn("flex items-center gap-1 truncate text-sm text-ink", unread && "font-bold")}>
                        {last?.sender === "AGENT" &&
                          (isSeen(last, c) ? (
                            <CheckCheck className="size-4 shrink-0 text-emerald-600" strokeWidth={2.5} aria-label="Seen" role="img" />
                          ) : (
                            <Check className="size-4 shrink-0 text-muted" strokeWidth={2.5} aria-label="Sent" role="img" />
                          ))}
                        <span className="truncate">{last?.body || (last?.imageType ? "📷 Photo" : "(empty)")}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {c._count.messages} message{c._count.messages === 1 ? "" : "s"} · {chatDateTime(c.lastMessageAt.toISOString())}
                      </p>
                    </div>
                    {awaiting && (
                      <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-navy-950">Awaiting reply</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
