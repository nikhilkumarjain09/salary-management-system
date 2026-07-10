import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = nextUrl.pathname.startsWith("/app");

      if (isAppRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to /login
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/app", nextUrl));
      }
      return true;
    },
  },
  providers: [], // Providers array is defined in auth.ts
} satisfies NextAuthConfig;
