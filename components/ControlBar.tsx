import React from 'react';
import PacketVisualizer from './PacketVisualizer';

interface ControlBarProps {
  activeMode: 'translate' | 'transcribe' | 'off';
  setMode: (mode: 'translate' | 'transcribe' | 'off') => void;
  currentLatency: number;
  onToggleStats: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  activeMode,
  setMode,
  currentLatency,
  onToggleStats
}) => {
  return (
    <div className="absolute bottom-6 left-0 right-0 z-40 flex flex-col items-center justify-center space-y-4 pointer-events-none">
      
      {/* THE BIG SWITCH */}
      <div className="pointer-events-auto relative bg-slate-900 border border-slate-700 p-1 rounded-full h-20 w-80 shadow-2xl flex items-center justify-between">
          
          {/* Sliding Indicator */}
          <div 
            className={`absolute top-1 bottom-1 w-[32%] rounded-full bg-slate-800 transition-all duration-300 ease-out shadow-inner border border-slate-600 ${
                activeMode === 'translate' ? 'left-1 bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 
                activeMode === 'transcribe' ? 'left-[67%] bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                'left-[34%]'
            }`}
          />

          {/* Speaker Mode (Listen) */}
          <button 
            onClick={() => setMode('translate')}
            className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center space-y-1 group"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 transition-colors ${activeMode === 'translate' ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
          </button>

          {/* OFF (Middle) */}
          <button 
            onClick={() => setMode('off')}
            className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center space-y-1 group"
          >
              <div className={`w-3 h-3 rounded-sm border-2 transition-colors ${activeMode === 'off' ? 'border-slate-500 bg-slate-700' : 'border-slate-700'}`}></div>
          </button>

          {/* Mic Mode (Speak) */}
          <button 
            onClick={() => setMode('transcribe')}
            className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center space-y-1 group"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 transition-colors ${activeMode === 'transcribe' ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
          </button>
      </div>

      {/* PACKET VISUALIZER (Trigger for Stats) */}
      <div className="pointer-events-auto">
          <PacketVisualizer 
             latency={currentLatency}
             onClick={onToggleStats}
          />
      </div>

    </div>
  );
};

export default ControlBar;