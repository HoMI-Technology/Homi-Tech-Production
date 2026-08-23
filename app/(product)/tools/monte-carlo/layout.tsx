import { toolMetadata } from "@/lib/seo/tool-seo";

export const metadata = toolMetadata("/tools/monte-carlo");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
