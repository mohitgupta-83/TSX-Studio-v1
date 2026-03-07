import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    // If auth returns a response (like redirect), modify that response instead of losing it.
    let response = NextResponse.next();
    const ref = req.nextUrl.searchParams.get("ref");
    if (ref) {
        response.cookies.set("referralCode", ref, { maxAge: 60 * 60 * 24 * 7, path: "/" });
    }
    return response;
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
