import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "coop_session";

function getSecret() {
  const raw =
    process.env.AUTH_SECRET ??
    "coopfleet-development-secret-change-before-production";
  return new TextEncoder().encode(raw);
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!token) {
    if (isLoginPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, getSecret());
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  } catch {
    if (isLoginPage) {
      return NextResponse.next();
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/maintenance/:path*",
    "/oil/:path*",
    "/finance/:path*",
    "/inventory/:path*",
    "/service-motorcycles/:path*",
    "/suppliers/:path*",
    "/fuel/:path*",
    "/reports/:path*",
    "/logs/:path*",
    "/settings/:path*",
    "/attachments/:path*",
    "/trash/:path*",
    "/login",
  ],
};
