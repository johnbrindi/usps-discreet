import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-line bg-white shadow-card", className)} {...props} />;
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-navy-100/70", className)} />;
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="border-b border-line bg-surface">
      <Container className="py-10 sm:py-12">
        {eyebrow && <p className="mb-2 text-sm font-semibold tracking-wide text-navy-600 uppercase">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">{intro}</p>}
      </Container>
    </div>
  );
}
