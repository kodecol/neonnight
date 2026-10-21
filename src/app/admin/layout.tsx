import type { Metadata } from "next";
import { getContainer } from "@/infrastructure/container";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getContainer().content.get();
  return { title: { default: "Admin", template: `%s — Admin ${brand.name}` }, robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
