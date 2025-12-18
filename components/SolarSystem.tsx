import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { GameState } from '../types';
import UnitsRenderer from './UnitsRenderer';
import ExplosionEffect from './ExplosionEffect';
import Planet from './Planet';

interface SolarSystemProps {
  gameState: GameState;
  onPlanetDown: (id: string) => void;
  onPlanetUp: (id: string) => void;
  onPlanetEnter: (id: string) => void;
}

const SolarSystem: React.FC<SolarSystemProps> = ({ gameState, onPlanetDown, onPlanetUp, onPlanetEnter }) => {
  const { mouse, camera } = useThree();
  const dragLineRef = useRef<THREE.Line>(null);
  
  const dragLineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points * 3 coords
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const backgroundShader = useMemo(() => ({
    uniforms: {
      uBrightColor: { value: new THREE.Color('#de9e78') },
      uMidColor: { value: new THREE.Color('#6d3761') },
      uDarkColor: { value: new THREE.Color('#31164a') },
      uLightPos: { value: new THREE.Vector3(-0.8, 1, 0.4).normalize() }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBrightColor;
      uniform vec3 uMidColor;
      uniform vec3 uDarkColor;
      uniform vec3 uLightPos;
      varying vec3 vNormal;
      void main() {
        float d = dot(vNormal, uLightPos);
        float t = d * 0.5 + 0.5;
        vec3 color;
        if (t < 0.5) {
          color = mix(uDarkColor, uMidColor, t * 2.0);
        } else {
          color = mix(uMidColor, uBrightColor, (t - 0.5) * 2.0);
        }
        gl_FragColor = vec4(color * 1.25, 1.0);
      }
    `
  }), []);

  const mouseInWorld = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (dragLineRef.current && gameState.selectedPlanetId) {
      const source = gameState.planets.find(p => p.id === gameState.selectedPlanetId);
      if (source) {
        mouseInWorld.set(mouse.x, mouse.y, 0.5).unproject(camera);
        const dir = mouseInWorld.clone().sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));

        const posAttr = dragLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, source.position.x, source.position.y, source.position.z);
        
        if (gameState.dragTargetPlanetId) {
          const targetPlanet = gameState.planets.find(p => p.id === gameState.dragTargetPlanetId);
          if (targetPlanet) {
            posAttr.setXYZ(1, targetPlanet.position.x, targetPlanet.position.y, targetPlanet.position.z);
          } else {
            posAttr.setXYZ(1, targetPos.x, targetPos.y, 0);
          }
        } else {
          posAttr.setXYZ(1, targetPos.x, targetPos.y, 0);
        }
        
        posAttr.needsUpdate = true;
        dragLineRef.current.visible = true;
      } else {
        dragLineRef.current.visible = false;
      }
    } else if (dragLineRef.current) {
      dragLineRef.current.visible = false;
    }
  });

  return (
    <group>
      <ambientLight intensity={1.0} />
      <directionalLight position={[-80, 80, 40]} intensity={8} color="#ffffff" />
      <pointLight position={[0, 0, 100]} intensity={2.0} color="#de9e78" />
      
      <Stars radius={200} depth={50} count={18000} factor={6} saturation={1} fade speed={1.0} />

      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[250, 64, 64]} />
        <shaderMaterial 
          args={[backgroundShader]} 
          side={THREE.BackSide} 
          depthWrite={false}
        />
      </mesh>

      {/* Fix: Cast ref to any to resolve type collision with SVG 'line' element which standard React types default to in JSX */}
      <line ref={dragLineRef as any} geometry={dragLineGeometry}>
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.6} linewidth={2} />
      </line>

      {gameState.planets.map(planet => (
        <Planet 
          key={planet.id}
          data={planet} 
          units={gameState.units}
          isSelected={gameState.selectedPlanetId === planet.id} 
          isDragTarget={gameState.dragTargetPlanetId === planet.id}
          onPointerDown={() => onPlanetDown(planet.id)}
          onPointerUp={() => onPlanetUp(planet.id)}
          onPointerEnter={() => onPlanetEnter(planet.id)}
        />
      ))}

      <UnitsRenderer units={gameState.units} planets={gameState.planets} />

      {gameState.explosions.map(exp => (
        <ExplosionEffect key={exp.id} explosion={exp} />
      ))}
    </group>
  );
};

export default SolarSystem;