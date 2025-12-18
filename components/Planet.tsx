
import React, { useRef, Suspense, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData, Unit } from '../types';
import PlanetSwarm from './PlanetSwarm';

const TEXTURES = {
  EARTH: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg',
  MOON: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/moon_1024.jpg',
  BRICK: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/brick_diffuse.jpg',
  GRASS: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/terrain/grasslight-big.jpg'
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

  // 根据星球类型选择纹理
  const textureUrl = useMemo(() => {
    return TEXTURES[data.textureType] || TEXTURES.MOON;
  }, [data.textureType]);

  const texture = useLoader(THREE.TextureLoader, textureUrl);

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.0008;
  });

  const textColor = data.owner === 'PLAYER' ? '#60a5fa' : data.owner === 'ENEMY' ? '#f87171' : '#94a3b8';
  
  const materialColor = useMemo(() => {
    if (data.owner === 'PLAYER') return '#ffffff'; // 玩家保持原色
    if (data.owner === 'ENEMY') return '#ff9999';  // 敌人带点红色调
    return '#aaaaaa';                             // 中立带点灰色调
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

      {/* SolarMax 风格的单位集群可视化 */}
      <PlanetSwarm planet={data} population={population} />

      {/* 选中/拖拽目标时的环绕光环 */}
      {(isSelected || isDragTarget) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.radius * 1.3, data.radius * 1.4, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 悬浮的人口文字 */}
      <Suspense fallback={null}>
        <Text
          position={[0, 0, data.radius + 2.5]}
          fontSize={data.radius * 0.45}
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
  // 计算当前星球归属者的单位数量
  const population = props.units.filter(u => u.planetId === props.data.id && u.owner === props.data.owner).length;
  return (
    <Suspense fallback={null}>
      <PlanetBody {...props} population={population} />
    </Suspense>
  );
};

export default Planet;
