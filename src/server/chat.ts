import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const CHAT_COOKIE = "support_chat";

export function newVisitorToken() {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type ChatMessageDTO = { id: string; sender: "VISITOR" | "AGENT"; body: string; imageUrl: string | null; createdAt: string };

export type ChatImage = { data: Buffer<ArrayBuffer>; type: string };

const IMAGE_SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

/** Decodes a photo data URL. Returns null unless the bytes really are a JPEG, PNG or WebP within the size limit. */
export function decodeChatImage(dataUrl: string, maxBytes: number): ChatImage | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const [, type, base64] = match;
  const data = Buffer.from(base64!, "base64");
  if (data.length === 0 || data.length > maxBytes || !IMAGE_SIGNATURES[type!]!(data)) return null;
  return { data, type: type! };
}

export const chatImageUrl = (messageId: string) => `/api/chat/image/${messageId}`;

/** Preview text for a message that may be only a photo. */
export const chatPreview = (m: { body: string; imageType?: string | null }) => m.body || (m.imageType ? "📷 Photo" : "");
