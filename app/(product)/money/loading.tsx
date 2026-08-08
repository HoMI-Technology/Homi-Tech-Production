import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { PageFrame } from "@/components/operate/PageFrame";

export default function MoneyLoading() {
  return (
    <PageFrame width="content" density="spacious" role="personal">
      <ProductLoadingSkeleton label="Loading money" rows={4} />
    </PageFrame>
  );
}
