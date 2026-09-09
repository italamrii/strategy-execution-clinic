import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { getClerkPublishableKey } from "@/shared/config/auth-provider";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Publishable key is inlined at build time (Railway ARG). Gate on that alone so
  // ClerkProvider is present in the production bundle even when CLERK_SECRET_KEY
  // is only available at runtime.
  const publishableKey = getClerkPublishableKey();
  if (!publishableKey) {
    return children;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
