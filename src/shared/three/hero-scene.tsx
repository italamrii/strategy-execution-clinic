"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";

const Scene = lazy(async () => {
  const [{ Canvas }, { OrbitControls }, THREE] = await Promise.all([
    import("@react-three/fiber"),
    import("@react-three/drei"),
    import("three"),
  ]);

  function Rings() {
    return (
      <group rotation={[0.4, 0.2, 0]}>
        <mesh>
          <torusGeometry args={[1.35, 0.015, 16, 96]} />
          <meshStandardMaterial color="#c4a574" metalness={0.65} roughness={0.28} />
        </mesh>
        <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
          <torusGeometry args={[1.05, 0.01, 12, 80]} />
          <meshStandardMaterial color="#152238" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color="#c4a574" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  function HeroCanvas() {
    return (
      <Canvas
        camera={{ position: [0, 0, 3.4], fov: 42 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 1.5]}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} color="#f7f5f1" />
        <directionalLight position={[-2, -1, -3]} intensity={0.35} color="#c4a574" />
        <Rings />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    );
  }

  return { default: HeroCanvas };
});

function subscribeScene(onChange: () => void) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = window.matchMedia("(max-width: 720px)");
  motion.addEventListener("change", onChange);
  narrow.addEventListener("change", onChange);
  return () => {
    motion.removeEventListener("change", onChange);
    narrow.removeEventListener("change", onChange);
  };
}

function sceneEnabled() {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(max-width: 720px)").matches
  );
}

export function HeroScene() {
  const enabled = useSyncExternalStore(subscribeScene, sceneEnabled, () => false);

  if (!enabled) {
    return <div className="hero-scene hero-scene--static" aria-hidden />;
  }

  return (
    <div className="hero-scene" aria-hidden>
      <Suspense fallback={<div className="hero-scene hero-scene--static" />}>
        <Scene />
      </Suspense>
    </div>
  );
}
