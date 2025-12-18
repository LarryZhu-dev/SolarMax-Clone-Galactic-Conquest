import React, { useRef, Suspense, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData, Unit } from '../types';

const TEXTURES = {
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
  playerCount: number;
  enemyCount: number;
}

const PlanetBody: React.FC<PlanetProps> = ({ data, isSelected, isDragTarget, onPointerDown, onPointerUp, onPointerEnter, playerCount, enemyCount }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const textureUrl = useMemo(() => {
    if (data.owner === 'PLAYER') return TEXTURES.EARTH;
    return TEXTURES.MOON;
  }, [data.owner]);

  const texture = useLoader(THREE.TextureLoader, textureUrl);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0008;
    }
    if (ringRef.current) {
      ringRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  const materialColor = useMemo(() => {
    if (data.owner === 'PLAYER') return '#ffffff';
    if (data.owner === 'ENEMY') return '#ff9999';
    return '#aaaaaa';
  }, [data.owner]);

  const showPlayerCount = playerCount > 0 || data.owner === 'PLAYER';
  const showEnemyCount = enemyCount > 0 || data.owner === 'ENEMY';

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
          emissive={new THREE.Color(data.color)}
          emissiveIntensity={isSelected ? 0.3 : 0.05}
        />
      </Sphere>

      {(isSelected || isDragTarget) && (
        <mesh ref={ringRef}>
          <ringGeometry args={[data.radius * 1.3, data.radius * 1.4, 64]} />
          <meshBasicMaterial 
            color={isSelected ? "#60a5fa" : "#ffffff"} 
            transparent 
            opacity={0.6} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}

      <Suspense fallback={null}>
        <group position={[0, data.radius + 1.2, 0]}>
          {showPlayerCount && (
            <Text
              position={showEnemyCount ? [-data.radius * 0.45, 0, 0] : [0, 0, 0]}
              fontSize={data.radius * 0.35}
              color="#60a5fa"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#000000"
            >
              {playerCount}
            </Text>
          )}
          {showEnemyCount && (
            <Text
              position={showPlayerCount ? [data.radius * 0.45, 0, 0] : [0, 0, 0]}
              fontSize={data.radius * 0.35}
              color="#f87171"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#000000"
            >
              {enemyCount}
            </Text>
          )}
        </group>
      </Suspense>
    </group>
  );
};

const Planet: React.FC<Omit<PlanetProps, 'playerCount' | 'enemyCount'> & { units: Unit[] }> = (props) => {
  const pCount = useMemo(() => 
    props.units.filter(u => u.planetId === props.data.id && u.owner === 'PLAYER').length,
    [props.units, props.data.id]
  );
  
  const eCount = useMemo(() => 
    props.units.filter(u => u.planetId === props.data.id && u.owner === 'ENEMY').length,
    [props.units, props.data.id]
  );
  
  return (
    <Suspense fallback={null}>
      <PlanetBody {...props} playerCount={pCount} enemyCount={eCount} />
    </Suspense>
  );
};

export default Planet;