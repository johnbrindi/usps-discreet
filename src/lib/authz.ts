import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const STAFF_ROLES = new Set(["admin", "staff"]);

export type StaffUser = { id: string; name: string; email: string; role: string };

export async function getStaffUser(): Promise<StaffUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as (StaffUser & Record<string, unknown>) | undefined;
  if (!user || !STAFF_ROLES.has(user.role)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** For admin pages: redirects anonymous visitors to the login page. */
export async function requireStaffPage() {
  const user = await getStaffUser();
  if (!user) redirect("/admin/login");
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** For server actions & route handlers: every mutation re-checks the session server-side. */
export async function requireStaff() {
  const user = await getStaffUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
