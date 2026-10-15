import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Chat" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = raw === "CLOSED" ? "CLOSED" : "OPEN";
  const conversations = await db.chatConversation.findMany({
    where: { status },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: {
      id: true,
      lastMessageAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, sender: true } },
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
              return (
                <li key={c.id}>
                  <Link href={`/admin/messages/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{last?.body ?? "(empty)"}</p>
                      <p className="text-xs text-muted">
                        {c._count.messages} message{c._count.messages === 1 ? "" : "s"} · {c.lastMessageAt.toISOString().slice(0, 16).replace("T", " ")} UTC
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
