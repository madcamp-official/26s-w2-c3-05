import type { Scores } from '../types/game';
import { BOTS, RANK_HANJA } from '../constants/game';
import { Divider, Backdrop, GOLD, primaryBtn, ghostBtn, panel } from '../components/ui';

import { useEffect } from 'react';
import { useAudio } from '../components/AudioContext';

export default function ResultPage({
  nick,
  scores,
  onLobby,
  onAgain,
}: {
  nick: string;
  scores: Scores;
  onLobby: () => void;
  onAgain: () => void;
}) {
  const names = [nick, ...BOTS.map((b) => b.name)];
  const sorted = names.map((n) => ({ name: n, score: scores[n] ?? 0 })).sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const { setMusicSrc } = useAudio();
    useEffect(() => {
        // 홈 페이지에 오면 쾌활한 음악으로 변경
        setMusicSrc('../../public/assets/bgm/bgm_result.mp3');
      }, [setMusicSrc]);

  return (
    <Backdrop
      image="/assets/bg-result.png"
      overlay="linear-gradient(180deg, rgba(20,10,7,.3) 0%, rgba(20,10,7,.55) 100%)"
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div
          style={{
            ...panel,
            background: 'rgba(22,9,7,.85)',
            width: 520,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
            padding: '38px 40px 34px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'fadeUp .6s ease both',
          }}
        >
          <div style={{ color: '#eed9a4', fontSize: 34 }}>♕</div>
          <div style={{ marginTop: 10, color: 'rgba(240,226,191,.8)', fontSize: 15, letterSpacing: 2 }}>
            연회가 무사히 마무리되었사옵니다
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: "'Song Myung', serif",
              fontSize: 44,
              color: '#eed9a4',
              letterSpacing: 8,
              textIndent: 8,
            }}
          >
            {winner.name}
          </div>
          <div
            style={{
              marginTop: 8,
              padding: '5px 16px',
              borderRadius: 999,
              border: `1px solid ${GOLD(0.5)}`,
              color: '#f0e2bf',
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            오늘 밤 가장 빛난 이 · 어점 {winner.score}점
          </div>
          <div style={{ width: '100%' }}>
            <Divider margin="26px 0 18px" />
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((k, i) => (
              <div
                key={k.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: i === 0 ? GOLD(0.12) : 'rgba(12,5,4,.4)',
                  border: `1px solid ${i === 0 ? GOLD(0.6) : GOLD(0.2)}`,
                }}
              >
                <div
                  style={{
                    width: 26,
                    color: i === 0 ? '#eed9a4' : 'rgba(240,226,191,.5)',
                    fontFamily: "'Song Myung', serif",
                    fontSize: 16,
                    textAlign: 'center',
                  }}
                >
                  {RANK_HANJA[i] ?? i + 1}
                </div>
                <div style={{ flex: 1, color: '#f0e2bf', fontSize: 14.5, fontWeight: 600 }}>
                  {k.name}{' '}
                  {k.name === nick && <span style={{ color: 'rgba(238,217,164,.5)', fontSize: 11.5 }}>(나)</span>}
                </div>
                <div style={{ color: '#eed9a4', fontSize: 13.5 }}>✦ {k.score}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 26, width: '100%' }}>
            <button onClick={onLobby} style={{ ...ghostBtn, flex: 1, padding: 13, fontSize: 14, letterSpacing: 2 }}>
              로비로
            </button>
            <button onClick={onAgain} style={{ ...primaryBtn, flex: 1, padding: 13, fontSize: 14, letterSpacing: 2 }}>
              한 판 더
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
