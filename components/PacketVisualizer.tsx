import React from 'react';

interface PacketVisualizerProps {
  latency: number;
  onClick: () => void;
}

const PacketVisualizer: React.FC<PacketVisualizerProps> = ({ latency, onClick }) => {
  // Determine color based on latency
  let latencyColor = "text-slate-500";
  if (latency > 0) {
      if (latency < 6) latencyColor = "text-green-500";
      else if (latency < 15) latencyColor = "text-yellow-500";
      else latencyColor = "text-red-500";
  }

  return (
    <button 
      onClick={onClick}
      className={`text-[10px] font-mono font-bold tracking-widest uppercase ${latencyColor} hover:opacity-80 transition-opacity p-2`}
    >
      LAG {latency.toFixed(1)} S
    </button>
  );
};

export default PacketVisualizer;