import { z } from "zod";

/** Photos are re-encoded in the browser first, so this is generous for a ~1600px JPEG. */
export const MAX_CHAT_IMAGE_BYTES = 1_500_000;

export const chatMessageSchema = z
  .object({
    body: z.string().trim().max(2000, "Messages are limited to 2,000 characters.").default(""),
    /** `data:image/...;base64,...` URL, decoded and checked by `decodeChatImage`. */
    image: z.string().max(Math.ceil((MAX_CHAT_IMAGE_BYTES * 4) / 3) + 64, "That photo is too large.").optional(),
  })
  .refine((d) => d.body !== "" || !!d.image, { path: ["body"], message: "Type a message." });
