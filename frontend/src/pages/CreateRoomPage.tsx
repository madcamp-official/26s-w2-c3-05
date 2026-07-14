import { useState } from 'react';
import { panel, primaryBtn, ghostBtn, Divider, Seal, Backdrop, GOLD } from '../components/ui';
import { createRoom } from '../App';

const PLAYER_OPTIONS = [3, 4, 5, 6, 7, 8];
const ROUND_OPTIONS = [3, 5, 7, 10];
const TIME_OPTIONS = [30, 45, 60, 90];

const numInputStyle = {
  background: 'rgba(12,5,4,.6)',
  border: `1px solid ${GOLD(0.4)}`,
  borderRadius: 8,
  padding: '13px 16px',
  color: '#f5e9cf',
  fontSize: 15,
  letterSpacing: 1,
  width: '100%',
} as const;

function chipStyle(active: boolean) {
  return {
    padding: '9px 16px',
    borderRadius: 999,
    fontSize: 13,
    letterSpacing: 1,
    cursor: 'pointer' as const,
    border: `1px solid ${active ? GOLD(0.65) : GOLD(0.22)}`,
    background: active ? GOLD(0.14) : 'transparent',
    color: active ? '#f0e2bf' : 'rgba(240,226,191,.6)',
  };
}

export default function CreateRoomPage({
  userId,
  nickname,
  onCreated,
  onCancel,
}: {
  userId: string;
  nickname: string;
  onCreated: (roomId: number) => void;
  onCancel: () => void;
}) {
  const [roomName, setRoomName] = useState(`${nickname}의 연회`);
  const [playerLimit, setPlayerLimit] = useState(5);
  const [roundLimit, setRoundLimit] = useState(5);
  const [timeLimit, setTimeLimit] = useState(60);
  const [usePassword, setUsePassword] = useState(false);
  const [roomPw, setRoomPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const can = roomName.trim().length > 0 && (!usePassword || roomPw.trim().length > 0) && !loading;

  const submit = async () => {
    if (!can) return;
    setError('');
    setLoading(true);
    try {
      const roomId = await createRoom(
        userId,
        roomName.trim(),
        nickname,
        playerLimit,
        roundLimit,
        timeLimit,
        usePassword ? roomPw.trim() : undefined
      );
      onCreated(roomId);
    } catch {
      setError('연회를 열지 못하였사옵니다. 다시 시도하소서');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Backdrop
      image="/assets/bg-lobby.png"
      overlay="linear-gradient(180deg, rgba(14,6,4,.62) 0%, rgba(14,6,4,.78) 100%)"
      scroll
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 560,
          margin: '0 auto',
          padding: '44px 32px 60px',
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Seal char="宴" size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Song Myung', serif", fontSize: 28, color: '#eed9a4', letterSpacing: 6 }}>
              새 연회 열기{' '}
              <span style={{ fontSize: 16, color: 'rgba(238,217,164,.6)', letterSpacing: 2 }}>開宴</span>
            </div>
            <div style={{ marginTop: 2, color: 'rgba(240,226,191,.75)', fontSize: 14 }}>
              연회의 격식을 정하시옵소서
            </div>
          </div>
        </div>

        <Divider margin="24px 0 26px" />

        <div style={{ ...panel, padding: '30px 30px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="room-name" style={{ color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, marginBottom: 8 }}>
            연회 이름
          </label>
          <input
            id="room-name"
            value={roomName}
            maxLength={24}
            placeholder="연회의 이름을 정하소서"
            onChange={(e) => setRoomName(e.target.value)}
            style={numInputStyle}
          />

          <div style={{ marginTop: 22, color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, marginBottom: 10 }}>
            인원 · {playerLimit}명
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLAYER_OPTIONS.map((n) => (
              <div key={n} style={chipStyle(playerLimit === n)} onClick={() => setPlayerLimit(n)}>
                {n}명
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, marginBottom: 10 }}>
            판수 · {roundLimit}판
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROUND_OPTIONS.map((n) => (
              <div key={n} style={chipStyle(roundLimit === n)} onClick={() => setRoundLimit(n)}>
                {n}판
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, marginBottom: 10 }}>
            제한시간 · {timeLimit}초
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TIME_OPTIONS.map((n) => (
              <div key={n} style={chipStyle(timeLimit === n)} onClick={() => setTimeLimit(n)}>
                {n}초
              </div>
            ))}
          </div>

          <Divider margin="24px 0 18px" />

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={usePassword}
              onChange={(e) => setUsePassword(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#c9a355' }}
            />
            <span style={{ color: '#f0e2bf', fontSize: 13.5, letterSpacing: 1 }}>암구호로 연회를 잠그기</span>
          </label>

          {usePassword && (
            <input
              value={roomPw}
              maxLength={16}
              placeholder="입장 암구호를 정하소서"
              onChange={(e) => setRoomPw(e.target.value)}
              style={{ ...numInputStyle, marginTop: 12 }}
            />
          )}

          {error && (
            <div style={{ marginTop: 16, color: '#e89096', fontSize: 12.5, textAlign: 'center' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
            <button onClick={onCancel} style={{ ...ghostBtn, flex: 1, padding: 13, fontSize: 14, letterSpacing: 2 }}>
              취소
            </button>
            <button
              onClick={submit}
              disabled={!can}
              style={{
                ...primaryBtn,
                flex: 2,
                padding: 13,
                fontSize: 14,
                letterSpacing: 3,
                opacity: can ? 1 : 0.5,
              }}
            >
              {loading ? '여는 중…' : '연회 열기'}
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
