import { useEffect, useRef, useState } from 'react';
import type { Room } from '../types/game';
import { BOTS } from '../constants/game';
import { Divider, Seal, Backdrop, GOLD, primaryBtn, ghostBtn } from '../components/ui';

export default function WaitingPage({
  nick,
  room,
  onLeave,
  onStart,
}: {
  nick: string;
  room: Room;
  onLeave: () => void;
  onStart: () => void;
}) {
  const [meReady, setMeReady] = useState(false);
  const [botReady, setBotReady] = useState<Record<string, boolean>>({});
  const [starting, setStarting] = useState(false);
  const timers = useRef<number[]>([]);

  // 봇들이 순차적으로 준비 완료
  useEffect(() => {
    BOTS.forEach((b, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setBotReady((prev) => ({ ...prev, [b.name]: true }));
        }, 1600 + i * 1300 + Math.random() * 900),
      );
    });
    return () => timers.current.forEach(clearTimeout);
  }, []);

  // 전원 준비 → 개연
  useEffect(() => {
    const allBots = BOTS.every((b) => botReady[b.name]);
    if (allBots && meReady && !starting) {
      setStarting(true);
      timers.current.push(window.setTimeout(onStart, 2000));
    }
  }, [botReady, meReady, starting, onStart]);

  const slots = [
    { name: nick, title: '귀비(貴妃)', ready: meReady, isMe: true },
    ...BOTS.map((b) => ({ name: b.name, title: b.title, ready: !!botReady[b.name], isMe: false })),
  ];
  const readyCount = slots.filter((s) => s.ready).length;

  return (
    <Backdrop
      image="/assets/bg-waiting-ready.png"
      overlay="linear-gradient(180deg, rgba(12,6,5,.5) 0%, rgba(12,6,5,.72) 100%)"
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Seal char="候" size={46} />
          <div>
            <div style={{ fontFamily: "'Song Myung', serif", fontSize: 32, color: '#eed9a4', letterSpacing: 4 }}>
              {room.name} <span style={{ fontSize: 18, color: 'rgba(238,217,164,.6)' }}>({room.hanja})</span>
            </div>
            <div style={{ marginTop: 2, color: 'rgba(240,226,191,.72)', fontSize: 14 }}>
              {readyCount >= slots.length
                ? '모든 채비가 끝났사옵니다 — 곧 개연(開宴)하옵니다'
                : `모든 이의 채비를 기다리는 중… (${readyCount}/${slots.length})`}
            </div>
          </div>
        </div>
        <div style={{ width: 'min(760px, 90vw)' }}>
          <Divider margin="30px 0 34px" />
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          {slots.map((s) => (
            <div
              key={s.name}
              style={{
                width: 158,
                background: 'rgba(22,9,7,.74)',
                border: `1px solid ${s.isMe ? GOLD(0.75) : GOLD(0.35)}`,
                borderRadius: 10,
                boxShadow: `inset 0 0 0 4px rgba(22,9,7,.5), inset 0 0 0 5px ${GOLD(0.14)}, 0 12px 30px rgba(0,0,0,.4)`,
                padding: '20px 14px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                backdropFilter: 'blur(6px)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg,#9c2027,#701318)',
                  border: `1px solid ${GOLD(0.7)}`,
                  boxShadow: 'inset 0 0 0 3px rgba(20,8,6,.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f0dcae',
                  fontFamily: "'Song Myung', serif",
                  fontSize: 24,
                }}
              >
                {s.name[0]}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#f0e2bf', fontSize: 15, fontWeight: 600 }}>
                  {s.name}{' '}
                  {s.isMe && <span style={{ color: 'rgba(238,217,164,.6)', fontSize: 12 }}>(나)</span>}
                </div>
                <div style={{ marginTop: 2, color: 'rgba(240,226,191,.55)', fontSize: 12 }}>{s.title}</div>
              </div>
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  letterSpacing: 2,
                  border: `1px solid ${s.ready ? GOLD(0.7) : GOLD(0.3)}`,
                  color: s.ready ? '#1c1006' : 'rgba(240,226,191,.6)',
                  background: s.ready ? '#dfba6e' : 'transparent',
                }}
              >
                {s.ready ? '✓ 준비' : '채비 중'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 38 }}>
          <button onClick={onLeave} style={{ ...ghostBtn, padding: '13px 26px', fontSize: 14, letterSpacing: 2 }}>
            퇴장
          </button>
          <button
            onClick={() => setMeReady((v) => !v)}
            style={{
              ...primaryBtn,
              padding: '13px 40px',
              fontSize: 15,
              letterSpacing: 3,
              background: meReady ? 'rgba(12,5,4,.55)' : primaryBtn.background,
            }}
          >
            {meReady ? '준비 취소' : '✓ 준비하기'}
          </button>
        </div>
      </div>
      {starting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(8,3,2,.72)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            animation: 'fadeIn .4s ease both',
          }}
        >
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 14,
              border: '3px solid #c8323a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d8434b',
              fontFamily: "'Song Myung', serif",
              fontSize: 62,
              animation: 'stampIn .5s ease both',
              boxShadow: '0 0 60px rgba(200,50,58,.35)',
            }}
          >
            開宴
          </div>
          <div style={{ color: '#f0e2bf', fontSize: 18, letterSpacing: 4 }}>연회가 시작되옵니다…</div>
        </div>
      )}
    </Backdrop>
  );
}
