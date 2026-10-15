"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/card";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex-1">
      <Container className="py-20 text-center">
        <h1 className="text-3xl font-bold text-navy-900">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">An unexpected error occurred. Please try again.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-navy-700 px-4 font-semibold text-white hover:bg-navy-800"
          >
            <RefreshCw className="size-4" aria-hidden /> Try again
          </button>
          <Link href="/" className="inline-flex h-11 items-center rounded-md border border-line-strong px-4 font-semibold text-navy-900 hover:bg-navy-50">
            Go home
          </Link>
        </div>
      </Container>
    </main>
  );
}
