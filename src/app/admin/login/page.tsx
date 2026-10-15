import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { LogoMark } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getStaffUser } from "@/lib/authz";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getStaffUser()) redirect("/admin");
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <LogoMark className="size-9" />
          <span className="text-lg font-bold text-navy-900">{siteConfig.name} · Staff</span>
        </div>
        <Card className="p-6">
          <h1 className="mb-5 text-xl font-bold text-navy-900">Sign in</h1>
          <LoginForm />
        </Card>
        <p className="mt-4 text-center text-xs text-muted">Authorized staff only. Access is logged.</p>
      </div>
    </main>
  );
}
