"use client";

import { useState } from "react";
import { Button } from "./button";

export function PreviewModal({
  openLabel,
  title,
  body,
  closeLabel,
}: {
  openLabel: string;
  title: string;
  body: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {openLabel}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy/20 p-6"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
            className="w-full max-w-md border border-line bg-surface p-8 shadow-[var(--shadow-overlay)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="preview-modal-title" className="text-xl text-ink">
              {title}
            </h3>
            <p className="mt-4 text-graphite">{body}</p>
            <div className="mt-8 flex justify-end">
              <Button type="button" variant="primary" onClick={() => setOpen(false)}>
                {closeLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
