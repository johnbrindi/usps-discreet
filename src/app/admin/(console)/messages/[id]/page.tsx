import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ReplyForm } from "@/components/admin/reply-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { replyToConversation, setConversationStatus } from "@/server/actions/admin-support";
import { requireStaffPage } from "@/lib/authz";
import { chatImageUrl } from "@/server/chat";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const convo = await db.chatConversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        omit: { imageData: true },
        include: { agent: { select: { name: true } } },
      },
    },
  });
  if (!convo) notFound();
  const next = convo.status === "OPEN" ? "CLOSED" : "OPEN";

  return (
    <>
      <Link href="/admin/messages" className="text-sm text-muted hover:text-navy-900 hover:underline">← Chat</Link>
      <AdminPageTitle
        title="Conversation"
        description={`Started ${convo.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC · ${convo.status.toLowerCase()}`}
        actions={
          <form action={setConversationStatus.bind(null, convo.id, next)}>
            <Button type="submit" variant="secondary" size="sm">{next === "CLOSED" ? "Close conversation" : "Reopen"}</Button>
          </form>
        }
      />
      <Card className="max-w-3xl">
        <ol className="space-y-3 bg-surface p-4">
          {convo.messages.map((m) => {
            const agent = m.sender === "AGENT";
            return (
              <li key={m.id} className={cn("flex flex-col", agent ? "items-end" : "items-start")}>
                <p className="mb-0.5 px-1 text-xs font-semibold text-muted">
                  {agent ? `${siteConfig.chatAgentName}${m.agent ? ` (${m.agent.name})` : ""}` : "Visitor"}
                </p>
                {m.imageType && (
                  <a href={chatImageUrl(m.id)} target="_blank" rel="noopener" className="mb-1 block max-w-[85%]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private, session-authenticated image */}
                    <img src={chatImageUrl(m.id)} alt="Photo" loading="lazy" className="max-h-72 rounded-2xl border border-line object-cover" />
                  </a>
                )}
                {m.body && (
                  <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words", agent ? "bg-navy-700 text-white" : "border border-line bg-white")}>
                    {m.body}
                  </div>
                )}
                <time className="mt-0.5 px-1 text-xs text-muted" dateTime={m.createdAt.toISOString()}>
                  {m.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </time>
              </li>
            );
          })}
        </ol>
        <ReplyForm action={replyToConversation.bind(null, convo.id)} agentName={siteConfig.chatAgentName} />
      </Card>
    </>
  );
}
