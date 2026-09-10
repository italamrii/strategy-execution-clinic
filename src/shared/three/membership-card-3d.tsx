"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox, Text } from "@react-three/drei";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Group, Mesh } from "three";

type CardVariant =
  | "founding_member"
  | "expert_member"
  | "professional_member"
  | "contributor"
  | "volunteer_member"
  | "volunteer_leader"
  | "distinguished_volunteer"
  | "strategic_partner"
  | "institutional_member";

const ACCENTS: Record<CardVariant, { border: string; gold: string }> = {
  founding_member: { border: "#A68654", gold: "#C4A574" },
  expert_member: { border: "#152238", gold: "#C4A574" },
  professional_member: { border: "#D4CDBF", gold: "#152238" },
  contributor: { border: "#D4CDBF", gold: "#4B5563" },
  volunteer_member: { border: "#A68654", gold: "#152238" },
  volunteer_leader: { border: "#152238", gold: "#C4A574" },
  distinguished_volunteer: { border: "#A68654", gold: "#152238" },
  strategic_partner: { border: "#152238", gold: "#4B5563" },
  institutional_member: { border: "#152238", gold: "#6B7280" },
};

function CardMesh({
  memberName,
  typeLabel,
  publicCode,
  variant,
  flipped,
  tilt,
}: {
  memberName: string;
  typeLabel: string;
  publicCode: string;
  variant: CardVariant;
  flipped: boolean;
  tilt: { x: number; y: number };
}) {
  const group = useRef<Group>(null);
  const front = useRef<Mesh>(null);
  const accent = ACCENTS[variant] ?? ACCENTS.professional_member;

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.x = tilt.x;
    group.current.rotation.y = flipped ? Math.PI + tilt.y : tilt.y;
  });

  return (
    <group ref={group}>
      <mesh ref={front} position={[0, 0, 0.028]}>
        <RoundedBox args={[3.2, 2, 0.04]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial
            color="#0B1D33"
            roughness={0.28}
            metalness={0.18}
            clearcoat={0.35}
            clearcoatRoughness={0.4}
          />
        </RoundedBox>
      </mesh>
      <mesh position={[0, 0, 0.031]}>
        <planeGeometry args={[3.05, 1.85]} />
        <meshBasicMaterial color={accent.border} transparent opacity={0.12} />
      </mesh>
      <Text
        position={[-1.35, 0.72, 0.05]}
        fontSize={0.11}
        color={accent.gold}
        anchorX="left"
        anchorY="top"
        maxWidth={2.8}
        letterSpacing={0.08}
      >
        STRATEGY & EXECUTION CLINIC
      </Text>
      <Text
        position={[-1.35, 0.35, 0.05]}
        fontSize={0.22}
        color="#F7F3EA"
        anchorX="left"
        anchorY="top"
        maxWidth={2.7}
      >
        {memberName.slice(0, 42)}
      </Text>
      <Text
        position={[-1.35, -0.05, 0.05]}
        fontSize={0.13}
        color="#C6B994"
        anchorX="left"
        anchorY="top"
        maxWidth={2.7}
      >
        {typeLabel.slice(0, 48)}
      </Text>
      <Text
        position={[-1.35, -0.72, 0.05]}
        fontSize={0.1}
        color={accent.gold}
        anchorX="left"
        anchorY="top"
        letterSpacing={0.06}
      >
        {publicCode}
      </Text>
      <mesh position={[0, 0, -0.028]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[3.2, 2, 0.04]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color="#f7f5f1" roughness={0.35} metalness={0.05} />
        </RoundedBox>
      </mesh>
      <Text
        position={[0, 0.2, -0.05]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.12}
        color="#152238"
        anchorX="center"
        anchorY="middle"
      >
        Scan to verify
      </Text>
      <Text
        position={[0, -0.55, -0.05]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.08}
        color="#6B7280"
        anchorX="center"
        anchorY="middle"
      >
        {publicCode}
      </Text>
    </group>
  );
}

export function MembershipCard3D({
  memberName,
  typeLabel,
  publicCode,
  variant,
  fallback,
  ariaLabel,
  credentialId,
}: {
  memberName: string;
  typeLabel: string;
  publicCode: string;
  variant: string;
  fallback: ReactNode;
  ariaLabel: string;
  credentialId: string;
}) {
  const [mode, setMode] = useState<"3d" | "fallback">("fallback");
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardVariant = (variant in ACCENTS ? variant : "professional_member") as CardVariant;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl") || probe.getContext("webgl2");
      setMode(reduced || !gl ? "fallback" : "3d");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (mode !== "3d") {
    return <>{fallback}</>;
  }

  return (
    <div
      className="relative mx-auto aspect-[1.6/1] w-full max-w-xl"
      role="img"
      aria-label={ariaLabel}
      data-testid="membership-card"
      data-credential-id={credentialId}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientY - rect.top - rect.height / 2) / rect.height;
        const y = (event.clientX - rect.left - rect.width / 2) / rect.width;
        setTilt({ x: x * 0.12, y: y * 0.18 });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <p className="sr-only" data-testid="public-code">
        {publicCode}
      </p>
      <button
        type="button"
        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        aria-label={ariaLabel}
        onClick={() => setFlipped((value) => !value)}
      />
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 35 }}
        dpr={[1, 1.5]}
        className="!h-full !w-full"
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <directionalLight position={[-4, 2, -2]} intensity={0.35} />
        <CardMesh
          memberName={memberName}
          typeLabel={typeLabel}
          publicCode={publicCode}
          variant={cardVariant}
          flipped={flipped}
          tilt={tilt}
        />
        <ContactShadows position={[0, -1.2, 0]} opacity={0.2} scale={8} blur={2.5} />
      </Canvas>
    </div>
  );
}
