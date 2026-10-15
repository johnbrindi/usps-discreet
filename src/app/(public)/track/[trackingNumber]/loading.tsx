import { Card, Container, Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <Container className="py-8 sm:py-10" aria-busy="true">
      <p className="sr-only" role="status">Loading tracking details…</p>
      <Skeleton className="mb-6 h-4 w-56" />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="space-y-5 p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-2 w-full" />
          </Card>
          <Card className="space-y-6 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
            ))}
          </Card>
        </div>
        <Card className="h-48 p-5"><Skeleton className="h-full w-full" /></Card>
      </div>
    </Container>
  );
}
