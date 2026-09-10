"use client";

import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";

const Canvas = lazy(async () => {
  const mod = await import("./membership-card-3d-canvas");
  return { default: mod.MembershipCard3DCanvas };
});

type StageState = "pending" | "ready" | "skipped" | "error";

function probeWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

async function loadCardPngUrl(credentialId: string, locale: "ar" | "en") {
  const url = `/api/credentials/${encodeURIComponent(credentialId)}/export/png?locale=${locale}&embed=1`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`card png ${response.status}`);
  }
  const blob = await response.blob();
  if (blob.size < 1_000) {
    throw new Error("card png empty");
  }
  return URL.createObjectURL(blob);
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : "webgl-render");
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function MembershipCard3D({
  credentialId,
  locale,
  ariaLabel,
  hint,
  flipLabel,
}: {
  credentialId: string;
  locale: "ar" | "en";
  ariaLabel: string;
  hint: string;
  flipLabel: string;
}) {
  const [state, setState] = useState<StageState>("pending");
  const [reason, setReason] = useState("");
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");
    let cancelled = false;
    let objectUrl: string | null = null;

    const fail = (next: StageState, nextReason: string) => {
      if (cancelled) return;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      setPngUrl(null);
      setState(next);
      setReason(nextReason);
    };

    const load = () => {
      if (cancelled) return;
      if (reduced.matches) {
        fail("skipped", "reduced-motion");
        return;
      }
      if (narrow.matches) {
        fail("skipped", "narrow-viewport");
        return;
      }
      if (!probeWebGl()) {
        fail("error", "webgl-unavailable");
        return;
      }
      setState("pending");
      setReason("png-loading");
      void loadCardPngUrl(credentialId, locale)
        .then((nextUrl) => {
          if (cancelled) {
            URL.revokeObjectURL(nextUrl);
            return;
          }
          objectUrl = nextUrl;
          setPngUrl(nextUrl);
          setReason("webgl-init");
        })
        .catch((error: unknown) => {
          fail("error", error instanceof Error ? error.message : "card png");
        });
    };

    load();
    reduced.addEventListener("change", load);
    narrow.addEventListener("change", load);
    return () => {
      cancelled = true;
      reduced.removeEventListener("change", load);
      narrow.removeEventListener("change", load);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [credentialId, locale]);

  if (state === "skipped" || state === "error" || !pngUrl) {
    return (
      <div
        className="sr-only"
        data-testid="membership-card-3d-root"
        data-3d-state={state}
        data-3d-reason={reason}
      />
    );
  }

  return (
    <div
      className="membership-card-3d mx-auto w-full max-w-xl"
      data-testid="membership-card-3d-root"
      data-3d-state={state}
      data-3d-reason={reason}
      data-flipped={flipped ? "true" : "false"}
    >
      <p className="mb-3 text-center text-sm text-muted">{hint}</p>
      <div
        className="relative w-full"
        style={{ minHeight: "20rem", height: "20rem" }}
        role="img"
        aria-label={ariaLabel}
        data-testid="membership-card-3d"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientY - rect.top - rect.height / 2) / rect.height;
          const y = (event.clientX - rect.left - rect.width / 2) / rect.width;
          setTilt({ x: x * 0.18, y: y * 0.28 });
        }}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <CanvasErrorBoundary
          onError={(message) => {
            setState("error");
            setReason(message);
            setPngUrl(null);
          }}
        >
          <Suspense fallback={null}>
            <Canvas
              pngUrl={pngUrl}
              flipped={flipped}
              tilt={tilt}
              onReady={() => {
                setState("ready");
                setReason("");
              }}
              onError={(message) => {
                setState("error");
                setReason(message);
                setPngUrl(null);
              }}
            />
          </Suspense>
        </CanvasErrorBoundary>
      </div>
      <button
        type="button"
        className="mx-auto mt-3 block min-h-11 border border-line px-4 text-sm text-ink"
        data-testid="membership-card-3d-flip"
        onClick={() => setFlipped((value) => !value)}
      >
        {flipLabel}
      </button>
    </div>
  );
}
