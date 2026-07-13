import React from 'react';
import { useAudio } from '../components/AudioContext';

export default function MusicControl() {
  const { isPlaying, volume, toggleMusic, changeVolume } = useAudio();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeVolume(parseFloat(e.target.value));
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '40px',
      right: '40px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: 'rgba(30, 30, 30, 0.85)',
      padding: '10px 15px',
      borderRadius: '50px',
      backdropFilter: 'blur(5px)',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <button 
        onClick={toggleMusic}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
      >
        {isPlaying ? '🎵' : '🔇'}
      </button>

      <input 
        type="range" 
        min="0" 
        max="1" 
        step="0.01" 
        value={volume} 
        onChange={handleVolumeChange}
        style={{ width: '80px', cursor: 'pointer', accentColor: '#fff' }}
      />
      
      <span style={{ fontSize: '11px', minWidth: '28px', textAlign: 'right' }}>
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}