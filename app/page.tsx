import { headers } from "next/headers";
import KernelAtlas from "./kernel-atlas";
import type { Locale } from "./i18n";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeLocale(value: string | string[] | undefined, fallback: Locale): Locale {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "tr" || candidate === "en" ? candidate : fallback;
}

async function resolveLocale(searchParams: PageProps["searchParams"]): Promise<Locale> {
  const params = await searchParams;
  const requestHeaders = await headers();
  return normalizeLocale(params.lang, normalizeLocale(requestHeaders.get("x-kernel-atlas-locale") ?? undefined, "tr"));
}

export default async function Home({ searchParams }: PageProps) {
  return <KernelAtlas initialLocale={await resolveLocale(searchParams)} />;
}
