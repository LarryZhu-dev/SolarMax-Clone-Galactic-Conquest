
import React from 'react';
import { GameState } from '../types';

interface HUDProps {
  gameState: GameState;
  onStart: () => void;
  onNextLevel: () => void;
  onSetLaunchPercentage: (p: number) => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onStart, onNextLevel, onSetLaunchPercentage }) => {
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
        <h2 className={`text-7xl font-black mb-8 italic ${gameState.status === 'WON' ? 'text-blue-400' : 'text-red-500'}`}>
          {gameState.status === 'WON' ? 'SECTOR CLEAR' : 'BASE LOST'}
        </h2>
        <div className="flex gap-4">
          <button 
            onClick={onStart}
            className="px-8 py-3 border border-slate-500 hover:bg-white hover:text-black font-bold transition-all uppercase"
          >
            Restart
          </button>
          {gameState.status === 'WON' && (
            <button 
              onClick={onNextLevel}
              className="px-8 py-3 bg-blue-600 border border-blue-400 hover:bg-blue-400 font-bold transition-all uppercase"
            >
              Next Sector
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 w-full p-6 pointer-events-none select-none flex flex-col h-full justify-between">
      <div className="flex justify-between items-start">
        <div className="bg-black bg-opacity-40 border-l-4 border-blue-500 p-4 backdrop-blur-sm">
          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Fleet Status</div>
          <div className="text-4xl font-mono text-white leading-none">{pPop}</div>
          <div className="mt-2 text-[9px] text-blue-200 uppercase tracking-widest">Level {gameState.currentLevel + 1}</div>
        </div>

        <div className="bg-black bg-opacity-40 border-r-4 border-red-500 p-4 backdrop-blur-sm text-right">
          <div className="text-[10px] font-bold text-red-400 uppercase tracking-[0.3em]">Hostile Count</div>
          <div className="text-4xl font-mono text-white leading-none">{ePop}</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mb-8 pointer-events-auto">
        <div className="w-64 bg-black bg-opacity-60 border border-white border-opacity-10 p-4 rounded-lg backdrop-blur-md">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">COMMITMENT</span>
              <span className="text-sm font-mono text-blue-400">{Math.round(gameState.launchPercentage * 100)}%</span>
           </div>
           <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1" 
              value={gameState.launchPercentage}
              onChange={(e) => onSetLaunchPercentage(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
           />
        </div>
        
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
