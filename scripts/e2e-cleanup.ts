/** Removes only data created by the e2e suite (E2E-prefixed shipments, [e2e]-tagged messages). */
import "./load-env";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 15_000 } });
async function main() {
  const shipments = await db.shipment.deleteMany({ where: { trackingNumber: { startsWith: "E2E" }, isDemo: false } });
  const convos = await db.chatConversation.deleteMany({
    where: { messages: { some: { body: { startsWith: "[e2e]" } } }, NOT: { messages: { some: { sender: "VISITOR", NOT: { body: { startsWith: "[e2e]" } } } } } },
  });
  const inquiries = await db.contactInquiry.deleteMany({ where: { email: "e2e@example.test" } });
  const requests = await db.serviceRequest.deleteMany({ where: { email: "e2e@example.test" } });
  const email = process.env.E2E_ADMIN_EMAIL;
  let users = 0;
  if (email?.endsWith("@example.test")) users = (await db.user.deleteMany({ where: { email } })).count;
  console.log(`✓ removed ${shipments.count} shipments, ${convos.count} chats, ${inquiries.count} inquiries, ${requests.count} service requests, ${users} e2e users`);
}
main().finally(() => db.$disconnect());
