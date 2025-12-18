
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData, Unit, GameState, Owner } from './types';
import SolarSystem from './components/SolarSystem';
import HUD from './components/HUD';

const INITIAL_PLANETS: PlanetData[] = [
  { id: '1', position: new THREE.Vector3(-15, 0, 0), radius: 2.8, owner: 'PLAYER', capacity: 120, color: '#3b82f6', productionRate: 4.5, textureType: 'EARTH' },
  { id: '2', position: new THREE.Vector3(15, 0, 0), radius: 2.8, owner: 'ENEMY', capacity: 120, color: '#ef4444', productionRate: 4.5, textureType: 'MOON' },
  { id: '3', position: new THREE.Vector3(0, 10, 0), radius: 2.0, owner: 'NEUTRAL', capacity: 80, color: '#94a3b8', productionRate: 2.0, textureType: 'BRICK' },
  { id: '4', position: new THREE.Vector3(0, -10, 0), radius: 2.0, owner: 'NEUTRAL', capacity: 80, color: '#94a3b8', productionRate: 2.0, textureType: 'GRASS' },
];

const COMBAT_RADIUS = 0.6;

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const createUnit = (planet: PlanetData, owner: Owner): Unit => {
  const orbitAxis = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), (Math.random() - 0.5) * 0.4).normalize();
  const orbitAngle = Math.random() * Math.PI * 2;
  const orbitRadius = planet.radius + 1.2 + Math.random() * 0.6;
  
  const orbitQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), orbitAxis);
  const localPos = new THREE.Vector3(Math.cos(orbitAngle) * orbitRadius, 0, Math.sin(orbitAngle) * orbitRadius).applyQuaternion(orbitQuat);
  const spawnPos = planet.position.clone().add(localPos);

  return {
    id: Math.random().toString(36).substr(2, 9),
    owner: owner,
    position: spawnPos,
    targetPlanetId: null,
    planetId: planet.id,
    // Reduced speed for slower, more majestic travel (was 7.5-10.0)
    speed: 3.2 + Math.random() * 1.8, 
    currentVelocity: 0,
    state: 'ORBITING',
    orbitAngle: orbitAngle,
    orbitRadius: orbitRadius,
    // Significantly reduced orbit speed (was 0.6-0.9)
    orbitSpeed: (0.15 + Math.random() * 0.2) * (owner === 'PLAYER' ? 1 : -1),
    orbitAxis: orbitAxis,
    spawnTime: Date.now(),
  };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    planets: INITIAL_PLANETS,
    units: [],
    explosions: [],
    selectedPlanetId: null,
    dragTargetPlanetId: null,
    status: 'MENU',
  });

  const lastUpdateRef = useRef<number>(Date.now());
  const productionAccumulatorRef = useRef<Record<string, number>>({});

  const startGame = () => {
    const initialUnits: Unit[] = [];
    INITIAL_PLANETS.forEach(p => {
      const startPop = p.owner === 'NEUTRAL' ? 15 : 40;
      for (let i = 0; i < startPop; i++) initialUnits.push(createUnit(p, p.owner));
    });
    setGameState({
      planets: INITIAL_PLANETS.map(p => ({ ...p })),
      units: initialUnits,
      explosions: [],
      selectedPlanetId: null,
      dragTargetPlanetId: null,
      status: 'PLAYING',
    });
  };

  const spawnVisualEffect = (pos: THREE.Vector3, color: string, type: 'EXPLOSION' | 'SPAWN') => {
    setGameState(prev => ({
      ...prev,
      explosions: [...prev.explosions, { 
        id: Math.random().toString(), 
        position: pos.clone(), 
        color, 
        startTime: Date.now(), 
        duration: 800,
        type
      }]
    }));
  };

  const sendUnits = useCallback((sourceId: string, targetId: string, owner: Owner) => {
    const now = Date.now();
    setGameState(prev => {
      const sourceUnits = prev.units.filter(u => u.planetId === sourceId && u.owner === owner && u.state === 'ORBITING');
      const countToSend = Math.floor(sourceUnits.length * 0.5);
      if (countToSend <= 0) return prev;
      
      const shipIds = new Set(sourceUnits.slice(0, countToSend).map(u => u.id));
      const targetPlanet = prev.planets.find(p => p.id === targetId);
      if (!targetPlanet) return prev;

      return {
        ...prev,
        units: prev.units.map(u => {
          if (shipIds.has(u.id)) {
            const randomTargetAngle = Math.random() * Math.PI * 2;
            const orbitQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u.orbitAxis);
            const hashId = u.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const arrivalOrbitRadius = targetPlanet.radius + 1.2 + (hashId % 100) / 100 * 0.6;
            
            const localArrivalPos = new THREE.Vector3(
              Math.cos(randomTargetAngle) * arrivalOrbitRadius,
              0,
              Math.sin(randomTargetAngle) * arrivalOrbitRadius
            ).applyQuaternion(orbitQuat);
            
            const finalTargetPos = targetPlanet.position.clone().add(localArrivalPos);

            return { 
              ...u, 
              state: 'TRAVELING' as const, 
              targetPlanetId: targetId, 
              targetOrbitAngle: randomTargetAngle,
              startPosition: u.position.clone(),
              totalDistance: u.position.distanceTo(finalTargetPos),
              planetId: null, 
              travelStartTime: now,
              arrivalTime: undefined,
              currentVelocity: 0
            };
          }
          return u;
        }),
        selectedPlanetId: null
      };
    });
  }, []);

  useEffect(() => {
    if (gameState.status !== 'PLAYING') return;
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setGameState(prev => {
        const toRemove = new Set<string>();
        const newProducedUnits: Unit[] = [];

        // 1. Production
        prev.planets.forEach(p => {
          if (p.owner === 'NEUTRAL') return;
          const currentPop = prev.units.filter(u => u.planetId === p.id && u.owner === p.owner).length;
          if (currentPop < p.capacity) {
            const acc = (productionAccumulatorRef.current[p.id] || 0) + p.productionRate * dt;
            if (acc >= 1) {
              const count = Math.floor(acc);
              productionAccumulatorRef.current[p.id] = acc - count;
              for (let i = 0; i < count; i++) {
                const u = createUnit(p, p.owner);
                newProducedUnits.push(u);
                spawnVisualEffect(u.position, u.owner === 'PLAYER' ? '#3b82f6' : '#ef4444', 'SPAWN');
              }
            } else {
              productionAccumulatorRef.current[p.id] = acc;
            }
          }
        });

        // 2. Updated Movement Logic
        const updatedUnits: Unit[] = prev.units.map(unit => {
          const u = { ...unit, position: unit.position.clone() };
          const oldPos = u.position.clone();

          if (u.state === 'TRAVELING') {
            const target = prev.planets.find(p => p.id === u.targetPlanetId);
            if (!target || !u.startPosition || !u.totalDistance || !u.travelStartTime) {
               return { ...u, state: 'ORBITING' as const, planetId: prev.planets[0].id };
            }

            const orbitQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u.orbitAxis);
            const hashId = u.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const arrivalOrbitRadius = target.radius + 1.2 + (hashId % 100) / 100 * 0.6;
            
            const localArrivalPos = new THREE.Vector3(
              Math.cos(u.targetOrbitAngle || 0) * arrivalOrbitRadius,
              0,
              Math.sin(u.targetOrbitAngle || 0) * arrivalOrbitRadius
            ).applyQuaternion(orbitQuat);
            const worldTargetPos = target.position.clone().add(localArrivalPos);

            const travelDuration = u.totalDistance / u.speed;
            const elapsed = (now - u.travelStartTime) / 1000;
            const linearProgress = Math.min(1.0, elapsed / travelDuration);
            
            const easedT = easeInOutCubic(linearProgress);
            u.position.lerpVectors(u.startPosition, worldTargetPos, easedT);

            u.currentVelocity = u.position.distanceTo(oldPos) / dt;

            if (linearProgress >= 1.0) {
              u.state = 'ORBITING' as const;
              u.planetId = target.id;
              u.targetPlanetId = null;
              u.orbitAngle = u.targetOrbitAngle || 0;
              u.orbitRadius = arrivalOrbitRadius;
              u.arrivalTime = now;
              u.currentVelocity = 0;
            }
          } else {
            const planet = prev.planets.find(p => p.id === u.planetId);
            if (planet) {
              u.orbitAngle += u.orbitSpeed * dt;
              const orbitQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u.orbitAxis);
              const localOrbitPos = new THREE.Vector3(
                Math.cos(u.orbitAngle) * u.orbitRadius, 0, Math.sin(u.orbitAngle) * u.orbitRadius
              ).applyQuaternion(orbitQuat);
              u.position.copy(planet.position.clone().add(localOrbitPos));
              u.currentVelocity = 0; 
            }
          }
          return u;
        });

        // 3. Combat
        const groups: Record<string, Unit[]> = {};
        updatedUnits.forEach(u => {
          const key = u.planetId || 'traveling';
          if (!groups[key]) groups[key] = [];
          groups[key].push(u);
        });

        Object.entries(groups).forEach(([key, groupUnits]) => {
          for (let i = 0; i < groupUnits.length; i++) {
            const uA = groupUnits[i];
            if (toRemove.has(uA.id)) continue;
            for (let j = i + 1; j < groupUnits.length; j++) {
              const uB = groupUnits[j];
              if (toRemove.has(uB.id) || uA.owner === uB.owner) continue;
              if (uA.position.distanceTo(uB.position) < COMBAT_RADIUS) {
                toRemove.add(uA.id); toRemove.add(uB.id);
                spawnVisualEffect(uA.position, uA.owner === 'PLAYER' ? '#3b82f6' : '#ef4444', 'EXPLOSION');
                break;
              }
            }
          }
        });

        const nextPlanets = prev.planets.map(p => {
          const invaders = updatedUnits.filter(u => u.planetId === p.id && u.owner !== p.owner && !toRemove.has(u.id));
          const residents = updatedUnits.filter(u => u.planetId === p.id && u.owner === p.owner && !toRemove.has(u.id));
          const captureReq = p.owner === 'NEUTRAL' ? 3 : 10;
          if ((p.owner === 'NEUTRAL' || residents.length === 0) && invaders.length > captureReq) {
            const counts: Record<string, number> = {};
            invaders.forEach(inv => counts[inv.owner] = (counts[inv.owner] || 0) + 1);
            const winner = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
            if (winner) {
              const newOwner = winner[0] as Owner;
              updatedUnits.forEach(unit => { 
                if (unit.planetId === p.id && !toRemove.has(unit.id)) unit.owner = newOwner; 
              });
              return { ...p, owner: newOwner, color: newOwner === 'PLAYER' ? '#3b82f6' : '#ef4444' };
            }
          }
          return p;
        });

        return { 
          ...prev, 
          planets: nextPlanets, 
          units: [...updatedUnits.filter(u => !toRemove.has(u.id)), ...newProducedUnits], 
          explosions: prev.explosions.filter(e => now - e.startTime < e.duration), 
          status: nextPlanets.filter(p => p.owner === 'PLAYER').length === 0 ? 'LOST' : 
                  nextPlanets.filter(p => p.owner === 'ENEMY').length === 0 ? 'WON' : prev.status
        };
      });
    }, 16);
    return () => clearInterval(interval);
  }, [gameState.status]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <Canvas camera={{ position: [0, 0, 50], fov: 40 }} dpr={[1, 2]}>
        <SolarSystem 
          gameState={gameState}
          onPlanetDown={(id) => setGameState(prev => ({ ...prev, selectedPlanetId: id }))}
          onPlanetUp={(id) => {
            if (gameState.selectedPlanetId && gameState.selectedPlanetId !== id) {
              sendUnits(gameState.selectedPlanetId, id, 'PLAYER');
            }
            setGameState(prev => ({ ...prev, selectedPlanetId: null, dragTargetPlanetId: null }));
          }}
          onPlanetEnter={(id) => setGameState(prev => ({ ...prev, dragTargetPlanetId: id }))}
        />
        <OrbitControls enableDamping enableRotate={false} minDistance={20} maxDistance={120} />
      </Canvas>
      <HUD gameState={gameState} onStart={startGame} />
    </div>
  );
}
