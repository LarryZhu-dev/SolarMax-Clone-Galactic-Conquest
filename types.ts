
import * as THREE from 'three';
import { ThreeElements } from '@react-three/fiber';

export type Owner = 'PLAYER' | 'ENEMY' | 'NEUTRAL';
export type PlanetTexture = 'EARTH' | 'MOON' | 'BRICK' | 'GRASS';

export interface PlanetData {
  id: string;
  position: THREE.Vector3;
  radius: number;
  owner: Owner;
  capacity: number;
  color: string;
  productionRate: number;
  textureType: PlanetTexture;
}

export interface Unit {
  id: string;
  owner: Owner;
  position: THREE.Vector3;
  startPosition?: THREE.Vector3; 
  totalDistance?: number;        
  targetPlanetId: string | null;
  targetOrbitAngle?: number; 
  planetId: string | null;
  speed: number;
  currentVelocity: number;       
  state: 'TRAVELING' | 'ORBITING';
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAxis: THREE.Vector3;
  spawnTime: number; 
  travelStartTime?: number;
  arrivalTime?: number;
}

export interface Explosion {
  id: string;
  position: THREE.Vector3;
  color: string;
  startTime: number;
  duration: number;
  type: 'EXPLOSION' | 'SPAWN';
}

export interface LevelConfig {
  id: number;
  name: string;
  planets: PlanetData[];
}

export interface GameState {
  planets: PlanetData[];
  units: Unit[];
  explosions: Explosion[];
  selectedPlanetId: string | null;
  dragTargetPlanetId: string | null;
  status: 'PLAYING' | 'WON' | 'LOST' | 'MENU';
  currentLevel: number;
  launchPercentage: number;
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}
