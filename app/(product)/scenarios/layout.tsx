import { toolMetadata } from "@/lib/seo/tool-seo";

export const metadata = toolMetadata("/scenarios");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
