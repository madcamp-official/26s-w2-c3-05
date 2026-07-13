import { useState } from 'react';
import { useAudio } from './AudioContext';

// 모든 페이지 우하단에 떠 있는 사운드 설정 버튼
// - 스피커 버튼 클릭 → 패널 열림 (BGM on/off + 음량 슬라이더)
// - 첫 클릭이 유저 제스처가 되므로 브라우저 자동재생 제한도 자연스럽게 풀림
export function SoundControl() {
  const { isPlaying, volume, toggleMusic, changeVolume } = useAudio();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1000 }}>
      {/* 설정 패널 */}
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 56,
            width: 200,
            padding: '14px 16px',
            background: 'rgba(20, 14, 8, 0.92)',
            border: '1px solid rgba(238, 217, 164, 0.35)',
            borderRadius: 12,
            color: '#eed9a4',
            fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,.4)',
          }}
        >
          {/* on/off */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>배경 음악</span>
            <button
              onClick={toggleMusic}
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid rgba(238,217,164,.5)',
                background: isPlaying ? '#eed9a4' : 'transparent',
                color: isPlaying ? '#1d140b' : '#eed9a4',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {isPlaying ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 음량 슬라이더 */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>음량</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#eed9a4' }}
            />
          </div>
        </div>
      )}

      {/* 스피커 토글 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="사운드 설정"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid rgba(238,217,164,.5)',
          background: 'rgba(20, 14, 8, 0.85)',
          color: '#eed9a4',
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,.35)',
        }}
      >
        {isPlaying ? '🔊' : '🔇'}
      </button>
    </div>
  );
}