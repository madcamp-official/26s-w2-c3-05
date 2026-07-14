import { useState, useEffect } from 'react';
import { panel, primaryBtn, ghostBtn, Divider, Seal, Backdrop, GOLD } from '../components/ui';
import { useAudio } from '../components/AudioContext';
import { userSignup, checkUserID, checkUserNickname } from '../App';

const inputStyle = {
  background: 'rgba(12,5,4,.6)',
  border: `1px solid ${GOLD(0.4)}`,
  borderRadius: 8,
  padding: '13px 16px',
  color: '#f5e9cf',
  fontSize: 15,
  letterSpacing: 1,
} as const;

type CheckState = 'idle' | 'checking' | 'ok' | 'taken' | 'error';

function hint(state: CheckState, okMsg: string, takenMsg: string) {
  switch (state) {
    case 'checking':
      return { text: '확인하는 중…', color: 'rgba(240,226,191,.55)' };
    case 'ok':
      return { text: okMsg, color: '#8fd19e' };
    case 'taken':
      return { text: takenMsg, color: '#e89096' };
    case 'error':
      return { text: '확인에 실패하였사옵니다', color: '#e89096' };
    default:
      return null;
  }
}

export default function SignupPage({
  onSignedUp,
  onBack,
}: {
  // 가입 성공 시(추천: 로그인 화면으로 복귀, 아이디 프리필)
  onSignedUp: (userId: string) => void;
  // 로그인 화면으로 돌아가기
  onBack: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [idCheck, setIdCheck] = useState<CheckState>('idle');
  const [nickCheck, setNickCheck] = useState<CheckState>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setMusicSrc } = useAudio();
  useEffect(() => {
    setMusicSrc('../../assets/bgm/bgm_lobby.mp3');
  }, [setMusicSrc]);

  const verifyId = async () => {
    const v = userId.trim();
    if (!v) {
      setIdCheck('idle');
      return;
    }
    setIdCheck('checking');
    try {
      // checkUserID: true === 사용 가능
      const available = await checkUserID(v);
      setIdCheck(available ? 'ok' : 'taken');
    } catch {
      setIdCheck('error');
    }
  };

  const verifyNickname = async () => {
    const v = nickname.trim();
    if (!v) {
      setNickCheck('idle');
      return;
    }
    setNickCheck('checking');
    try {
      const available = await checkUserNickname(v);
      setNickCheck(available ? 'ok' : 'taken');
    } catch {
      setNickCheck('error');
    }
  };

  const passwordsMatch = password.length > 0 && password === confirm;
  const can =
    userId.trim().length > 0 &&
    nickname.trim().length > 0 &&
    password.length >= 4 &&
    passwordsMatch &&
    idCheck !== 'taken' &&
    nickCheck !== 'taken' &&
    !loading;

  const submit = async () => {
    if (!can) return;
    setError('');

    // 제출 직전 최종 확인이 이루어지지 않았다면 한 번 더 점검
    if (idCheck === 'idle') await verifyId();
    if (nickCheck === 'idle') await verifyNickname();

    setLoading(true);
    try {
      const ok = await userSignup(userId.trim(), password, nickname.trim());
      if (!ok) {
        setError('입적에 실패하였사옵니다. 다시 시도하소서');
        return;
      }
      onSignedUp(userId.trim());
    } catch {
      setError('입적에 실패하였사옵니다. 아이디 또는 궁호를 다시 확인하소서');
    } finally {
      setLoading(false);
    }
  };

  const idHint = hint(idCheck, '사용하실 수 있는 아이디이옵니다', '이미 등록된 아이디이옵니다');
  const nickHint = hint(nickCheck, '사용하실 수 있는 궁호이옵니다', '이미 사용 중인 궁호이옵니다');

  return (
    <Backdrop
      image="/assets/bg-login.png"
      overlay="linear-gradient(180deg, rgba(16,7,5,.45) 0%, rgba(16,7,5,.62) 55%, rgba(16,7,5,.8) 100%)"
      scroll
    >
      <div
        style={{
          position: 'relative',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '44px 16px',
          animation: 'fadeUp .7s ease both',
        }}
      >
        <Seal char="宮" size={46} />
        <div
          style={{
            marginTop: 14,
            fontFamily: "'Song Myung', serif",
            fontSize: 28,
            color: '#eed9a4',
            letterSpacing: 8,
            textIndent: 8,
          }}
        >
          궁적 등록
        </div>
        <div style={{ marginTop: 6, color: 'rgba(238,217,164,.65)', fontSize: 12.5, letterSpacing: 3 }}>
          新 入 宮 帖
        </div>

        <div
          style={{
            ...panel,
            marginTop: 30,
            width: 440,
            maxWidth: 'calc(100vw - 40px)',
            padding: '32px 36px 30px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <label htmlFor="s-id" style={{ color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, marginBottom: 7 }}>
            아이디
          </label>
          <input
            id="s-id"
            value={userId}
            maxLength={20}
            autoComplete="username"
            placeholder="영문/숫자로 아이디를 입력하소서"
            onChange={(e) => {
              setUserId(e.target.value);
              setIdCheck('idle');
            }}
            onBlur={verifyId}
            style={inputStyle}
          />
          {idHint && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: idHint.color, letterSpacing: 0.5 }}>
              {idHint.text}
            </div>
          )}

          <label
            htmlFor="s-nick"
            style={{ color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, margin: '16px 0 7px' }}
          >
            궁호(宮號) · 닉네임
          </label>
          <input
            id="s-nick"
            value={nickname}
            maxLength={10}
            placeholder="예) 설연화"
            onChange={(e) => {
              setNickname(e.target.value);
              setNickCheck('idle');
            }}
            onBlur={verifyNickname}
            style={inputStyle}
          />
          {nickHint && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: nickHint.color, letterSpacing: 0.5 }}>
              {nickHint.text}
            </div>
          )}

          <label
            htmlFor="s-pw"
            style={{ color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, margin: '16px 0 7px' }}
          >
            암구호
          </label>
          <input
            id="s-pw"
            type="password"
            value={password}
            maxLength={32}
            autoComplete="new-password"
            placeholder="4자 이상 입력하소서"
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <label
            htmlFor="s-pw2"
            style={{ color: GOLD(0.85), fontSize: 12.5, letterSpacing: 2, margin: '16px 0 7px' }}
          >
            암구호 확인
          </label>
          <input
            id="s-pw2"
            type="password"
            value={confirm}
            maxLength={32}
            autoComplete="new-password"
            placeholder="암구호를 다시 입력하소서"
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={inputStyle}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#e89096', letterSpacing: 0.5 }}>
              암구호가 일치하지 않사옵니다
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, color: '#e89096', fontSize: 12.5, letterSpacing: 0.5, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <Divider margin="22px 0 18px" />

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onBack} style={{ ...ghostBtn, flex: 1, padding: 13, fontSize: 14, letterSpacing: 2 }}>
              돌아가기
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
              {loading ? '입적하는 중…' : '입적하기'}
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
