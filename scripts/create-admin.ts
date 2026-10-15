/**
 * Creates (or resets the password of) a staff account. Usage:
 *   npm run admin:create -- --email you@company.com --name "Your Name" [--role admin|staff]
 * The password is read from a hidden prompt or from the ADMIN_PASSWORD env var — never from argv.
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) throw new Error("No TTY: set ADMIN_PASSWORD in the environment instead.");
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        reject(new Error("Cancelled"));
      } else if (ch === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Administrator";
  const role = arg("role") === "staff" ? "staff" : "admin";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Pass a valid --email");

  const password = process.env.ADMIN_PASSWORD || (await promptHidden("Password (min 12 chars): "));
  if (password.length < 12) throw new Error("Password must be at least 12 characters");

  const db = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 15_000 } });
  try {
    const hash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      const userId = existing?.id ?? randomUUID();
      if (!existing) {
        await tx.user.create({ data: { id: userId, email, name, role, emailVerified: true } });
      } else {
        await tx.user.update({ where: { id: userId }, data: { role } });
      }
      const account = await tx.account.findFirst({ where: { userId, providerId: "credential" } });
      if (account) await tx.account.update({ where: { id: account.id }, data: { password: hash } });
      else await tx.account.create({ data: { id: randomUUID(), userId, accountId: userId, providerId: "credential", password: hash } });
      await tx.auditLog.create({
        data: { actorId: null, action: existing ? "user.password_reset_cli" : "user.create_cli", entityType: "user", entityId: userId },
      });
      console.log(`✓ ${existing ? "Updated" : "Created"} ${role} account for ${email}`);
    });
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
