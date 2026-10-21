import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ReplyForm } from "@/components/admin/reply-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { ChatBubble, DaySeparator } from "@/components/chat/chat-bubble";
import { dayLabel, startsRun } from "@/lib/chat-format";
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
        <ol className="bg-surface px-3 pt-1 pb-4 sm:px-4">
          {convo.messages.map((m, i) => {
            const agent = m.sender === "AGENT";
            const at = m.createdAt.toISOString();
            const prev = convo.messages[i - 1];
            const prevAt = prev?.createdAt.toISOString();
            const newRun = startsRun({ sender: m.sender, createdAt: at }, prev && { sender: prev.sender, createdAt: prevAt! });
            return (
              <li key={m.id}>
                {(!prevAt || dayLabel(prevAt) !== dayLabel(at)) && <DaySeparator label={dayLabel(at)} />}
                <ChatBubble
                  mine={agent}
                  body={m.body}
                  imageUrl={m.imageType ? chatImageUrl(m.id) : null}
                  time={`${at.slice(11, 16)} UTC`}
                  dateTime={at}
                  author={newRun ? (agent ? `${siteConfig.chatAgentName}${m.agent ? ` (${m.agent.name})` : ""}` : "Visitor") : undefined}
                  tail={newRun}
                />
              </li>
            );
          })}
        </ol>
        <ReplyForm action={replyToConversation.bind(null, convo.id)} agentName={siteConfig.chatAgentName} />
      </Card>
    </>
  );
}
