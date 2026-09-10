"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import {
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type Group,
} from "three";

function CardMesh({
  texture,
  flipped,
  tilt,
}: {
  texture: Texture;
  flipped: boolean;
  tilt: { x: number; y: number };
}) {
  const group = useRef<Group>(null);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.x += (tilt.x - group.current.rotation.x) * 0.12;
    const targetY = flipped ? Math.PI + tilt.y : tilt.y;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.12;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[3.2, 2]} />
        <meshPhysicalMaterial
          map={texture}
          roughness={0.28}
          metalness={0.12}
          clearcoat={0.28}
          clearcoatRoughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0, -0.03]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[3.2, 2, 0.05]} radius={0.05} smoothness={4}>
          <meshPhysicalMaterial color="#0B1D33" roughness={0.32} metalness={0.18} />
        </RoundedBox>
      </mesh>
      <mesh position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 0.08]} />
        <meshBasicMaterial color="#C4A574" />
      </mesh>
    </group>
  );
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
  const [texture, setTexture] = useState<Texture | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl") || probe.getContext("webgl2");
    let cancelled = false;
    let loaded: Texture | null = null;

    const load = () => {
      if (cancelled) return;
      if (reduced.matches || narrow.matches || !gl) {
        setTexture(null);
        return;
      }
      const url = `/api/credentials/${encodeURIComponent(credentialId)}/export/png?locale=${locale}`;
      void fetch(url, { credentials: "include" })
        .then((response) => (response.ok ? response.blob() : Promise.reject(new Error("card png"))))
        .then((blob) => {
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          const loader = new TextureLoader();
          loader.load(
            objectUrl,
            (next) => {
              URL.revokeObjectURL(objectUrl);
              if (cancelled) {
                next.dispose();
                return;
              }
              next.colorSpace = SRGBColorSpace;
              next.anisotropy = 8;
              loaded = next;
              setTexture(next);
            },
            undefined,
            () => {
              URL.revokeObjectURL(objectUrl);
              if (!cancelled) setTexture(null);
            },
          );
        })
        .catch(() => {
          if (!cancelled) setTexture(null);
        });
    };

    load();
    reduced.addEventListener("change", load);
    narrow.addEventListener("change", load);
    return () => {
      cancelled = true;
      reduced.removeEventListener("change", load);
      narrow.removeEventListener("change", load);
      loaded?.dispose();
    };
  }, [credentialId, locale]);

  if (!texture) return null;

  return (
    <div className="membership-card-3d mx-auto w-full max-w-xl">
      <p className="mb-3 text-center text-sm text-muted">{hint}</p>
      <div
        className="relative aspect-[1.6/1] w-full"
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
        <Canvas
          camera={{ position: [0, 0, 4.6], fov: 32 }}
          dpr={[1, 1.5]}
          className="!h-full !w-full"
          gl={{ alpha: true, antialias: true }}
          aria-hidden
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 5]} intensity={1.05} />
          <directionalLight position={[-3, 1, 2]} intensity={0.35} />
          <CardMesh texture={texture} flipped={flipped} tilt={tilt} />
          <ContactShadows position={[0, -1.25, 0]} opacity={0.22} scale={8} blur={2.4} />
        </Canvas>
      </div>
      <button
        type="button"
        className="mx-auto mt-3 block min-h-11 border border-line px-4 text-sm text-ink"
        onClick={() => setFlipped((value) => !value)}
      >
        {flipLabel}
      </button>
    </div>
  );
}
