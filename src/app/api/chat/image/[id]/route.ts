import { NextResponse, type NextRequest } from "next/server";
import { getStaffUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { CHAT_COOKIE, hashVisitorToken } from "@/server/chat";

export const dynamic = "force-dynamic";

/** A chat photo, visible only to the visitor who owns the conversation and to staff. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await db.chatMessage.findUnique({
    where: { id },
    select: { imageData: true, imageType: true, conversation: { select: { visitorTokenHash: true } } },
  });
  if (!message?.imageData || !message.imageType) return new NextResponse(null, { status: 404 });

  const token = req.cookies.get(CHAT_COOKIE)?.value;
  const isOwner = !!token && hashVisitorToken(token) === message.conversation.visitorTokenHash;
  if (!isOwner && !(await getStaffUser())) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(message.imageData), {
    headers: {
      "Content-Type": message.imageType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
