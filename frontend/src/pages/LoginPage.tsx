import { useState, useEffect } from 'react';
import { panel, primaryBtn, ghostBtn, Divider, Seal, Backdrop, GOLD } from '../components/ui';
import { useAudio } from '../components/AudioContext';
import { userLogin, getUserInfo } from '../App';

const inputStyle = {
  background: 'rgba(12,5,4,.6)',
  border: `1px solid ${GOLD(0.4)}`,
  borderRadius: 8,
  padding: '14px 16px',
  color: '#f5e9cf',
  fontSize: 16,
  letterSpacing: 1,
} as const;

export default function LoginPage({
  onEnter,
  onSignup,
}: {
  // 로그인 성공 시 사용자 아이디와 닉네임을 상위로 전달
  onEnter: (userId: string, nickname: string) => void;
  // 회원가입 화면으로 이동
  onSignup: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const can = userId.trim().length > 0 && password.length > 0 && !loading;

  const submit = async () => {
    if (!can) return;
    setError('');
    setLoading(true);
    try {
      const accessToken = await userLogin(userId.trim(), password);
      if (!accessToken) {
        setError('아이디 혹은 암구호가 올바르지 않사옵니다');
        return;
      }
      // sessionStorage = 탭마다 독립 저장.
      // (localStorage는 모든 탭이 공유해서, 탭 2개로 다른 계정 로그인하면
      //  마지막 로그인이 앞 탭의 토큰을 덮어써 계정이 뒤섞이는 사고가 남)
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('userId', userId.trim());

      let nickname = userId.trim();
      try {
        const info = await getUserInfo();
        if (info?.user_nickname) nickname = info.user_nickname;
      } catch {
        // 닉네임 조회 실패해도 로그인 자체는 진행
      }

      onEnter(userId.trim(), nickname);
    } catch (e) {
      setError('입궁에 실패하였사옵니다. 다시 시도하소서');
    } finally {
      setLoading(false);
    }
  };

  const { setMusicSrc } = useAudio();
  useEffect(() => {
    setMusicSrc('../../assets/bgm/bgm_lobby.mp3');
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
            궁에 드시려면 신원을 밝히소서
          </div>
          <Divider />
          <label htmlFor="userId" style={{ color: GOLD(0.85), fontSize: 13, letterSpacing: 2, marginBottom: 8 }}>
            아이디
          </label>
          <input
            id="userId"
            value={userId}
            maxLength={20}
            autoComplete="username"
            placeholder="아이디를 입력하소서"
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={inputStyle}
          />
          <label
            htmlFor="password"
            style={{ color: GOLD(0.85), fontSize: 13, letterSpacing: 2, margin: '16px 0 8px' }}
          >
            암구호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            maxLength={32}
            autoComplete="current-password"
            placeholder="암구호를 입력하소서"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={inputStyle}
          />

          {error && (
            <div style={{ marginTop: 12, color: '#e89096', fontSize: 12.5, letterSpacing: 0.5, textAlign: 'center' }}>
              {error}
            </div>
          )}

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
            {loading ? '입궁하는 중…' : '입궁하기'}
          </button>

          <button
            onClick={onSignup}
            style={{
              ...ghostBtn,
              marginTop: 10,
              padding: 12,
              fontSize: 13,
              letterSpacing: 1.5,
            }}
          >
            아직 궁적이 없으신가요? 회원가입 하러 가기
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
