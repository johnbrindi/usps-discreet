import { Card, Skeleton } from "@/components/ui/card";

/**
 * Shown the instant an admin link is clicked, while the page's live data loads. Without it the
 * previous page stays on screen until the server answers, which reads as an unresponsive click.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">Loading…</p>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card className="space-y-4 p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
          <Skeleton className="h-11 w-full" />
        </Card>
        <Card className="space-y-4 p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
