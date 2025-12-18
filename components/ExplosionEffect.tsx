
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Explosion } from '../types';

interface ExplosionProps {
  explosion: Explosion;
}

const ExplosionEffect: React.FC<ExplosionProps> = ({ explosion }) => {
  const flashRef = useRef<THREE.Mesh>(null);
  const fragmentsRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const fragmentPositions = useMemo(() => {
    const count = 10;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      positions[i * 3] = dir.x;
      positions[i * 3 + 1] = dir.y;
      positions[i * 3 + 2] = dir.z;
    }
    return positions;
  }, []);

  useFrame((state) => {
    const elapsed = Date.now() - explosion.startTime;
    const progress = Math.min(1, elapsed / explosion.duration);
    
    const maxSpread = 0.18; 
    const flashMax = 0.22;

    if (explosion.type === 'EXPLOSION') {
      if (flashRef.current) {
        const flashScale = progress < 0.2 ? (progress/0.2)*flashMax : (1-progress)*flashMax;
        flashRef.current.scale.setScalar(flashScale);
        if (flashRef.current.material instanceof THREE.MeshStandardMaterial) {
          flashRef.current.material.opacity = (1 - progress) * 1.5;
        }
      }
      if (fragmentsRef.current) {
        fragmentsRef.current.scale.setScalar(progress * maxSpread);
        if (fragmentsRef.current.material instanceof THREE.PointsMaterial) {
          fragmentsRef.current.material.opacity = (1 - progress);
        }
      }
    } else {
      // Optimization: SPAWN ring size and intensity
      // Unit diameter is 0.08. 1.5x is 0.12. We scale the ring from a baseline of radius 1.
      if (ringRef.current) {
        ringRef.current.quaternion.copy(state.camera.quaternion);
        // Shrink from outward to the particle size
        const ringScale = (1.2 - progress) * 0.15; 
        ringRef.current.scale.setScalar(ringScale);
        if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
          ringRef.current.material.opacity = Math.min(1, progress * 2);
        }
      }
    }
  });

  return (
    <group position={explosion.position}>
      {explosion.type === 'EXPLOSION' ? (
        <>
          <mesh ref={flashRef}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial 
              color={explosion.color} 
              emissive={explosion.color}
              emissiveIntensity={15.0} // Brighter flash
              transparent 
              opacity={0} 
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <points ref={fragmentsRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={fragmentPositions.length/3} array={fragmentPositions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.12} color={explosion.color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
          </points>
        </>
      ) : (
        <mesh ref={ringRef}>
          <ringGeometry args={[0.7, 1.0, 48]} />
          <meshBasicMaterial 
            color="#ffffff" // White core for brightness
            transparent 
            opacity={0} 
            blending={THREE.AdditiveBlending} 
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          {/* Inner colored glow for the ring */}
          <mesh>
            <ringGeometry args={[0.4, 1.3, 48]} />
            <meshBasicMaterial 
               color={explosion.color} 
               transparent 
               opacity={0.4} 
               blending={THREE.AdditiveBlending} 
               side={THREE.DoubleSide} 
               depthWrite={false}
            />
          </mesh>
        </mesh>
      )}
    </group>
  );
};

export default ExplosionEffect;
