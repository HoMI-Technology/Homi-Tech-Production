import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CompanionWidget } from "@/components/companion/CompanionWidget";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="pt-[72px] min-h-screen">{children}</main>
      <SiteFooter />
      <CompanionWidget />
    </>
  );
}
