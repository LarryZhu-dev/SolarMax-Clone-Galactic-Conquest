
import React from 'react';
import { GameState } from '../types';

interface HUDProps {
  gameState: GameState;
  onStart: () => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onStart }) => {
  if (gameState.status === 'MENU') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white z-50 p-10">
        <h1 className="text-7xl font-black mb-2 tracking-tighter bg-gradient-to-b from-white to-blue-500 bg-clip-text text-transparent italic">
          SOLARMAX
        </h1>
        <div className="h-1 w-64 bg-blue-500 mb-6" />
        <p className="text-lg text-blue-200 mb-8 max-w-md text-center font-light tracking-wide uppercase">
          Drag from your planet to a target to launch fleet.
          <br/>Invade sectors to expand your galactic influence.
        </p>
        <button 
          onClick={onStart}
          className="px-12 py-4 bg-transparent border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white rounded-none font-black transition-all transform hover:skew-x-12"
        >
          ENGAGE COMMAND
        </button>
      </div>
    );
  }

  const pPop = gameState.units.filter(u => u.owner === 'PLAYER').length;
  const ePop = gameState.units.filter(u => u.owner === 'ENEMY').length;

  if (gameState.status === 'WON' || gameState.status === 'LOST') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white z-50">
        <h2 className={`text-8xl font-black mb-8 italic ${gameState.status === 'WON' ? 'text-blue-400' : 'text-red-500'}`}>
          {gameState.status === 'WON' ? 'SECTOR CLEAR' : 'BASE LOST'}
        </h2>
        <button 
          onClick={onStart}
          className="px-12 py-4 border border-slate-500 hover:bg-white hover:text-black font-bold transition-all"
        >
          REINITIALIZE
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 w-full p-6 pointer-events-none select-none flex flex-col h-full justify-between">
      <div className="flex justify-between items-start">
        <div className="bg-black bg-opacity-40 border-l-4 border-blue-500 p-4 backdrop-blur-sm">
          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Fleet Status</div>
          <div className="text-4xl font-mono text-white leading-none">{pPop}</div>
        </div>

        <div className="bg-black bg-opacity-40 border-r-4 border-red-500 p-4 backdrop-blur-sm text-right">
          <div className="text-[10px] font-bold text-red-400 uppercase tracking-[0.3em]">Hostile Count</div>
          <div className="text-4xl font-mono text-white leading-none">{ePop}</div>
        </div>
      </div>

      <div className="w-full flex justify-center mb-8">
        <div className="bg-white bg-opacity-5 px-6 py-2 border border-white border-opacity-10 backdrop-blur-md">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.5em]">
            {gameState.selectedPlanetId ? "Drag to Target" : "Select Origin Planet"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HUD;
