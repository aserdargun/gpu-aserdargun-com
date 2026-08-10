import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-kernel-atlas-locale") === "en" ? "en" : "tr";
  return <html lang={locale}><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
