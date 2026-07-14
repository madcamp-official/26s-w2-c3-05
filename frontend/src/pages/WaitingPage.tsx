import { useEffect, useRef, useState } from 'react';
import type { Room } from '../types/game';
import { Divider, Seal, Backdrop, GOLD, primaryBtn, ghostBtn } from '../components/ui';
import { getPlayers, leaveRoom } from '../App';
import { getStomp } from '../lib/stompClient';
import { useGameChannel, type GameEventMsg } from '../features/game/hooks/useGameChannel';

export default function WaitingPage({
  nick,
  room,
  onLeave,
  onStart,
}: {
  nick: string;
  room: Room;
  onLeave: () => void;
  onStart: (first: GameEventMsg) => void;
}) {
  const [starting, setStarting] = useState(false);
  const timers = useRef<number[]>([]);
  const myId = localStorage.getItem('userId') ?? '';
  const [players, setPlayers] = useState<{ user_id: string; nickname: string }[]>([]);

  // 명단 새로고침 (입장/퇴장 이벤트마다 재조회 — 단순하고 확실)
    const refresh = () => {
      getPlayers(room.room_id)
        .then((list) => {
          if (list.length === 0) {
            onLeave(); // 방이 사라짐(방장 퇴장 등) → 로비로
            return;
          }
          setPlayers(list);
        })
        .catch(() => {});
    };

    useEffect(() => {
      refresh();

      // 소켓: 이 방 채널 구독 + 내 입장 알림
      // (연결이 아직이면 될 때까지 재시도 — 예전엔 이 시점에 미연결이면 영영 구독을 안 했음)
      let subId: string | null = null;
      let retry: number | undefined;
      const trySubscribe = () => {
        const client = getStomp();
        if (client?.connected) {
          const sub = client.subscribe(`/topic/rooms/${room.room_id}`, () => refresh());
          subId = sub.id;
          client.publish({ destination: `/app/rooms/${room.room_id}/enter` });
        } else {
          retry = window.setTimeout(trySubscribe, 500);
        }
      };
      trySubscribe();

      // 이벤트를 놓쳐도 5초마다 동기화 (보험)
      const poll = window.setInterval(refresh, 5000);

      return () => {
        const client = getStomp();
        if (subId && client?.connected) client.unsubscribe(subId);
        window.clearTimeout(retry);
        window.clearInterval(poll);
      };
    }, [room.room_id]);

    const slots = players.map((p) => ({
      name: p.nickname,
      title: p.user_id === room.creator_id ? '전주(殿主)' : '빈객(賓客)', // room_host는 닉네임이라 비교 불가
      ready: true,                    // ready 시스템은 게임시작 단계에서
      isMe: p.user_id === myId,
    }));

  // 방장이 start를 쏘면 서버가 ROUND_START를 방송 → 전원이 동시에 게임 화면으로
  useGameChannel(room.room_id, (ev) => {
    if (ev.type === 'ROUND_START') {
      setStarting(true); // 開宴 도장 연출 잠깐 보여주고 전환
      timers.current.push(window.setTimeout(() => onStart(ev), 1400));
    }
  });
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const iAmHost = myId === room.creator_id;
  const startGame = () => {
    const client = getStomp();
    if (client?.connected) client.publish({ destination: `/app/rooms/${room.room_id}/start` });
  };

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
              {room.room_name}
            </div>
            <div style={{ marginTop: 2, color: 'rgba(240,226,191,.72)', fontSize: 14 }}>
              {starting
                ? '곧 개연(開宴)하옵니다'
                : `빈객이 드는 중… (${slots.length}/${room.player_limit}명)`}
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
          <button
            onClick={async () => {
              // 서버에 퇴장 알리고(소켓+REST) 로비로
              const client = getStomp();
              if (client?.connected) client.publish({ destination: `/app/rooms/${room.room_id}/leave` });
              await leaveRoom('', room.room_id).catch(() => {});
              onLeave();
            }}
            style={{ ...ghostBtn, padding: '13px 26px', fontSize: 14, letterSpacing: 2 }}
          >
            퇴장
          </button>
          {iAmHost ? (
            <button
              onClick={startGame}
              disabled={starting}
              style={{ ...primaryBtn, padding: '13px 40px', fontSize: 15, letterSpacing: 3 }}
            >
              開宴 · 연회를 시작하오
            </button>
          ) : (
            <div
              style={{
                padding: '13px 30px',
                fontSize: 14,
                letterSpacing: 2,
                color: 'rgba(240,226,191,.6)',
                alignSelf: 'center',
              }}
            >
              전주(殿主)의 개연을 기다리는 중…
            </div>
          )}
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
