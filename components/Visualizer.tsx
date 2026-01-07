import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Config
    const bars = 30;
    const barWidth = canvas.width / bars;
    const baseHeight = 4;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isActive) {
        // Draw flat line
        ctx.fillStyle = '#334155'; // slate-700
        for (let i = 0; i < bars; i++) {
           ctx.fillRect(i * barWidth, canvas.height / 2 - 1, barWidth - 2, 2);
        }
        return;
      }

      // Draw dynamic bars
      const center = canvas.height / 2;
      for (let i = 0; i < bars; i++) {
        // Create a wave effect combined with volume
        const offset = Math.sin(Date.now() / 200 + i * 0.5) * 0.5 + 0.5; // 0 to 1 wave
        const dynamicVol = volume * (0.5 + Math.random() * 0.5); // Add jitter
        
        // Height based on volume and wave position. Center bars react more.
        const distanceFromCenter = Math.abs(i - bars / 2) / (bars / 2);
        const scale = 1 - distanceFromCenter * 0.5; 
        
        const h = Math.max(baseHeight, dynamicVol * canvas.height * 0.8 * scale * offset);
        
        // Gradient color based on height
        const hue = 210 + (h / canvas.height) * 60; // Blue to purple
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        
        ctx.fillRect(i * barWidth, center - h / 2, barWidth - 2, h);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={60} 
      className="w-full h-16 rounded-lg bg-slate-900/50"
    />
  );
};

export default Visualizer;
