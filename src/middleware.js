import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const hasValidToken = !!(token && token !== "undefined" && token !== "");

  const isAuthPath =
    pathname === "/authenticate/sign-up" ||
    pathname === "/authenticate/sign-in" ||
    pathname === "/authenticate/forgot-passward" ||
    pathname.startsWith("/authenticate/reset-passward");

  const isProtectedPath =
    pathname.startsWith("/creator-dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/history") ||
    pathname === "/become-creator";

  // If accessing protected routes without login, redirect to sign-in
  if (isProtectedPath && !hasValidToken) {
    const signInUrl = new URL("/authenticate/sign-in", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If already authenticated, redirect away from auth pages to home feed
  if (isAuthPath && hasValidToken) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/authenticate/:path*",
    "/creator-dashboard/:path*",
    "/settings/:path*",
    "/messages/:path*",
    "/history/:path*",
    "/become-creator",
  ],
};