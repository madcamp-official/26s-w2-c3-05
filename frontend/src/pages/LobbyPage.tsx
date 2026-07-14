import type { Room } from '../types/game';
import { Divider, Seal, Backdrop, GOLD, primaryBtn, ghostBtn } from '../components/ui';

import { useEffect, useState } from 'react';
import { getRooms } from '../App';
import { useAudio } from '../components/AudioContext';

export default function LobbyPage({
  nick,
  onJoin,
  onRetreat,
  onCreateRoom,
  onFriends,
  onRanking,
  onMyPage,
}: {
  nick: string;
  onJoin: (room: Room) => void;
  onRetreat: () => void;
  onCreateRoom: () => void;
  onFriends: () => void;
  onRanking: () => void;
  onMyPage: () => void;
}) {

  const { setMusicSrc } = useAudio();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // 방 목록 갱신 (버튼·폴링 공용) — 페이지 이동 없이 목록만 다시 불러온다
    const refreshRooms = async () => {
      setRefreshing(true);
      try {
        setRooms(await getRooms());
      } catch {
        setRooms([]);
      } finally {
        setRefreshing(false);
      }
    };

    useEffect(() => {
      refreshRooms();
      // 새 연회가 열리면 자동으로도 보이게 10초마다 동기화
      const poll = window.setInterval(refreshRooms, 10000);
      return () => window.clearInterval(poll);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  return (
    <Backdrop
      image="/assets/bg-lobby.png"
      overlay="linear-gradient(180deg, rgba(14,6,4,.62) 0%, rgba(14,6,4,.78) 100%)"
      scroll
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 1180,
          margin: '0 auto',
          padding: '44px 32px 60px',
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Seal char="宮" size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Song Myung', serif", fontSize: 30, color: '#eed9a4', letterSpacing: 6 }}>
              내전 로비{' '}
              <span style={{ fontSize: 17, color: 'rgba(238,217,164,.6)', letterSpacing: 2 }}>內殿</span>
            </div>
            <div style={{ marginTop: 2, color: 'rgba(240,226,191,.75)', fontSize: 14 }}>
              어서 오시옵소서, <span style={{ color: '#eed9a4', fontWeight: 600 }}>{nick}</span> 님 — 드실 연회를
              고르소서
            </div>
          </div>
          <button
            onClick={refreshRooms}
            disabled={refreshing}
            title="연회 목록 새로고침"
            style={{ ...ghostBtn, padding: '12px 18px', fontSize: 13, letterSpacing: 1.5, opacity: refreshing ? 0.5 : 1 }}
          >
            {refreshing ? '갱신 중…' : '↻ 새로고침'}
          </button>
          <button
            onClick={onMyPage}
            style={{ ...ghostBtn, padding: '12px 18px', fontSize: 13, letterSpacing: 1.5 }}
          >
            내 서첩
          </button>
          <button
            onClick={onFriends}
            style={{ ...ghostBtn, padding: '12px 18px', fontSize: 13, letterSpacing: 1.5 }}
          >
            벗 명부
          </button>
          <button
            onClick={onRanking}
            style={{ ...ghostBtn, padding: '12px 18px', fontSize: 13, letterSpacing: 1.5 }}
          >
            천하 방
          </button>
          <button
            onClick={onCreateRoom}
            style={{ ...primaryBtn, padding: '12px 20px', fontSize: 14, letterSpacing: 2 }}
          >
            ＋ 새 연회 열기
          </button>
        </div>
        <Divider margin="26px 0 30px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 22 }}>
          {rooms.map((r) => (
            <RoomCard key={r.room_id} room={r} onJoin={() => onJoin(r)} />
          ))}
        </div>
        <Divider margin="26px 0 30px" />
        <div>
          <button onClick={onRetreat} style={{ ...ghostBtn, padding: '12px 20px', fontSize: 14, letterSpacing: 2 }}>
            나가기
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

function RoomCard({ room: r, onJoin }: { room: Room; onJoin: () => void }) {
  return (
    <div
      style={{
        background: 'rgba(22,9,7,.72)',
        border: `1px solid ${GOLD(0.42)}`,
        borderRadius: 10,
        boxShadow: `inset 0 0 0 4px rgba(22,9,7,.5), inset 0 0 0 5px ${GOLD(0.16)}, 0 14px 34px rgba(0,0,0,.4)`,
        padding: '22px 22px 20px',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: r.can_access ? 'linear-gradient(180deg,#9c2027,#701318)' : 'rgba(60,30,22,.8)',
            border: `1px solid ${GOLD(0.6)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f0dcae',
            fontFamily: "'Song Myung', serif",
            fontSize: 20,
            flex: 'none',
          }}
        >
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Song Myung', serif", fontSize: 22, color: '#f0e2bf', letterSpacing: 2 }}>
            {r.room_name} <span style={{ fontSize: 14, color: 'rgba(238,217,164,.55)' }}></span>
          </div>
          <div style={{ marginTop: 3, fontSize: 12.5, color: 'rgba(240,226,191,.6)' }}>전주(殿主) · {r.room_host}</div>
        </div>
        <div
          style={{
            flex: 'none',
            padding: '5px 10px',
            borderRadius: 999,
            fontSize: 12,
            letterSpacing: 1,
            border: `1px solid ${r.can_access ? GOLD(0.6) : 'rgba(216,67,75,.55)'}`,
            color: r.can_access ? '#eed9a4' : '#e89096',
            background: r.can_access ? GOLD(0.08) : 'rgba(200,50,58,.14)',
          }}
        >
          {r.can_access ? '대기중' : '연회중'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: r.player_limit }, (_, i) => (
            <div
              key={i}
              style={{
                width: 9,
                height: 9,
                transform: 'rotate(45deg)',
                background: i < r.room_count ? '#d8b46a' : GOLD(0.08),
                border: `1px solid ${GOLD(0.5)}`,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(240,226,191,.75)', marginLeft: 4 }}>
          {r.room_count} / {r.player_limit} 명
        </div>
      </div>
      <button
        onClick={onJoin}
        disabled={!r.can_access}
        style={{
          padding: 12,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 3,
          cursor: r.can_access ? 'pointer' : 'default',
          border: `1px solid ${r.can_access ? GOLD(0.6) : GOLD(0.2)}`,
          background: r.can_access ? GOLD(0.1) : 'transparent',
          color: r.can_access ? '#f0e2bf' : 'rgba(240,226,191,.35)',
        }}
      >
        {r.can_access ? '입장하기' : '연회 진행중'}
      </button>
    </div>
  );
}
