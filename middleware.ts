import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Match all request paths except Next.js internals, API, and static files
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
