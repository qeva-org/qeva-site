"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { useReducedMotion } from "framer-motion";

function OrbCore() {
  const distort = useMemo(() => 0.3, []);
  return (
    <Sphere args={[1, 128, 128]}>
      <MeshDistortMaterial
        speed={1.2}
        distort={distort}
        color="#7c3aed"
        emissive="#06b6d4"
        emissiveIntensity={0.35}
        roughness={0.2}
        metalness={0.7}
      />
    </Sphere>
  );
}

export default function HoloOrb() {
  const reduce = useReducedMotion();

  return (
    <div className="relative aspect-[16/9] w-full">
      <Canvas camera={{ position: [0, 0, 2.6], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 2, 3]} intensity={1.2} />
          <OrbCore />
          {!reduce && (
            <>
              <EffectComposer>
                <Bloom intensity={0.7} luminanceThreshold={0.25} />
                <ChromaticAberration offset={[0.0007, 0.0004]} />
              </EffectComposer>
              <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.7} />
            </>
          )}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      {/* vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
    </div>
  );
}
