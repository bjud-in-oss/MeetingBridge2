import React, { useState, useEffect } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { useWakeLock } from './hooks/useWakeLock';
import TranscriptView from './components/TranscriptView';
import OnboardingModal from './components/OnboardingModal';
import HeaderControls from './components/HeaderControls';
import StatsModal from './components/StatsModal';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import ControlBar from './components/ControlBar';

// Fullständig språklista
const ALL_LANGUAGES = [
  "Afrikaans", "Albanska", "Amhariska", "Arabiska", "Armeniska", "Azerbajdzjanska", "Baskiska", "Vitryska", "Bengali", "Bosniska", "Bulgariska", "Katalanska", "Cebuano", "Kinesiska (Förenklad)", "Kinesiska (Traditionell)", "Korsikanska", "Kroatiska", "Tjeckiska", "Danska", "Nederländska", "Engelska", "Esperanto", "Estniska", "Finska", "Franska", "Frisiska", "Galiciska", "Georgiska", "Tyska", "Grekiska", "Gujarati", "Haitisk kreol", "Hausa", "Hawaiiska", "Hebreiska", "Hindi", "Hmong", "Ungerska", "Isländska", "Igbo", "Indonesiska", "Irländska", "Italienska", "Japanska", "Javanesiska", "Kannada", "Kazakiska", "Khmer", "Koreanska", "Kurdiska", "Kirgiziska", "Lao", "Latin", "Lettiska", "Litauiska", "Luxemburgska", "Makedonska", "Madagaskiska", "Malajiska", "Malayalam", "Maltesiska", "Maori", "Marathi", "Mongoliska", "Burmesiska", "Nepalesiska", "Norska", "Nyanja", "Pashto", "Persiska", "Polska", "Portugisiska", "Punjabi", "Rumänska", "Ryska", "Samoanska", "Skotsk gäliska", "Serbiska", "Sesotho", "Shona", "Sindhi", "Singalesiska", "Slovakiska", "Slovenska", "Somaliska", "Spanska", "Sundanesiska", "Swahili", "Svenska", "Tagalog (Filipino)", "Tadzjikiska", "Tamil", "Telugu", "Thailändska", "Turkiska", "Ukrainska", "Urdu", "Uzbekiska", "Vietnamesiska", "Walesiska", "Xhosa", "Jiddisch", "Yoruba", "Zulu"
];

const App: React.FC = () => {
  // Initiera Wake Lock hooken
  const { requestLock, releaseLock } = useWakeLock();

  // Debug mount
  useEffect(() => {
    console.log("App Component Mounted Successfully");
  }, []);

  const { 
    status, 
    connect, 
    disconnect, 
    transcripts, 
    currentVol, 
    error,
    setTargetLanguages,
    targetLanguages,
    queueStats,
    currentPlaybackRate,
    paceStatus,
    currentLatency,
    activeMode,
    setMode,
    currentRoom,
    setCurrentRoom,
    packetEvents
  } = useGeminiLive();

  // Hantera Wake Lock baserat på activeMode
  useEffect(() => {
    if (activeMode !== 'off') {
        // Försök låsa skärmen när vi startar en session (Translate eller Transcribe)
        requestLock();
    } else {
        // Släpp låset när vi är offline
        releaseLock();
    }
  }, [activeMode, requestLock, releaseLock]);

  // Local UI State
  const [topSwitchState, setTopSwitchState] = useState<'left' | 'center' | 'right'>('center');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const handleSaveLanguages = (langs: string[]) => setTargetLanguages(langs);
  const handleOnboardingComplete = (lang: string) => setTargetLanguages([lang]);

  return (
    <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans relative flex flex-col items-center justify-center">
      
      <OnboardingModal 
        allLanguages={ALL_LANGUAGES} 
        onComplete={handleOnboardingComplete} 
      />

      <div className="absolute top-4 w-full z-50">
        <HeaderControls 
            currentRoom={currentRoom}
            onRoomChange={setCurrentRoom}
            topSwitchState={topSwitchState}
            onTopSwitchChange={setTopSwitchState}
            userLanguage={targetLanguages.length > 1 ? `${targetLanguages.length} Språk` : targetLanguages[0] || 'Välj'}
            onOpenLangModal={() => setShowLangModal(true)}
        />
      </div>

      <LanguageSelectorModal 
        isOpen={showLangModal}
        onClose={() => setShowLangModal(false)}
        onSave={handleSaveLanguages}
        currentLanguages={targetLanguages} 
        allLanguages={ALL_LANGUAGES}
      />

      {showStatsModal && (
          <StatsModal 
            onClose={() => setShowStatsModal(false)}
            status={status}
            queueStats={queueStats}
            currentPlaybackRate={currentPlaybackRate}
            paceStatus={paceStatus}
          />
      )}

      {error && (
          <div className="absolute top-32 left-4 right-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 z-30 text-center backdrop-blur-md">
              <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
      )}

      <div className="flex-1 w-full relative z-10 mt-4">
          <TranscriptView 
            transcripts={transcripts} 
            activeGroupId={null} 
            isAiBusy={packetEvents.receiving}
          />
      </div>

      <ControlBar 
        activeMode={activeMode}
        setMode={setMode}
        currentLatency={currentLatency}
        onToggleStats={() => setShowStatsModal(!showStatsModal)}
      />
    </div>
  );
};

export default App;