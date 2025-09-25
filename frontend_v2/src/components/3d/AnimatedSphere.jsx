import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useTheme } from '../../contexts/ThemeContext';

const DistortedSphere = () => {
  const meshRef = useRef();
  const { isDark } = useTheme();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={isDark ? "#8b5cf6" : "#7c3aed"}
        attach="material"
        distort={0.3}
        speed={2}
        roughness={0.1}
        metalness={0.8}
      />
    </Sphere>
  );
};

const AnimatedSphere = ({ className = "" }) => {
  return (
    <div className={`w-40 h-40 ${className}`}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <DistortedSphere />
      </Canvas>
    </div>
  );
};

export { AnimatedSphere };
