import { useCallback, useEffect, useRef, useState } from 'react';

type SoundType = 'complete' | 'complete-medium' | 'complete-hard' | 
                 'streak-milestone' | 'level-up' | 'whoosh';

export const useSound = () => {
  const audioCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Preload sounds
    const sounds: SoundType[] = [
      'complete', 'complete-medium', 'complete-hard',
      'streak-milestone', 'level-up', 'whoosh'
    ];
    
    sounds.forEach(sound => {
      const audio = new Audio(`/sounds/${sound}.mp3`);
      audio.preload = 'auto';
      audioCache.current.set(sound, audio);
    });
    
    // Check localStorage for user preference
    const preference = localStorage.getItem('sounds-enabled');
    setSoundEnabled(preference !== 'false');
  }, []);

  const play = useCallback((sound: SoundType, volume = 1) => {
    if (!soundEnabled) return;
    
    const audio = audioCache.current.get(sound);
    if (!audio) return;
    
    audio.volume = Math.min(volume, 1);
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn('Sound playback failed:', err);
    });
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('sounds-enabled', String(newState));
  }, [soundEnabled]);

  return { play, toggleSound, soundEnabled };
};
