import { headers } from "next/headers";
import "./globals.css";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-kernel-atlas-locale") === "en" ? "en" : "tr";
  return <html lang={locale}><body>{children}</body></html>;
}
