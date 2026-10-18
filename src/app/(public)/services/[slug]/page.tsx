import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/card";
import { allServices, getService, serviceHref } from "@/config/services";
import { siteConfig } from "@/config/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return { title: `${service.title} | ${siteConfig.name}`, description: service.summary };
}

function ServiceCard({ slug }: { slug: string }) {
  const s = getService(slug);
  if (!s) return null;
  return (
    <Link
      href={serviceHref(s.slug)}
      className="flex items-start gap-4 rounded border border-line bg-white p-4 transition-colors hover:border-usps-blue hover:bg-[#e8eef7]"
    >
      {s.icon ? (
        <Image src={s.icon} alt="" width={40} height={40} aria-hidden className="mt-0.5 h-10 w-10 shrink-0 object-contain" />
      ) : null}
      <span className="min-w-0">
        <span className="block font-bold text-usps-blue">{s.title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-muted">{s.summary}</span>
      </span>
    </Link>
  );
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const list = service.children ?? service.related;
  const listTitle = service.children ? "Available services" : "Related services";

  return (
    <>
      <section className="bg-[#003875] text-white">
        <Container className="flex items-center gap-4 px-4 py-8 sm:py-10">
          {service.icon ? (
            <span className="hidden size-16 shrink-0 items-center justify-center rounded bg-white sm:flex">
              <Image src={service.icon} alt="" width={40} height={40} aria-hidden className="h-10 w-10 object-contain" />
            </span>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{service.title}</h1>
            <p className="mt-1 text-sm text-white/85 sm:text-base">{service.summary}</p>
          </div>
        </Container>
      </section>

      <Container className="px-4 py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span> {service.title}
        </nav>

        {service.sections?.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {service.sections.map((sec) => (
              <section key={sec.heading}>
                <h2 className="text-lg font-bold text-ink">{sec.heading}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{sec.body}</p>
              </section>
            ))}
          </div>
        ) : null}

        {service.cta ? (
          <Link
            href={service.cta.href}
            className="mt-8 inline-flex h-11 items-center justify-center rounded bg-usps-blue px-6 text-sm font-bold text-white transition-colors hover:bg-usps-blue-dark"
          >
            {service.cta.label}
          </Link>
        ) : null}

        {list?.length ? (
          <section className="mt-10" aria-labelledby="svc-list">
            <h2 id="svc-list" className="mb-4 text-lg font-bold text-ink">{listTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <ServiceCard key={s} slug={s} />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}
