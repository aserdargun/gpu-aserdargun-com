import { type NextRequest, NextResponse } from "next/server";

type Locale = "tr" | "en";

function isLocale(value: string | undefined | null): value is Locale {
  return value === "tr" || value === "en";
}

function resolveLocale(request: NextRequest): Locale {
  if (request.nextUrl.pathname === "/en" || request.nextUrl.pathname.startsWith("/en/")) return "en";

  // Query locales remain a dynamic-worker compatibility bridge. The path is the
  // production/static locale contract, so an unqualified root is always Turkish.
  const requested = request.nextUrl.searchParams.get("lang");
  if (isLocale(requested)) return requested;
  return "tr";
}

export function proxy(request: NextRequest) {
  const locale = resolveLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-kernel-atlas-locale", locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Language", locale === "tr" ? "tr-TR" : "en-US");

  const requested = request.nextUrl.searchParams.get("lang");
  if (isLocale(requested)) {
    response.cookies.set("kernel-atlas-language", locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

export const config = { matcher: ["/", "/en/:path*"] };
