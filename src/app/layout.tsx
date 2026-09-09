import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkAuthProvider } from "@/shared/config/auth-provider";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  if (!isClerkAuthProvider()) {
    return children;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
