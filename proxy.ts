import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "cpa_session";
const PUBLIC_PATHS = ["/login", "/confirmar", "/reunion", "/llegada"];

function esPublica(pathname: string) {
  if (pathname === "/") return false;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (esPublica(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let autenticado = false;

  if (token) {
    try {
      const secret = process.env.SESSION_SECRET;
      if (secret) {
        await jwtVerify(token, new TextEncoder().encode(secret));
        autenticado = true;
      }
    } catch {
      autenticado = false;
    }
  }

  if (!autenticado) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Íconos, manifiesto, vista previa y robots deben ser públicos (los piden navegadores y WhatsApp sin sesión).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|opengraph-image|robots.txt).*)"],
};
