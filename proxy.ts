import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * The root route only ever redirects to /catalog or /login — it has no
 * content of its own. Doing that redirect here, instead of in
 * app/page.tsx, means visitors to "/" get redirected before Next.js
 * instantiates the layout/page render pipeline at all, rather than paying
 * for a full server component render just to immediately throw it away.
 * (This is Next's "proxy" convention — the renamed successor to
 * middleware.ts.)
 */
export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const destination = token ? "/catalog" : "/login";
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: "/",
};
