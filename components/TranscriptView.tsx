import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptViewProps {
  transcripts: TranscriptItem[];
  activeGroupId: number | null;
  isAiBusy: boolean; // Prop to trigger blur effect
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ transcripts, activeGroupId, isAiBusy }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  // Handle User Scroll to pause auto-scroll
  const handleScroll = () => {
      if (containerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          // If not at the bottom, user is scrolling
          if (scrollHeight - scrollTop - clientHeight > 100) {
              userScrolledRef.current = true;
          } else {
              userScrolledRef.current = false;
          }
      }
  };

  useEffect(() => {
    // If user is looking at history, don't force scroll
    if (userScrolledRef.current) return;

    if (activeRef.current && containerRef.current) {
      const activeEl = activeRef.current;
      const container = containerRef.current;
      
      const activeTop = activeEl.offsetTop;
      const containerHeight = container.clientHeight;
      
      // Target: 66% down the screen (2/3rds)
      const targetScrollTop = activeTop - (containerHeight * 0.66);
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    } else if (transcripts.length > 0 && containerRef.current) {
        // Fallback
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts.length, activeGroupId, transcripts.map(t => t.text).join('')]);

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
        <p className="text-sm font-light tracking-wide uppercase">Väntar på tal...</p>
      </div>
    );
  }
  
  return (
    <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide px-4 md:px-0 pt-24 pb-48"
    >
      <div className="max-w-2xl mx-auto flex flex-col space-y-4"> 
        {transcripts.map((item) => {
            const isActive = activeGroupId === item.groupId;
            const cleanText = item.text.replace(/<noise>/gi, '').trim();
            if (!cleanText) return null;

            return (
                <div 
                    key={item.id} 
                    ref={isActive ? activeRef : null}
                    className={`relative py-1 pl-4 border-l-2 transition-all duration-300 ${
                        isActive 
                            ? 'border-indigo-500' 
                            : 'border-transparent opacity-60'
                    }`}
                >
                    <p className={`text-lg md:text-xl leading-relaxed transition-colors ${
                        isActive ? 'text-white font-medium' : 'text-slate-400'
                    }`}>
                        {cleanText}
                    </p>
                </div>
            );
        })}
        
        {/* Blur Animation for "Incoming" Text */}
        {isAiBusy && (
            <div className="relative py-2 pl-4 border-l-2 border-indigo-500/50 opacity-80 animate-pulse">
                <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2 filter blur-sm"></div>
                <div className="h-4 bg-slate-700/50 rounded w-1/2 filter blur-sm"></div>
            </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};

export default TranscriptView;