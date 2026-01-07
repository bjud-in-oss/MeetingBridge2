import { useState, useRef, useCallback, useEffect } from 'react';
// Robust import strategy for CDN compatibility
import * as GenAIModule from '@google/genai';
import { createPcmBlob, decodeBase64, decodeAudioData } from '../utils/audioUtils';
import { TranscriptItem, ConnectionStatus } from '../types';

// Extract exports safely to handle different CDN bundle structures
const GoogleGenAI = GenAIModule.GoogleGenAI || (GenAIModule as any).default?.GoogleGenAI;
const Modality = GenAIModule.Modality || (GenAIModule as any).default?.Modality;

interface QueueStats {
    total: number;
    inQueue: number;
    processing: number;
    outQueue: number;
}

interface UseGeminiLiveReturn {
  status: ConnectionStatus;
  connect: (mode: 'translate' | 'transcribe') => Promise<void>;
  disconnect: () => void;
  transcripts: TranscriptItem[];
  currentVol: number;
  error: string | null;
  setTargetLanguages: (langs: string[]) => void;
  targetLanguages: string[];
  
  // Queue Diagnostics
  queueStats: QueueStats;
  currentPlaybackRate: number;
  paceStatus: 'Normal' | 'Accelerating';
  currentLatency: number;

  // Controls
  activeMode: 'translate' | 'transcribe' | 'off';
  setMode: (mode: 'translate' | 'transcribe' | 'off') => void;
  currentRoom: string;
  setCurrentRoom: (room: string) => void;
  packetEvents: { sending: boolean; receiving: boolean };
}

// Configuration
const ROBUST_SILENCE_THRESHOLD_MS = 2000; // Increased to 2s to allow breathing room during long speeches
const MAX_PHRASE_DURATION_MS = 1000; // Reduced to 1s to stream continuously instead of buffering
const VAD_RMS_THRESHOLD = 0.008; 
const MIC_AUTO_TIMEOUT_MS = 4000; 

// REGULATION CONFIG
const LATENCY_NORMAL_THRESHOLD = 6.0;
const LATENCY_PACE_THRESHOLD = 10.0;
const LATENCY_PITCH_THRESHOLD = 20.0;
const MAX_PLAYBACK_RATE = 1.2; 

interface QueueItem {
    blob: any; // Using any to avoid types conflicts
    id: number;
    targetLanguages: string[];
}

interface OutputItem {
    buffer: AudioBuffer;
    duration: number;
    groupId: number; 
    targetLanguages?: string[]; 
}

