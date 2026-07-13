import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  volume: number;
  currentSrc: string;
  toggleMusic: () => void;
  changeVolume: (value: number) => void;
  setMusicSrc: (src: string) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 🌟 NodeJS.Timeout 대신 브라우저의 타이머 ID 타입(number)으로 변경
  const fadeIntervalRef = useRef<number | null>(null); 

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  
  const [masterVolume, setMasterVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('bgm_volume');
      return savedVolume ? parseFloat(savedVolume) : 0.5;
    }
    return 0.5;
  });

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = masterVolume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      // 🌟 window.clearInterval 명시
      if (fadeIntervalRef.current) window.clearInterval(fadeIntervalRef.current);
    };
  }, []);

  // 페이드 효과 함수
  const runFade = (targetVolume: number, duration: number, callback?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;

    // 🌟 새로운 타이머 시작 전 기존 타이머를 window.clearInterval로 제거
    if (fadeIntervalRef.current) window.clearInterval(fadeIntervalRef.current);

    const stepTime = 50; 
    const steps = duration / stepTime;
    const volumeStep = (targetVolume - audio.volume) / steps;

    // 🌟 브라우저 전역 객체인 window.setInterval을 명시적으로 사용
    fadeIntervalRef.current = window.setInterval(() => {
      const nextVolume = audio.volume + volumeStep;

      if ((volumeStep > 0 && nextVolume >= targetVolume) || (volumeStep < 0 && nextVolume <= targetVolume)) {
        audio.volume = targetVolume;
        if (fadeIntervalRef.current) {
          window.clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (callback) callback();
      } else {
        audio.volume = Math.max(0, Math.min(1, nextVolume));
      }
    }, stepTime);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSrc) return;

    if (!isPlaying) {
      audio.src = currentSrc;
      audio.load();
      return;
    }

    runFade(0, 400, () => {
      audio.pause();
      audio.src = currentSrc;
      audio.load();

      audio.play()
        .then(() => {
          runFade(masterVolume, 600);
        })
        .catch((err) => {
          console.log("자동 재생 제한:", err);
          setIsPlaying(false);
        });
    });
  }, [currentSrc]);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio || !currentSrc) return;

    if (isPlaying) {
      runFade(0, 300, () => {
        audio.pause();
        setIsPlaying(false);
      });
    } else {
      audio.volume = 0;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          runFade(masterVolume, 500);
        })
        .catch((err) => console.error(err));
    }
  };

  const changeVolume = (value: number) => {
    setMasterVolume(value);
    localStorage.setItem('bgm_volume', value.toString());

    if (audioRef.current && isPlaying && !fadeIntervalRef.current) {
      audioRef.current.volume = value;
    }
  };

  return (
    <AudioContext.Provider value={{ isPlaying, volume: masterVolume, currentSrc, toggleMusic, changeVolume, setMusicSrc: (src) => currentSrc !== src && setCurrentSrc(src) }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio는 AudioProvider 안에서 사용해야 합니다.');
  return context;
}