
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
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
  const dragLineRef = useRef<THREE.Line>(null);
  const dragLineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);

  const backgroundShader = useMemo(() => ({
    uniforms: {
      uBrightColor: { value: new THREE.Color('#de9e78') },
      uMidColor: { value: new THREE.Color('#6d3761') }, // Added midpoint color
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
          // Dark to Mid
          color = mix(uDarkColor, uMidColor, t * 2.0);
        } else {
          // Mid to Bright
          color = mix(uMidColor, uBrightColor, (t - 0.5) * 2.0);
        }
        
        // Increased brightness (1.25 multiplier)
        gl_FragColor = vec4(color * 1.25, 1.0);
      }
    `
  }), []);

  useFrame(() => {
    if (dragLineRef.current && gameState.selectedPlanetId) {
      const source = gameState.planets.find(p => p.id === gameState.selectedPlanetId);
      if (source) {
        if (gameState.dragTargetPlanetId) {
          const target = gameState.planets.find(p => p.id === gameState.dragTargetPlanetId);
          if (target) {
            const posAttr = dragLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
            posAttr.setXYZ(0, source.position.x, source.position.y, source.position.z);
            posAttr.setXYZ(1, target.position.x, target.position.y, target.position.z);
            posAttr.needsUpdate = true;
            dragLineRef.current.visible = true;
            return;
          }
        }
      }
      dragLineRef.current.visible = false;
    } else if (dragLineRef.current) {
      dragLineRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* Vivid global lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[-80, 80, 40]} intensity={8} color="#ffffff" castShadow />
      <pointLight position={[0, 0, 100]} intensity={2.0} color="#de9e78" />
      
      {/* Brighter cosmic stars */}
      <Stars radius={200} depth={50} count={18000} factor={6} saturation={1} fade speed={1.0} />

      {/* Atmospheric Background Shader Sphere */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[250, 64, 64]} />
        <shaderMaterial 
          args={[backgroundShader]} 
          side={THREE.BackSide} 
          depthWrite={false}
        />
      </mesh>

      <primitive 
        object={useMemo(() => new THREE.Line(dragLineGeometry, new THREE.LineBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.8 })), [dragLineGeometry])} 
        ref={dragLineRef} 
        visible={false} 
      />

      {gameState.planets.map(planet => (
        <Planet 
          key={planet.id}
          data={planet} 
          units={gameState.units}
          isSelected={gameState.selectedPlanetId === planet.id} 
          isDragTarget={gameState.dragTargetPlanetId === planet.id}
          onPointerDown={() => onPlanetDown(planet.id)}
          // Fix: Updated local reference to use the destructured 'onPlanetUp' prop instead of the undefined 'onPointerUp'
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