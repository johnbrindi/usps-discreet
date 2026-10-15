import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/card";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Container className="py-20 text-center">
          <p className="text-sm font-semibold tracking-wide text-navy-600 uppercase">404</p>
          <h1 className="mt-2 text-3xl font-bold text-navy-900">Page not found</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/">Go home</ButtonLink>
            <ButtonLink href="/track" variant="secondary">Track a parcel</ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
