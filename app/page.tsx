import type { Metadata } from "next";
import { headers } from "next/headers";
import KernelAtlas from "./kernel-atlas";
import type { Locale } from "./i18n";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const metadataCopy = {
  tr: {
    title: "GPU Kernel Atlas — GPU Kernel Mühendisliği",
    description: "CUDA, Triton, GPU belleği, kernel işleçleri, profilleme, çıkarım ve çoklu GPU sistemleri için birleşik 12 haftalık etkileşimli öğrenme atlası.",
    socialDescription: "11 atlas · 12 hafta · Tek öğrenme sistemi",
    image: "/og.png",
    imageAlt: "GPU Kernel Atlas — GPU Kernel Mühendisliği",
    openGraphLocale: "tr_TR",
    alternateLocale: "en_US",
  },
  en: {
    title: "GPU Kernel Atlas — GPU Kernel Engineering",
    description: "A unified 12-week interactive learning atlas for CUDA, Triton, GPU memory, kernel operators, profiling, inference, and multi-GPU systems.",
    socialDescription: "11 atlases · 12 weeks · One learning system",
    image: "/og-en.png",
    imageAlt: "GPU Kernel Atlas — GPU Kernel Engineering",
    openGraphLocale: "en_US",
    alternateLocale: "tr_TR",
  },
} as const;

function normalizeLocale(value: string | string[] | undefined, fallback: Locale): Locale {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "tr" || candidate === "en" ? candidate : fallback;
}

async function resolveLocale(searchParams: PageProps["searchParams"]): Promise<Locale> {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  const hintedLocale = requestHeaders.get("x-kernel-atlas-locale") === "en" ? "en" : "tr";
  return normalizeLocale(params.lang, hintedLocale);
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [locale, requestHeaders] = await Promise.all([resolveLocale(searchParams), headers()]);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const copy = metadataCopy[locale];
  const image = new URL(copy.image, base).toString();

  return {
    metadataBase: base,
    title: copy.title,
    description: copy.description,
    icons: { icon: "/favicon.svg" },
    alternates: {
      canonical: `/?lang=${locale}`,
      languages: { "tr-TR": "/?lang=tr", "en-US": "/?lang=en" },
    },
    openGraph: {
      title: copy.title,
      description: copy.socialDescription,
      type: "website",
      locale: copy.openGraphLocale,
      alternateLocale: [copy.alternateLocale],
      images: [{ url: image, width: 1731, height: 909, alt: copy.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.socialDescription,
      images: [image],
    },
  };
}

export default async function Home({ searchParams }: PageProps) {
  return <KernelAtlas initialLocale={await resolveLocale(searchParams)} />;
}
