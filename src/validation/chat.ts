import { z } from "zod";

export const chatMessageSchema = z.object({
  body: z.string().trim().min(1, "Type a message.").max(2000, "Messages are limited to 2,000 characters."),
});
