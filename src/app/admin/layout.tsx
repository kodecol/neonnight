import type { Metadata } from "next";
import { container } from "@/app/_lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await (await container()).content.get();
  return { title: { default: "Admin", template: `%s — Admin ${brand.name}` }, robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
