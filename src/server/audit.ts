import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function audit(
  tx: Tx,
  entry: { actorId: string; action: string; entityType: string; entityId: string; details?: Prisma.InputJsonValue },
) {
  return tx.auditLog.create({ data: entry });
}
