import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isDesignPreviewAllowed } from "@/shared/security/route-policy";

export default function DesignPreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isDesignPreviewAllowed()) {
    notFound();
  }
  return children;
}