export function useGeminiLive(): UseGeminiLiveReturn {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentVol, setCurrentVol] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['Svenska']);
  const [currentRoom, setCurrentRoom] = useState("Stora salen");
  const [packetEvents, setPacketEvents] = useState({ sending: false, receiving: false });
  
  // Controls
  const [activeMode, setActiveMode] = useState<'translate' | 'transcribe' | 'off'>('off');

  // Queue Visualization State
  const [queueStats, setQueueStats] = useState<QueueStats>({ total: 0, inQueue: 0, processing: 0, outQueue: 0 });
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
  const [paceStatus, setPaceStatus] = useState<'Normal' | 'Accelerating'>('Normal');
  const [currentLatency, setCurrentLatency] = useState<number>(0);

  // Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any | null>(null);
  
  // QUEUES
  const inputQueueRef = useRef<QueueItem[]>([]);
  const outputQueueRef = useRef<OutputItem[]>([]);
  const groupStartTimesRef = useRef<Map<number, number>>(new Map());
  
  // LOGIC STATE
  const targetPlaybackRateRef = useRef<number>(1.0);
  const currentLatencyRef = useRef<number>(0);

  // ID TRACKING
  const phraseCounterRef = useRef<number>(0); 
  const modelProcessedGroupIdRef = useRef<number>(0); 
  const playedGroupIdRef = useRef<number>(0);

  // STATE FLAGS
  const currentRecordingBufferRef = useRef<Float32Array[]>([]); 
  const isRecordingPhraseRef = useRef<boolean>(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const phraseStartTimeRef = useRef<number>(0);
  
  const currentTranscriptIdRef = useRef<string | null>(null);
  
  const isPlayingRef = useRef<boolean>(false);
  const nextPlayTimeRef = useRef<number>(0);
  
  const targetLanguagesRef = useRef(targetLanguages);
  const activeModeRef = useRef(activeMode);
  const currentRoomRef = useRef(currentRoom);

  // Beep Sound
  const playSilenceBeep = () => {
      try {
        if (!outputContextRef.current) return;
        const ctx = outputContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); 
        
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
      } catch (e) {
          console.error("Beep failed", e);
      }
  };

  useEffect(() => {
    targetLanguagesRef.current = targetLanguages;
  }, [targetLanguages]);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // --- IDLE CHECK (Reset Latency) ---
  useEffect(() => {
    const interval = setInterval(() => {
        const isIdle = 
            inputQueueRef.current.length === 0 &&
            outputQueueRef.current.length === 0 &&
            !isPlayingRef.current &&
            !isRecordingPhraseRef.current &&
            currentLatencyRef.current > 0;

        if (isIdle) {
             const pending = phraseCounterRef.current - playedGroupIdRef.current;
             if (pending <= 0) {
                 setCurrentLatency(0);
                 currentLatencyRef.current = 0;
             }
        }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateQueueStats = useCallback(() => {
      const inQueue = inputQueueRef.current.length;
      const outQueue = outputQueueRef.current.length;
      const processing = Math.max(0, phraseCounterRef.current - inQueue - modelProcessedGroupIdRef.current);
      const total = inQueue + processing + outQueue;
      
      setQueueStats({ total, inQueue, processing, outQueue });
  }, []);


  // --- CONNECTION LOGIC ---

  const disconnect = useCallback(() => {
    setStatus(ConnectionStatus.DISCONNECTED);
    
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }
    if (sessionRef.current) {
        try {
           sessionRef.current.close();
        } catch (e) { console.log("Session already closed"); }
        sessionRef.current = null;
    }

    inputQueueRef.current = [];
    outputQueueRef.current = [];
    currentRecordingBufferRef.current = [];
    groupStartTimesRef.current.clear();

    setQueueStats({ total: 0, inQueue: 0, processing: 0, outQueue: 0 });
    currentTranscriptIdRef.current = null;
    
    targetPlaybackRateRef.current = 1.0;
    nextPlayTimeRef.current = 0;
    setPaceStatus('Normal');
    setCurrentLatency(0);
    currentLatencyRef.current = 0;
    
    phraseCounterRef.current = 0;
    modelProcessedGroupIdRef.current = 0;
    playedGroupIdRef.current = 0;
    
  }, []);

  const setMode = useCallback((mode: 'translate' | 'transcribe' | 'off') => {
      const previousMode = activeModeRef.current;
      setActiveMode(mode);

      // Play beep if switching FROM transcribe TO translate (manually)
      if (previousMode === 'transcribe' && mode === 'translate') {
          playSilenceBeep();
      }

      if (mode === 'off') {
          disconnect();
      } else if (status === ConnectionStatus.DISCONNECTED) {
          connect(mode);
      }
      
      // Resume context if switching to translate
      if (mode === 'translate' && outputContextRef.current?.state === 'suspended') {
          outputContextRef.current.resume();
      }
      // Suspend context if switching to transcribe (don't want to hear AI)
      if (mode === 'transcribe' && outputContextRef.current?.state === 'running') {
          outputContextRef.current.suspend();
      }

  }, [status, disconnect]);

  // --- INPUT PROCESSOR ---
  
  const processInputQueue = useCallback(() => {
      if (inputQueueRef.current.length === 0) return;
      if (!sessionRef.current) return;

      updateQueueStats();

      // --- LATENCY REGULATION LOGIC ---
      const lat = currentLatencyRef.current;

      if (lat > LATENCY_PACE_THRESHOLD) {
          setPaceStatus('Accelerating');
          if (Math.random() < 0.1) {
             try {
                sessionRef.current.sendRealtimeInput({ text: "[SYSTEM: SUMMARIZE_AND_SPEED_UP]" });
             } catch(e) {}
          }
      } else {
          setPaceStatus('Normal');
      }

      if (lat > LATENCY_PITCH_THRESHOLD) {
          targetPlaybackRateRef.current = Math.min(MAX_PLAYBACK_RATE, targetPlaybackRateRef.current + 0.05);
      } else if (lat < LATENCY_NORMAL_THRESHOLD) {
          targetPlaybackRateRef.current = Math.max(1.0, targetPlaybackRateRef.current - 0.05);
      }
      setCurrentPlaybackRate(parseFloat(targetPlaybackRateRef.current.toFixed(2)));

      const item = inputQueueRef.current.shift();
      
      if (item) {
          try {
            // Trigger Visual Event
            setPacketEvents(prev => ({ ...prev, sending: !prev.sending }));
            sessionRef.current.sendRealtimeInput({ media: item.blob });
          } catch (e: any) {
              console.error("Failed to send audio", e);
              setError("Connection interrupted");
              disconnect();
              setActiveMode('off');
              return;
          }
          
          if (inputQueueRef.current.length > 0) {
              setTimeout(processInputQueue, 50); 
          }
      }
  }, [disconnect, updateQueueStats]); 

  // --- AUDIO PLAYBACK ---

  const processOutputQueue = useCallback(async () => {
    if (outputQueueRef.current.length === 0) {
      if (!isPlayingRef.current) {
          // Idle
      }
      return;
    }

    if (isPlayingRef.current || !outputContextRef.current) return;

    // Check for auto-switch trigger if we are in 'transcribe' mode and in Local Room
    // If we receive audio, it means translation is happening.
    if (activeModeRef.current === 'transcribe' && currentRoomRef.current === "Lokalt i min mobil") {
        console.log("Audio received while in Transcribe mode (Local). Switching to Speaker.");
        playSilenceBeep();
        setActiveMode('translate'); // Switch to speaker
        
        // Ensure context is resumed
        if (outputContextRef.current.state === 'suspended') {
            await outputContextRef.current.resume();
        }
    }

    isPlayingRef.current = true;
    
    // Resume/Suspend based on mode
    const ctx = outputContextRef.current;
    if (activeModeRef.current === 'translate') {
         if (ctx.state === 'suspended') await ctx.resume();
    } else {
         if (ctx.state === 'running') await ctx.suspend();
    }

    const item = outputQueueRef.current.shift();
    updateQueueStats();

    if (!item) {
        isPlayingRef.current = false;
        return;
    }

    // Trigger Visual Event
    setPacketEvents(prev => ({ ...prev, receiving: !prev.receiving }));

    // Latency Calculation
    const startTime = groupStartTimesRef.current.get(item.groupId);
    if (startTime) {
      const latencySec = (Date.now() - startTime) / 1000;
      setCurrentLatency(latencySec);
      currentLatencyRef.current = latencySec;
    }
    
    playedGroupIdRef.current = item.groupId;

    const source = ctx.createBufferSource();
    source.buffer = item.buffer;
    source.playbackRate.value = targetPlaybackRateRef.current;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    
    let playAt = Math.max(now, nextPlayTimeRef.current);
    if (playAt - now > 0.5) {
        playAt = now; 
    }

    source.start(playAt);
    
    const realDuration = item.duration / source.playbackRate.value;
    nextPlayTimeRef.current = playAt + realDuration;

    source.onended = () => {
        isPlayingRef.current = false;
        processOutputQueue(); 
    };

  }, [processInputQueue, updateQueueStats, setActiveMode]);


  // --- HELPERS ---

  const addToOutputQueue = useCallback(async (base64String: string, groupId: number) => {
     try {
      if (!outputContextRef.current) {
        outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = outputContextRef.current;
      const pcmData = decodeBase64(base64String);
      const audioBuffer = await decodeAudioData(pcmData, ctx, 24000, 1);
      
      outputQueueRef.current.push({ 
        buffer: audioBuffer, 
        duration: audioBuffer.duration,
        groupId: groupId,
        targetLanguages: targetLanguagesRef.current 
      });
      updateQueueStats();
      
      processOutputQueue();
     } catch (e) {
       console.error("Error decoding audio", e);
     }
  }, [processOutputQueue, updateQueueStats]);

  const commitCurrentRecording = useCallback((isContinuous: boolean = false) => {
    if (currentRecordingBufferRef.current.length === 0) return;

    const totalLength = currentRecordingBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of currentRecordingBufferRef.current) {
        result.set(arr, offset);
        offset += arr.length;
    }
    const pcmBlob = createPcmBlob(result);
    
    phraseCounterRef.current += 1;
    const newId = phraseCounterRef.current;

    // Buffer one input item, tagged with all target languages
    // Backend/System instruction handles the "copy" logic essentially by generating for all.
    inputQueueRef.current.push({ 
        blob: pcmBlob, 
        id: newId,
        targetLanguages: targetLanguagesRef.current
    });
    updateQueueStats();
    
    processInputQueue();

    // IMPORTANT: If we are just streaming a chunk of a long speech, DO NOT reset the transcript ID.
    // This allows the transcript view to append the text to the same "bubble".
    if (!isContinuous) {
        currentTranscriptIdRef.current = null;
    }
    
    currentRecordingBufferRef.current = [];
    isRecordingPhraseRef.current = false;

  }, [processInputQueue, updateQueueStats]);

  const connect = useCallback(async (initialMode: 'translate' | 'transcribe') => {
    if (status !== ConnectionStatus.DISCONNECTED) return;
    setStatus(ConnectionStatus.CONNECTING);
    setError(null);
    setTranscripts([]);
    
    phraseCounterRef.current = 0;
    modelProcessedGroupIdRef.current = 0;

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY missing");

        const ai = new GoogleGenAI({ apiKey });
        
        // Dynamic System Instruction for Multiple Languages
        const langs = targetLanguagesRef.current.join(', ');
        const systemInstruction = `You are a simultaneous interpreter. Translate the user's speech into ${langs}. If multiple languages are selected, speak the translation for each language sequentially. Output only the translated audio. Do not respond to the content, just translate.`;

        const config = {
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
              },
              systemInstruction: systemInstruction,
            },
        };

        const session = await ai.live.connect({
            ...config,
            callbacks: {
                onopen: () => {
                    console.log("Session Connected");
                    setStatus(ConnectionStatus.CONNECTED);
                    lastSpeechTimeRef.current = Date.now(); 
                },
                onmessage: async (message: any) => {
                    const serverContent = message.serverContent;
                    
                    if (serverContent?.modelTurn?.parts) {
                        for (const part of serverContent.modelTurn.parts) {
                            if (part.inlineData?.data) {
                                addToOutputQueue(part.inlineData.data, phraseCounterRef.current);
                            }
                        }
                    }
                    
                    if (serverContent?.inputTranscription?.text) {
                         const text = serverContent.inputTranscription.text;
                         setTranscripts(prev => {
                             const newTranscripts = [...prev];
                             const groupId = phraseCounterRef.current;
                             
                             if (currentTranscriptIdRef.current && newTranscripts.length > 0) {
                                 const lastIndex = newTranscripts.length - 1;
                                 if (newTranscripts[lastIndex].id === currentTranscriptIdRef.current) {
                                     newTranscripts[lastIndex] = {
                                         ...newTranscripts[lastIndex],
                                         text: newTranscripts[lastIndex].text + text 
                                     };
                                     return newTranscripts;
                                 }
                             }
                             
                             const newId = Date.now().toString();
                             currentTranscriptIdRef.current = newId;
                             return [...newTranscripts, {
                                 id: newId,
                                 groupId: groupId, 
                                 role: 'user',
                                 text: text,
                                 timestamp: new Date()
                             }];
                         });
                    }

                    if (serverContent?.turnComplete) {
                        modelProcessedGroupIdRef.current += 1;
                        updateQueueStats();
                    }
                },
                onclose: (e) => {
                    console.log("Session closed", e);
                    if (sessionRef.current) disconnect();
                    setActiveMode('off');
                },
                onerror: (e: any) => {
                    console.error("Session error", e);
                    setError(e.message || "Network Error");
                    disconnect();
                    setActiveMode('off');
                }
            }
        });

        sessionRef.current = session;

        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000
            } 
        });
        streamRef.current = stream;
        
        const source = inputContextRef.current.createMediaStreamSource(stream);
        const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (activeModeRef.current === 'off') return; 

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Volume
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            setCurrentVol(Math.min(rms * 5, 1)); 

            const now = Date.now();
            const isSpeaking = rms > VAD_RMS_THRESHOLD;

            if (isSpeaking) {
                lastSpeechTimeRef.current = now;
                
                if (!isRecordingPhraseRef.current) {
                    isRecordingPhraseRef.current = true;
                    phraseStartTimeRef.current = now;
                    groupStartTimesRef.current.set(phraseCounterRef.current + 1, now);
                }
            } else {
                // Silence Detection Logic for Auto-Switch (Local Room Only)
                const silenceDuration = now - lastSpeechTimeRef.current;
                
                if (activeModeRef.current === 'transcribe' && currentRoomRef.current === "Lokalt i min mobil" && silenceDuration > MIC_AUTO_TIMEOUT_MS) {
                    console.log("Auto-switch timeout");
                    playSilenceBeep();
                    setActiveMode('translate'); // Switch back to speaker
                    lastSpeechTimeRef.current = now; 
                }
            }

            if (isRecordingPhraseRef.current) {
                currentRecordingBufferRef.current.push(new Float32Array(inputData));

                const phraseDuration = now - phraseStartTimeRef.current;
                const silenceDuration = now - lastSpeechTimeRef.current;
                
                if (silenceDuration > ROBUST_SILENCE_THRESHOLD_MS) {
                    // Real silence, end the sentence block
                    commitCurrentRecording(false);
                } 
                // FORCE COMMIT IF SPEAKING TOO LONG (Supports 20+ min continuous speech)
                else if (phraseDuration > MAX_PHRASE_DURATION_MS) {
                    // Continuous speech, keep the transcript block open (true)
                    commitCurrentRecording(true);
                    
                    // Immediately restart next chunk without losing data
                    isRecordingPhraseRef.current = true;
                    phraseStartTimeRef.current = now;
                    groupStartTimesRef.current.set(phraseCounterRef.current + 1, now);
                }
            }
        };

        source.connect(processor);
        processor.connect(inputContextRef.current.destination);

    } catch (e: any) {
        console.error(e);
        setError(e.message);
        disconnect();
        setActiveMode('off');
    }
  }, [status, disconnect, addToOutputQueue, commitCurrentRecording, processInputQueue, updateQueueStats]); 

  return {
    status,
    connect: (mode) => connect(mode),
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
  };
}