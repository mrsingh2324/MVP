import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useTheme } from '../../contexts/ThemeContext';

const FloatingDumbbell = () => {
  const groupRef = useRef();
  const { isDark } = useTheme();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.5}
      floatIntensity={0.5}
    >
      <group ref={groupRef}>
        {/* Dumbbell bar */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 2, 16]} />
          <meshStandardMaterial color={isDark ? "#64748b" : "#475569"} metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Left weight */}
        <mesh position={[-0.8, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
          <meshStandardMaterial color={isDark ? "#3b82f6" : "#1e40af"} metalness={0.6} roughness={0.3} />
        </mesh>
        
        {/* Right weight */}
        <mesh position={[0.8, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
          <meshStandardMaterial color={isDark ? "#3b82f6" : "#1e40af"} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </Float>
  );
};

const FitnessIcon3D = ({ className = "" }) => {
  return (
    <div className={`w-24 h-24 ${className}`}>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <FloatingDumbbell />
      </Canvas>
    </div>
  );
};

export { FitnessIcon3D };
