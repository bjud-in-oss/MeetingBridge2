import React, { useState, useEffect } from 'react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (languages: string[]) => void;
  currentLanguages: string[];
  allLanguages: string[];
}

// Helper to match logic in App.tsx - using full name now
const getApiLang = (lang: string) => lang;

const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentLanguages,
  allLanguages
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedLangs, setTempSelectedLangs] = useState<string[]>([]);

  // Initialize temp langs when modal opens or currentLanguages changes
  useEffect(() => {
    if (isOpen) {
      setTempSelectedLangs([...currentLanguages]);
    }
  }, [isOpen, currentLanguages]);

  const toggleLanguage = (lang: string) => {
    setTempSelectedLangs(prev => {
      // Logic handles full names in UI vs API names logic
      // We store the full name string from the UI list here
      if (prev.includes(lang)) {
        return prev.filter(l => l !== lang);
      } else {
        return [...prev, lang];
      }
    });
  };

  const handleSave = () => {
    // Convert to API format before sending back
    const apiLangs = tempSelectedLangs.map(getApiLang);
    onSave(apiLangs);
    onClose();
  };

  if (!isOpen) return null;

  const filteredLangs = allLanguages.filter(l => 
    l.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Välj Språk (Flerval)</h2>
          <button onClick={handleSave} className="text-indigo-400 font-bold text-sm hover:text-indigo-300">KLAR</button>
        </div>
        <div className="p-4 border-b border-slate-800">
          <input 
            type="text" 
            placeholder="Sök..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          {filteredLangs.map(lang => {
            const isSelected = tempSelectedLangs.includes(lang);
            return (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex justify-between items-center transition-all ${
                  isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{lang}</span>
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorModal;