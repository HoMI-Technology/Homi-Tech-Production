import { Skeleton } from "@/components/ui/Skeleton";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { PageFrame } from "@/components/operate/PageFrame";

export default function ConnectionsLoading() {
  return (
    <PageFrame width="focus" density="spacious" role="personal">
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <ProductLoadingSkeleton label="Loading bank connections" rows={3} />
    </PageFrame>
  );
}
