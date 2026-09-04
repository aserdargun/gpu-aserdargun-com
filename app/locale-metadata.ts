import type { Metadata } from "next";
import type { Locale } from "./i18n";

export const metadataCopy = {
  tr: {
    title: "GPU - GPU Kernel Engineering",
    description: "CUDA, Triton, GPU belleği, kernel işleçleri, profilleme, çıkarım ve çoklu GPU sistemleri için birleşik 12 haftalık etkileşimli öğrenme atlası.",
    socialDescription: "12 atlas · 12 hafta · Tek öğrenme sistemi",
    image: "/og.png",
    imageAlt: "GPU - GPU Kernel Engineering",
    openGraphLocale: "tr_TR",
    alternateLocale: "en_US",
    canonical: "/",
  },
  en: {
    title: "GPU - GPU Kernel Engineering",
    description: "A unified 12-week interactive learning atlas for CUDA, Triton, GPU memory, kernel operators, profiling, inference, and multi-GPU systems.",
    socialDescription: "12 atlases · 12 weeks · One learning system",
    image: "/og-en.png",
    imageAlt: "GPU - GPU Kernel Engineering",
    openGraphLocale: "en_US",
    alternateLocale: "tr_TR",
    canonical: "/en/",
  },
} as const;

const productionBase = new URL("https://gpu.aserdargun.com");

export function metadataForLocale(locale: Locale): Metadata {
  const copy = metadataCopy[locale];
  return {
    metadataBase: productionBase,
    title: copy.title,
    description: copy.description,
    icons: { icon: "/favicon.svg" },
    alternates: {
      canonical: copy.canonical,
      languages: { "tr-TR": "/", "en-US": "/en/" },
    },
    openGraph: {
      title: copy.title,
      description: copy.socialDescription,
      type: "website",
      locale: copy.openGraphLocale,
      alternateLocale: [copy.alternateLocale],
      images: [{ url: copy.image, width: 1731, height: 909, alt: copy.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.socialDescription,
      images: [copy.image],
    },
  };
}
