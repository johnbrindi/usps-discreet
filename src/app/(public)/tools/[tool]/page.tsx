import { Clock3, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceRequestForm } from "@/components/forms/service-request-form";
import { ToolIconBadge } from "@/components/tools/tool-icon";
import { Card, Container } from "@/components/ui/card";
import { TOOLS, toolBySlug } from "@/config/service-requests";
import { siteConfig } from "@/config/site";
import { describeSupportHours } from "@/lib/support-hours";

type Props = { params: Promise<{ tool: string }>; searchParams: Promise<{ tn?: string }> };

// Only the defined tools exist; anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = toolBySlug((await params).tool);
  return tool ? { title: tool.title, description: tool.summary } : {};
}

export default async function ToolPage({ params, searchParams }: Props) {
  const tool = toolBySlug((await params).tool);
  if (!tool) notFound();
  const { tn } = await searchParams;

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="hover:text-navy-900 hover:underline">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/tools" className="hover:text-navy-900 hover:underline">Quick tools</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">{tool.label}</li>
            </ol>
          </nav>
          <div className="flex items-start gap-4">
            <ToolIconBadge icon={tool.icon} className="hidden size-14 rounded-lg border border-line bg-white sm:flex" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{tool.title}</h1>
              <p className="mt-2 max-w-2xl text-lg leading-8 text-muted">{tool.summary}</p>
            </div>
          </div>
        </Container>
      </div>
      <Container className="grid gap-8 py-10 sm:py-12 lg:grid-cols-[1fr_18rem]">
        <Card className="p-5 sm:p-8">
          <ServiceRequestForm slug={tool.slug} defaultTrackingNumber={typeof tn === "string" ? tn.slice(0, 40) : ""} />
        </Card>
        <aside className="space-y-4 text-sm leading-6">
          <Card className="p-5">
            <h2 className="font-semibold text-navy-900">What happens next</h2>
            <p className="mt-1 text-muted">{tool.nextSteps}</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900">
              <Clock3 className="size-4" aria-hidden /> Support hours
            </h2>
            <p className="mt-1 text-muted">{describeSupportHours()}</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900">
              <Mail className="size-4" aria-hidden /> Questions?
            </h2>
            <p className="mt-1 text-muted">
              Email{" "}
              <a href={`mailto:${siteConfig.supportEmail}`} className="font-medium break-all text-navy-700 underline underline-offset-2">
                {siteConfig.supportEmail}
              </a>{" "}
              or <Link href="/contact" className="font-medium text-navy-700 underline underline-offset-2">send a message</Link>.
            </p>
          </Card>
        </aside>
      </Container>
    </>
  );
}
