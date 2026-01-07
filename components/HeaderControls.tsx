import React, { useState } from 'react';

interface HeaderControlsProps {
  currentRoom: string;
  onRoomChange: (room: string) => void;
  topSwitchState: 'left' | 'center' | 'right';
  onTopSwitchChange: (state: 'left' | 'center' | 'right') => void;
  userLanguage: string;
  onOpenLangModal: () => void;
}

const ROOMS = [
  "Lokalt i min mobil",
  "Stora salen",
  "FamilySearch rummet",
  "Doprummet",
  "Högrådsrummet"
];

const HeaderControls: React.FC<HeaderControlsProps> = ({
  currentRoom,
  onRoomChange,
  topSwitchState,
  onTopSwitchChange,
  userLanguage,
  onOpenLangModal
}) => {
  const [showRoomMenu, setShowRoomMenu] = useState(false);

  // Handle double click logic for switch buttons
  const handleSwitchClick = (side: 'left' | 'right') => {
    if (topSwitchState === side) {
       onOpenLangModal();
    } else {
       onTopSwitchChange(side);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4 pt-4 space-y-4 relative z-50">
      
      {/* ROW 1: App Title & Room Selector */}
      <div className="flex justify-between items-start">
         
         <div className="flex flex-col">
             <h1 className="text-lg font-bold text-white tracking-wide">Mötesbryggan</h1>
         </div>
         
         <div className="relative">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest text-right mb-1">
              VAR MITT MÖTE ÄR
            </label>
            <button 
              onClick={() => setShowRoomMenu(!showRoomMenu)}
              className="flex items-center space-x-2 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 text-sm text-white hover:bg-slate-700 transition-colors shadow-lg"
            >
              <span>{currentRoom}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform ${showRoomMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showRoomMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                {ROOMS.map(room => (
                  <button
                    key={room}
                    onClick={() => {
                      onRoomChange(room);
                      setShowRoomMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      currentRoom === room ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>
            )}
         </div>
      </div>

      {/* ROW 2: The Top Switch (Andra / Du) */}
      <div className="relative h-14 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-between p-1 shadow-lg">
          
          {/* Sliding Indicator */}
          <div 
            className={`absolute top-1 bottom-1 w-[32%] rounded-full bg-slate-800 border border-slate-600 shadow-inner transition-all duration-300 ease-out ${
                topSwitchState === 'left' ? 'left-1 border-indigo-500/50 bg-indigo-500/10' :
                topSwitchState === 'right' ? 'left-[67%] border-indigo-500/50 bg-indigo-500/10' :
                'left-[34%]'
            }`}
          />

          {/* LEFT: ANDRA */}
          <button 
            onClick={() => handleSwitchClick('left')}
            className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center space-y-0.5"
          >
             <span className={`text-[10px] font-bold uppercase tracking-wider ${topSwitchState === 'left' ? 'text-indigo-300' : 'text-slate-500'}`}>
               Andra
             </span>
             <div className="flex items-center space-x-1">
               <span className={`text-xs font-semibold ${topSwitchState === 'left' ? 'text-white' : 'text-slate-400'}`}>AUTO</span>
               {topSwitchState === 'left' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
               )}
             </div>
          </button>

          {/* MIDDLE: Text Icon */}
          <button 
             onClick={() => onTopSwitchChange('center')}
             className="relative z-10 w-1/3 h-full flex items-center justify-center"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${topSwitchState === 'center' ? 'text-slate-200' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
          </button>

          {/* RIGHT: DU */}
          <button 
            onClick={() => handleSwitchClick('right')}
            className="relative z-10 w-1/3 h-full flex flex-col items-center justify-center space-y-0.5"
          >
             <span className={`text-[10px] font-bold uppercase tracking-wider ${topSwitchState === 'right' ? 'text-indigo-300' : 'text-slate-500'}`}>
               Du
             </span>
             <div className="flex items-center space-x-1">
               <span className={`text-xs font-semibold ${topSwitchState === 'right' ? 'text-white' : 'text-slate-400'}`}>
                 {userLanguage}
               </span>
               {topSwitchState === 'right' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
               )}
             </div>
          </button>

      </div>
    </div>
  );
};

export default HeaderControls;