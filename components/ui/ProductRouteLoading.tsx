import { Skeleton } from "@/components/ui/Skeleton";

/** Shared route-level loading shell for product `loading.tsx` files. */
export function ProductRouteLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12" aria-busy="true" aria-label={label}>
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 glass space-y-4 p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-3 w-full max-w-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
