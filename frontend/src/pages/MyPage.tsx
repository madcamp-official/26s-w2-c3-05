import { useEffect, useState } from 'react';
import { getMyPage, patchUserNickname, type MyPageInfo } from '../App';
import { Backdrop, Divider, GOLD, Seal, ghostBtn, panel, primaryBtn } from '../components/ui';

// 마이페이지: 내 존함·궁호(닉네임)·품계·전적을 확인하고 궁호를 고칠 수 있다
export default function MyPage({
  onBack,
  onNicknameChanged,
}: {
  onBack: () => void;
  onNicknameChanged: (nickname: string) => void; // App의 nick 상태 동기화용
}) {
  const [info, setInfo] = useState<MyPageInfo | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    getMyPage()
      .then((d) => {
        setInfo(d);
        setDraft(d.user_nickname);
      })
      .catch(() => setError('정보를 불러오지 못하였사옵니다'));
  };
  useEffect(load, []);

  const saveNickname = async () => {
    const next = draft.trim();
    if (!info || !next || next === info.user_nickname || saving) return;
    setSaving(true);
    setError('');
    try {
      await patchUserNickname(next);
      onNicknameChanged(next);
      setEditing(false);
      load(); // 서버 기준으로 재조회
    } catch {
      setError('궁호를 고치지 못하였사옵니다 (12자 이내인지 확인하소서)');
    } finally {
      setSaving(false);
    }
  };

  const statRow = (label: string, value: string | number) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 2px', fontSize: 15 }}>
      <span style={{ color: 'rgba(240,226,191,.65)' }}>{label}</span>
      <span style={{ color: '#f0e2bf', fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <Backdrop
      image="/assets/bg-lobby.png"
      overlay="linear-gradient(180deg, rgba(14,6,4,.7) 0%, rgba(14,6,4,.85) 100%)"
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ ...panel, width: 'min(460px, 92vw)', padding: '34px 34px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Seal char="私" size={44} />
            <div>
              <div style={{ fontFamily: "'Song Myung', serif", fontSize: 26, color: '#eed9a4', letterSpacing: 4 }}>
                내 서첩 <span style={{ fontSize: 15, color: 'rgba(238,217,164,.6)' }}>私牒</span>
              </div>
              <div style={{ marginTop: 2, color: 'rgba(240,226,191,.7)', fontSize: 13 }}>
                나의 신상과 연회 전적이옵니다
              </div>
            </div>
          </div>

          <Divider margin="22px 0 18px" />

          {!info && !error && (
            <div style={{ color: 'rgba(240,226,191,.6)', textAlign: 'center', padding: 30 }}>불러오는 중…</div>
          )}
          {error && <div style={{ color: '#e8858c', fontSize: 13, marginBottom: 10 }}>{error}</div>}

          {info && (
            <>
              {statRow('존함 (ID)', info.user_id)}

              {/* 궁호(닉네임) — 보기/수정 토글 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px' }}>
                <span style={{ color: 'rgba(240,226,191,.65)', fontSize: 15 }}>궁호 (닉네임)</span>
                {editing ? (
                  <span style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={draft}
                      maxLength={12}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                      autoFocus
                      style={{
                        width: 140,
                        padding: '6px 10px',
                        background: 'rgba(12,5,4,.6)',
                        border: `1px solid ${GOLD(0.5)}`,
                        borderRadius: 8,
                        color: '#f0e2bf',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                    <button onClick={saveNickname} disabled={saving}
                      style={{ ...primaryBtn, padding: '6px 14px', fontSize: 13 }}>
                      {saving ? '…' : '개명'}
                    </button>
                    <button onClick={() => { setEditing(false); setDraft(info.user_nickname); }}
                      style={{ ...ghostBtn, padding: '6px 12px', fontSize: 13 }}>
                      취소
                    </button>
                  </span>
                ) : (
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#f0e2bf', fontWeight: 600, fontSize: 15 }}>{info.user_nickname}</span>
                    <button onClick={() => setEditing(true)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12 }}>
                      고치기
                    </button>
                  </span>
                )}
              </div>

              <Divider margin="16px 0" />

              {statRow('품계 (랭크)', info.user_rank)}
              {statRow('어점 (점수)', `${info.user_point} 점`)}
              {statRow('전적', `${info.user_win}승 ${info.user_lose}패 · ${info.user_played}연회`)}
              {statRow('승률', `${info.win_rate}%`)}
            </>
          )}

          <Divider margin="18px 0 20px" />
          <button onClick={onBack} style={{ ...ghostBtn, width: '100%', padding: 13, fontSize: 14, letterSpacing: 2 }}>
            내전으로 돌아가기
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
