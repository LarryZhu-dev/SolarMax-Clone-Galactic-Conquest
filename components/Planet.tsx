
import React, { useRef, Suspense, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData, Unit } from '../types';

const TEXTURES = {
  // These are confirmed to exist in the three.js master branch
  EARTH: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg',
  MOON: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/moon_1024.jpg'
};

interface PlanetProps {
  data: PlanetData;
  isSelected: boolean;
  isDragTarget: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerEnter: () => void;
  population?: number;
}

const PlanetBody: React.FC<PlanetProps & { population: number }> = ({ data, isSelected, isDragTarget, onPointerDown, onPointerUp, onPointerEnter, population }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Use Earth for player, Moon for others. 
  // We'll tint the texture using the material color property to distinguish owners.
  const textureUrl = useMemo(() => {
    if (data.owner === 'PLAYER') return TEXTURES.EARTH;
    return TEXTURES.MOON;
  }, [data.owner]);

  const texture = useLoader(THREE.TextureLoader, textureUrl);

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.0008;
  });

  const textColor = data.owner === 'PLAYER' ? '#60a5fa' : data.owner === 'ENEMY' ? '#f87171' : '#94a3b8';
  
  // Material color to tint the texture
  const materialColor = useMemo(() => {
    if (data.owner === 'PLAYER') return '#ffffff'; // Natural Earth colors
    if (data.owner === 'ENEMY') return '#ff9999';  // Reddish tint for "Mars" look
    return '#aaaaaa';                             // Grey for neutral
  }, [data.owner]);

  return (
    <group position={data.position}>
      <Sphere 
        ref={meshRef} 
        args={[data.radius, 64, 64]} 
        castShadow 
        receiveShadow
        onPointerDown={(e) => { e.stopPropagation(); onPointerDown(); }}
        onPointerUp={(e) => { e.stopPropagation(); onPointerUp(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter(); }}
      >
        <meshStandardMaterial
          map={texture}
          color={materialColor}
          roughness={0.7}
          metalness={0.2}
          emissive={data.color}
          emissiveIntensity={isSelected ? 0.25 : 0.05}
        />
      </Sphere>

      {/* Selection Glow Ring */}
      {(isSelected || isDragTarget) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.radius * 1.3, data.radius * 1.4, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating Population Text */}
      <Suspense fallback={null}>
        <Text
          position={[0, 0, data.radius + 1.5]}
          fontSize={data.radius * 0.4}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#000"
          font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK3nivA.woff"
        >
          {population}
        </Text>
      </Suspense>
    </group>
  );
};

const Planet: React.FC<PlanetProps & { units: Unit[] }> = (props) => {
  const population = props.units.filter(u => u.planetId === props.data.id && u.owner === props.data.owner).length;
  return (
    <Suspense fallback={null}>
      <PlanetBody {...props} population={population} />
    </Suspense>
  );
};

export default Planet;
