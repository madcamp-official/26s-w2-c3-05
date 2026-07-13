import { useState, useEffect } from 'react';
import { panel, primaryBtn, Divider, Seal, Backdrop, GOLD } from '../components/ui';

import { useAudio } from '../components/AudioContext';

export default function LoginPage({ onEnter }: { onEnter: (nick: string) => void }) {
  const [nick, setNick] = useState('');
  const can = nick.trim().length > 0;
  const submit = () => {
    if (can) onEnter(nick.trim());
  };

  const { setMusicSrc } = useAudio();
  useEffect(() => {
    // 홈 페이지에 오면 쾌활한 음악으로 변경
    setMusicSrc('/music/lobby_theme.mp3');
  }, [setMusicSrc]);

  return (
    <Backdrop
      image="/assets/bg-login.png"
      overlay="linear-gradient(180deg, rgba(16,7,5,.45) 0%, rgba(16,7,5,.62) 55%, rgba(16,7,5,.8) 100%)"
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeUp .7s ease both',
        }}
      >
        <Seal char="宮" size={58} />
        <div
          style={{
            marginTop: 20,
            fontFamily: "'Song Myung', serif",
            fontSize: 60,
            color: '#eed9a4',
            letterSpacing: 18,
            textIndent: 18,
            textShadow: '0 3px 18px rgba(0,0,0,.6)',
          }}
        >
          황궁야화
        </div>
        <div style={{ marginTop: 10, color: 'rgba(238,217,164,.75)', fontSize: 13, letterSpacing: 7, textIndent: 7 }}>
          皇 宮 夜 話 · 밤 의 연 회
        </div>
        <div
          style={{
            ...panel,
            marginTop: 44,
            width: 420,
            maxWidth: 'calc(100vw - 48px)',
            padding: '36px 36px 32px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ textAlign: 'center', color: '#f0e2bf', fontSize: 17, fontWeight: 600 }}>
            궁에 드시려면 이름을 남기소서
          </div>
          <Divider />
          <label htmlFor="nick" style={{ color: GOLD(0.85), fontSize: 13, letterSpacing: 2, marginBottom: 8 }}>
            궁호(宮號)
          </label>
          <input
            id="nick"
            value={nick}
            maxLength={10}
            placeholder="예) 설연화"
            onChange={(e) => setNick(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={{
              background: 'rgba(12,5,4,.6)',
              border: `1px solid ${GOLD(0.4)}`,
              borderRadius: 8,
              padding: '14px 16px',
              color: '#f5e9cf',
              fontSize: 16,
              letterSpacing: 1,
            }}
          />
          <button
            onClick={submit}
            disabled={!can}
            style={{
              ...primaryBtn,
              marginTop: 16,
              padding: 14,
              fontSize: 16,
              letterSpacing: 4,
              opacity: can ? 1 : 0.5,
            }}
          >
            입궁하기
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
