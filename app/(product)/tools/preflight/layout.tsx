import { toolMetadata } from "@/lib/seo/tool-seo";

export const metadata = toolMetadata("/tools/preflight");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
