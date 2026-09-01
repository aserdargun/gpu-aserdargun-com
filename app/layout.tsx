import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { metadataCopy } from "./locale-metadata";
import "./globals.css";
import "./atlas/atlas-shell.css";
import "./kernel-forge.css";
import "./cuda-simt.css";
import "./gpu-memory.css";
import "./pytorch-triton.css";
import "./llm-kernel-patterns.css";
import "./kernel-safety.css";
import "./nsight-benchmark.css";
import "./cutlass-cute.css";
import "./inference-systems.css";
import "./nccl-multigpu.css";
import "./gpu-software-stack.css";
import "./visual-foundations.css";
import "./concept-studio.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-kernel-atlas-locale") === "en" ? "en" : "tr";
  const copy = metadataCopy[locale];
  const canonical = `https://gpu.aserdargun.com${copy.canonical}`;
  const image = `https://gpu.aserdargun.com${copy.image}`;
  return (
    <html lang={locale}>
      <head>
        <title>{copy.title}</title>
        <meta name="description" content={copy.description} />
        <meta property="og:title" content={copy.title} />
        <meta property="og:description" content={copy.socialDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={copy.openGraphLocale} />
        <meta property="og:locale:alternate" content={copy.alternateLocale} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="1731" />
        <meta property="og:image:height" content="909" />
        <meta property="og:image:alt" content={copy.imageAlt} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={copy.title} />
        <meta name="twitter:description" content={copy.socialDescription} />
        <meta name="twitter:image" content={image} />
        <link rel="icon" href="/favicon.svg" />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="tr-TR" href="https://gpu.aserdargun.com/" />
        <link rel="alternate" hrefLang="en-US" href="https://gpu.aserdargun.com/en/" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
