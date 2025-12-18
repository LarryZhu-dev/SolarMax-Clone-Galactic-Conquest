
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PlanetData } from '../types';

// Helper to create a soft radial gradient texture
const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

interface PlanetSwarmProps {
  planet: PlanetData;
  // Fix: Added population prop as it is not part of PlanetData
  population: number;
}

const PlanetSwarm: React.FC<PlanetSwarmProps> = ({ planet, population }) => {
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const maxCount = 200;

  const glowTexture = useMemo(() => createGlowTexture(), []);

  const orbits = useMemo(() => {
    return Array.from({ length: maxCount }, () => {
      const axis = new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize();
      return {
        radius: planet.radius + 0.4 + Math.random() * 1.2,
        speed: 0.8 + Math.random() * 1.6,
        angle: Math.random() * Math.PI * 2,
        axis: axis,
        size: 0.05 + Math.random() * 0.05
      };
    });
  }, [planet.radius]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!glowMeshRef.current || !coreMeshRef.current) return;
    const time = state.clock.elapsedTime;
    // Fix: Use the population prop instead of the non-existent planet.population
    const currentPopulation = Math.floor(population);

    for (let i = 0; i < maxCount; i++) {
      if (i < currentPopulation) {
        const orbit = orbits[i];
        const currentAngle = orbit.angle + time * orbit.speed;
        
        const pos = new THREE.Vector3(
          Math.cos(currentAngle) * orbit.radius,
          0,
          Math.sin(currentAngle) * orbit.radius
        );
        pos.applyAxisAngle(orbit.axis, currentAngle * 0.05); 
        
        dummy.position.copy(pos);
        dummy.scale.setScalar(orbit.size);
        dummy.updateMatrix();
        coreMeshRef.current.setMatrixAt(i, dummy.matrix);

        // Halo is larger and soft
        dummy.scale.multiplyScalar(3.5);
        dummy.updateMatrix();
        glowMeshRef.current.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        coreMeshRef.current.setMatrixAt(i, dummy.matrix);
        glowMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    coreMeshRef.current.instanceMatrix.needsUpdate = true;
    glowMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={planet.position}>
      {/* High-Contrast Core */}
      <instancedMesh ref={coreMeshRef} args={[undefined, undefined, maxCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#fff" />
      </instancedMesh>
      
      {/* Soft Procedural Glow */}
      <instancedMesh ref={glowMeshRef} args={[undefined, undefined, maxCount]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          map={glowTexture}
          color={planet.color} 
          transparent 
          opacity={0.6} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};

export default PlanetSwarm;
