import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const image = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title: "Kernel Atlas — GPU Kernel Engineering",
    description: "CUDA, Triton, GPU bellek, kernel operatörleri, profiling, inference ve multi-GPU sistemleri için birleşik 12 haftalık etkileşimli öğrenme atlası.",
    openGraph: {
      title: "Kernel Atlas — GPU Kernel Engineering",
      description: "11 atlas · 12 hafta · Tek öğrenme sistemi",
      type: "website",
      images: [{ url: image, width: 1731, height: 909, alt: "Kernel Atlas GPU Kernel Engineering" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Kernel Atlas — GPU Kernel Engineering",
      description: "11 atlas · 12 hafta · Tek öğrenme sistemi",
      images: [image],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
