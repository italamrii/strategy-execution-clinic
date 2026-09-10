"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import { SRGBColorSpace, type Group, type Texture } from "three";

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

function TexturedCard({
  pngUrl,
  flipped,
  tilt,
  onReady,
  onError,
}: {
  pngUrl: string;
  flipped: boolean;
  tilt: { x: number; y: number };
  onReady: () => void;
  onError: (message: string) => void;
}) {
  const texture = useTexture(pngUrl, (loaded) => {
    const maps = Array.isArray(loaded) ? loaded : [loaded];
    for (const map of maps) {
      map.colorSpace = SRGBColorSpace;
      map.anisotropy = 8;
      map.needsUpdate = true;
    }
  });

  useEffect(() => {
    if (!texture) {
      onError("card texture missing");
      return;
    }
    onReady();
  }, [onError, onReady, texture]);

  return <CardMesh texture={texture} flipped={flipped} tilt={tilt} />;
}

export function MembershipCard3DCanvas({
  pngUrl,
  flipped,
  tilt,
  onReady,
  onError,
}: {
  pngUrl: string;
  flipped: boolean;
  tilt: { x: number; y: number };
  onReady: () => void;
  onError: (message: string) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.6], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, failIfMajorPerformanceCaveat: false }}
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.05} />
      <directionalLight position={[-3, 1, 2]} intensity={0.35} />
      <Suspense fallback={null}>
        <TexturedCard
          pngUrl={pngUrl}
          flipped={flipped}
          tilt={tilt}
          onReady={onReady}
          onError={onError}
        />
      </Suspense>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.22} scale={8} blur={2.4} />
    </Canvas>
  );
}
