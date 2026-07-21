import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <ThresholdCompass size={180} className="compass-float" />
        <h1 className="mt-8 text-4xl font-black text-light">{t("title")}</h1>
        <p className="mt-3 max-w-md text-dim">
          {t("body")}
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          {t("cta")}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
