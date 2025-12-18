import React from 'react';
import * as THREE from 'three';
import { Unit, PlanetData } from '../types';

interface ShipsProps {
  ships: Unit[];
  planets: PlanetData[];
}

const Ships: React.FC<ShipsProps> = ({ ships, planets }) => {
  return (
    <group>
      {ships.map((ship) => {
        const target = planets.find(p => p.id === ship.targetPlanetId);
        if (!target) return null;

        // Direction vector for ship rotation
        const direction = new THREE.Vector3().subVectors(target.position, ship.position).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        return (
          <group key={ship.id} position={ship.position} quaternion={quaternion}>
            {/* Lead Ship Shape */}
            <mesh>
              <coneGeometry args={[0.15, 0.4, 4]} />
              <meshBasicMaterial color={ship.owner === 'PLAYER' ? '#3b82f6' : '#ef4444'} />
            </mesh>
            {/* Trail / Count Label */}
            <pointLight distance={2} intensity={2} color={ship.owner === 'PLAYER' ? '#3b82f6' : '#ef4444'} />
          </group>
        );
      })}
    </group>
  );
};

export default Ships;