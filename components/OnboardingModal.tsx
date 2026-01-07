import React, { useState, useEffect } from 'react';

interface OnboardingModalProps {
  allLanguages: string[];
  onComplete: (lang: string) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ allLanguages, onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('Svenska');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
    onComplete(selectedLang);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const filteredLangs = allLanguages.filter(l => 
    l.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <div className="p-6 text-center border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-2">Välkommen</h2>
          <p className="text-slate-400 text-sm">Välj ditt språk för att komma igång</p>
        </div>

        <div className="p-4 border-b border-slate-800">
           <input 
              type="text" 
              placeholder="Sök språk..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          {filteredLangs.map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all ${
                selectedLang === lang 
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer justify-center">
            <input 
              type="checkbox" 
              checked={dontShowAgain} 
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-700"
            />
            <span className="text-sm text-slate-400">Visa inte igen</span>
          </label>

          <button 
            onClick={handleFinish}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            Kom igång
          </button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;