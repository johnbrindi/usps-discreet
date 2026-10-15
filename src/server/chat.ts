import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const CHAT_COOKIE = "support_chat";

export function newVisitorToken() {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type ChatMessageDTO = { id: string; sender: "VISITOR" | "AGENT"; body: string; createdAt: string };
