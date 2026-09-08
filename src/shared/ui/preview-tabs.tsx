"use client";

import { useState } from "react";

export function PreviewTabs({
  tabs,
}: {
  tabs: { id: string; label: string; panel: string }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" className="flex gap-6 border-b border-line">
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`min-h-11 text-sm ${selected ? "border-b-2 border-gold text-navy" : "text-graphite"}`}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <p role="tabpanel" className="pt-4 text-graphite">
        {current.panel}
      </p>
    </div>
  );
}
