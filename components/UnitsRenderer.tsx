
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Unit, PlanetData } from '../types';

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
};

interface UnitsRendererProps {
  units: Unit[];
  planets: PlanetData[];
}

const UnitsRenderer: React.FC<UnitsRendererProps> = ({ units, planets }) => {
  const pUnitsMeshRef = useRef<THREE.InstancedMesh>(null);
  const eUnitsMeshRef = useRef<THREE.InstancedMesh>(null);
  const pTailMeshRef = useRef<THREE.InstancedMesh>(null);
  const eTailMeshRef = useRef<THREE.InstancedMesh>(null);
  
  const maxUnits = 6000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tailDummy = useMemo(() => new THREE.Object3D(), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const trailGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.12, 1.0);
    geo.rotateX(Math.PI / 2); 
    geo.translate(0, 0, -0.5); 
    return geo;
  }, []);

  useFrame(() => {
    const now = Date.now();
    const indices = { P: 0, E: 0, PTail: 0, ETail: 0 };

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (indices.P >= maxUnits || indices.E >= maxUnits) break;

      dummy.position.copy(unit.position);
      tailDummy.position.copy(unit.position);

      if (unit.state === 'TRAVELING') {
        const target = planets.find(p => p.id === unit.targetPlanetId);
        if (target) {
          const orbitQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit.orbitAxis);
          const landingPos = new THREE.Vector3(
            Math.cos(unit.targetOrbitAngle || 0) * unit.orbitRadius,
            0,
            Math.sin(unit.targetOrbitAngle || 0) * unit.orbitRadius
          ).applyQuaternion(orbitQuat).add(target.position);
          
          dummy.lookAt(landingPos);
          tailDummy.lookAt(landingPos);
        }
      } else {
        const planet = planets.find(p => p.id === unit.planetId);
        if (planet) {
          const orbitQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit.orbitAxis);
          const tangent = new THREE.Vector3(
            -Math.sin(unit.orbitAngle) * (unit.orbitSpeed > 0 ? 1 : -1),
            0,
            Math.cos(unit.orbitAngle) * (unit.orbitSpeed > 0 ? 1 : -1)
          ).applyQuaternion(orbitQuat).normalize();
          
          const lookAtTarget = unit.position.clone().add(tangent);
          dummy.lookAt(lookAtTarget);
          tailDummy.lookAt(lookAtTarget);
        }
      }

      const spawnAge = now - unit.spawnTime;
      const isSpiking = spawnAge >= 800 && spawnAge <= 900;
      dummy.scale.setScalar(isSpiking ? 0.08 : 0.04);
      
      // Adjusted speed normalization factor for slower units (normalized to ~4.0 instead of ~8.0)
      const speedFactor = Math.min(1.8, unit.currentVelocity / 3.2);
      let tailVisibility = 0;

      if (unit.state === 'TRAVELING') {
        tailVisibility = speedFactor * Math.min(1.0, spawnAge / 400);
      } else if (unit.arrivalTime) {
        const arrivalAge = now - unit.arrivalTime;
        tailVisibility = Math.max(0, 1.0 - (arrivalAge / 500)) * 0.5;
      }

      dummy.updateMatrix();
      
      // Increased scaling multiplier for a more visible trail at lower speeds
      tailDummy.scale.set(1.0, 1.0, speedFactor * 2.5);
      tailDummy.updateMatrix();

      if (unit.owner === 'PLAYER') {
        pUnitsMeshRef.current?.setMatrixAt(indices.P++, dummy.matrix);
        if (tailVisibility > 0.01) {
          pTailMeshRef.current?.setMatrixAt(indices.PTail++, tailDummy.matrix);
        }
      } else {
        eUnitsMeshRef.current?.setMatrixAt(indices.E++, dummy.matrix);
        if (tailVisibility > 0.01) {
          eTailMeshRef.current?.setMatrixAt(indices.ETail++, tailDummy.matrix);
        }
      }
    }

    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    
    const finalizeMesh = (ref: React.RefObject<THREE.InstancedMesh>, count: number) => {
      if (ref.current) {
        for (let j = count; j < maxUnits; j++) ref.current.setMatrixAt(j, dummy.matrix);
        ref.current.instanceMatrix.needsUpdate = true;
      }
    };

    finalizeMesh(pUnitsMeshRef, indices.P);
    finalizeMesh(eUnitsMeshRef, indices.E);
    finalizeMesh(pTailMeshRef, indices.PTail);
    finalizeMesh(eTailMeshRef, indices.ETail);
  });

  return (
    <group>
      <instancedMesh ref={pUnitsMeshRef} args={[sphereGeo, undefined, maxUnits]}>
        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={8.0} />
      </instancedMesh>
      <instancedMesh ref={eUnitsMeshRef} args={[sphereGeo, undefined, maxUnits]}>
        <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={8.0} />
      </instancedMesh>

      <instancedMesh ref={pTailMeshRef} args={[trailGeo, undefined, maxUnits]}>
        <meshBasicMaterial 
          map={glowTexture} 
          color="#60a5fa" 
          transparent 
          opacity={0.5} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={eTailMeshRef} args={[trailGeo, undefined, maxUnits]}>
        <meshBasicMaterial 
          map={glowTexture} 
          color="#f87171" 
          transparent 
          opacity={0.5} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
};

export default UnitsRenderer;
