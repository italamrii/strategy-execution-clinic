"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function AdminSearchForm({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("adminDashboard");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  return (
    <form
      className="mt-8 flex flex-wrap gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/admin?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <label className="sr-only" htmlFor="admin-search">
        {t("searchLabel")}
      </label>
      <input
        id="admin-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="min-w-[16rem] flex-1 border border-line p-2 text-sm"
      />
      <button type="submit" className="border border-navy bg-navy px-4 py-2 text-sm text-surface">
        {t("search")}
      </button>
    </form>
  );
}
