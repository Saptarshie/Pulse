import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const isPublicPath =
    pathname === "/authenticate/sign-up" ||
    pathname === "/authenticate/sign-in" ||
    pathname === "/authenticate/forgot-passward" ||
    pathname.startsWith("/authenticate/reset-passward");

  if (!isPublicPath && (!token || token === "undefined" || token === "")) {
    return NextResponse.redirect(new URL("/authenticate/sign-in", req.nextUrl));
  }

  if (isPublicPath && token) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/authenticate/:path*"],
};