import { useRef, useCallback } from 'react';

export function useWakeLock() {
  const wakeLock = useRef<any>(null);
  const isSupported = useRef(true);

  const requestLock = useCallback(async () => {
    // Om webbläsaren inte stödjer det eller vi redan blivit nekade, gör inget.
    if (!('wakeLock' in navigator) || !isSupported.current) return;
    
    // API:et kräver att dokumentet är synligt för att aktiveras
    if (document.visibilityState !== 'visible') return;

    try {
      wakeLock.current = await (navigator as any).wakeLock.request('screen');
      // console.log('Wake Lock active'); 
    } catch (err: any) {
       // Om det är ett policy-fel (NotAllowedError), markera funktionen som inaktiv
       if (err.name === 'NotAllowedError') {
         isSupported.current = false;
         // Tystar loggen här eftersom vi förväntar oss detta i vissa iframes
       } else {
         console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
       }
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLock.current) {
      try {
        await wakeLock.current.release();
        wakeLock.current = null;
      } catch (e) {
        // Ignore release errors
      }
    }
  }, []);

  // Vi returnerar funktionerna så att komponenten (App.tsx) får bestämma NÄR det ska låsas.
  // Vi kör ingen useEffect här.
  return { requestLock, releaseLock };
}