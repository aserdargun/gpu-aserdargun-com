import type { Metadata } from "next";
import KernelAtlas from "./kernel-atlas";
import type { Locale } from "./i18n";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const metadataCopy = {
  tr: {
    title: "GPU - GPU Kernel Engineering",
    description: "CUDA, Triton, GPU belleği, kernel işleçleri, profilleme, çıkarım ve çoklu GPU sistemleri için birleşik 12 haftalık etkileşimli öğrenme atlası.",
    socialDescription: "12 atlas · 12 hafta · Tek öğrenme sistemi",
    image: "/og.png",
    imageAlt: "GPU - GPU Kernel Engineering",
    openGraphLocale: "tr_TR",
    alternateLocale: "en_US",
  },
  en: {
    title: "GPU - GPU Kernel Engineering",
    description: "A unified 12-week interactive learning atlas for CUDA, Triton, GPU memory, kernel operators, profiling, inference, and multi-GPU systems.",
    socialDescription: "12 atlases · 12 weeks · One learning system",
    image: "/og-en.png",
    imageAlt: "GPU - GPU Kernel Engineering",
    openGraphLocale: "en_US",
    alternateLocale: "tr_TR",
  },
} as const;

function normalizeLocale(value: string | string[] | undefined, fallback: Locale): Locale {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "tr" || candidate === "en" ? candidate : fallback;
}

async function resolveLocale(searchParams: PageProps["searchParams"]): Promise<Locale> {
  const params = await searchParams;
  return normalizeLocale(params.lang, "tr");
}

const productionBase = new URL("https://gpu.aserdargun.com");
const defaultMetadata = metadataCopy.tr;

export const metadata: Metadata = {
  metadataBase: productionBase,
  title: defaultMetadata.title,
  description: defaultMetadata.description,
  icons: { icon: "/favicon.svg" },
  alternates: {
    canonical: "/?lang=tr",
    languages: { "tr-TR": "/?lang=tr", "en-US": "/?lang=en" },
  },
  openGraph: {
    title: defaultMetadata.title,
    description: defaultMetadata.socialDescription,
    type: "website",
    locale: defaultMetadata.openGraphLocale,
    alternateLocale: [defaultMetadata.alternateLocale],
    images: [{ url: defaultMetadata.image, width: 1731, height: 909, alt: defaultMetadata.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultMetadata.title,
    description: defaultMetadata.socialDescription,
    images: [defaultMetadata.image],
  },
};

export default async function Home({ searchParams }: PageProps) {
  return <KernelAtlas initialLocale={await resolveLocale(searchParams)} />;
}
