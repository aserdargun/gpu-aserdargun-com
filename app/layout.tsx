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
import "./visual-foundations.css";
import "./concept-studio.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
