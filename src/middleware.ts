// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Already has a guest cookie? Do nothing.
  if (req.cookies.get("guest_id")) return res;

  // Generate a new guest id (Edge runtime has crypto.randomUUID)
  const gid = crypto.randomUUID();

  // Only mark Secure when the request is HTTPS (true on Vercel, false on localhost)
  const isHttps = req.nextUrl.protocol === "https:";

  res.cookies.set({
    name: "guest_id",
    value: gid,
    httpOnly: true,          // JS can't read/modify it
    secure: isHttps,         // only send over HTTPS
    sameSite: "strict",      // not sent cross-site
    path: "/",               // send to all paths
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return res;
}

// Exclude static assets and Next internals so we don't run unnecessarily
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/).*)",
  ],
};
