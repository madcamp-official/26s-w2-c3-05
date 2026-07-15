import { useEffect, useState, useCallback } from 'react';
import type { Stat, UserInfo, RankType } from '../types/game';
import { RANK_HANJA } from '../constants/game';
import { panel, ghostBtn, Divider, Seal, Backdrop, GOLD } from '../components/ui';
import { getRankings, getUser } from '../App';

import { useAudio } from '../components/AudioContext';

const PAGE_SIZE = 20;

const TIER_COLOR: Record<RankType, string> = {
  NONE: 'rgba(240,226,191,.4)',
  BRONZE: '#c17a4a',
  SILVER: '#c9d1d9',
  GOLD: '#eec95a',
  PLATINUM: '#7fd8c9',
  DIAMOND: '#8fb4f0',
};

const TIER_LABEL: Record<RankType, string> = {
  NONE: '미배정',
  BRONZE: '동(銅)',
  SILVER: '은(銀)',
  GOLD: '금(金)',
  PLATINUM: '백금(白金)',
  DIAMOND: '다이아',
};

export default function RankingPage({
  userId,
  onRetreat,
}: {
  userId: string;
  onRetreat: () => void;
}) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Stat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { setMusicSrc } = useAudio();
    useEffect(() => {
      setMusicSrc('../../assets/bgm/bgm_gameplay2.mp3');
    }, [setMusicSrc]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await getRankings(p, PAGE_SIZE);
      const list = data ?? [];
      setRows(list);

      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const u = await getUser(id);
            return [id, u] as const;
          } catch {
            return null;
          }
        })
      );
      setProfiles((prev) => {
        const next = { ...prev };
        for (const pair of pairs) {
          if (pair) next[pair[0]] = pair[1];
        }
        return next;
      });
    } catch {
      setError('명단을 불러오지 못하였사옵니다');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  return (
    <Backdrop
      image="/assets/bg-lobby.png"
      overlay="linear-gradient(180deg, rgba(14,6,4,.62) 0%, rgba(14,6,4,.78) 100%)"
      scroll
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 900,
          margin: '0 auto',
          padding: '44px 32px 60px',
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Seal char="榜" size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Song Myung', serif", fontSize: 28, color: '#eed9a4', letterSpacing: 6 }}>
              천하 방(榜){' '}
              <span style={{ fontSize: 16, color: 'rgba(238,217,164,.6)', letterSpacing: 2 }}>天下榜</span>
            </div>
            <div style={{ marginTop: 2, color: 'rgba(240,226,191,.75)', fontSize: 14 }}>
              온 궁을 통틀어 가장 뛰어난 이들의 명부이옵니다
            </div>
          </div>
          <button onClick={onRetreat} style={{ ...ghostBtn, padding: '12px 20px', fontSize: 14, letterSpacing: 2 }}>
            로비로
          </button>
        </div>

        <Divider margin="24px 0 22px" />

        <div
          style={{
            ...panel,
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr 110px 90px 90px 90px',
              padding: '14px 20px',
              fontSize: 12,
              letterSpacing: 1.5,
              color: 'rgba(240,226,191,.55)',
              borderBottom: `1px solid ${GOLD(0.2)}`,
            }}
          >
            <div>순위</div>
            <div>궁호</div>
            <div>품계</div>
            <div style={{ textAlign: 'right' }}>점수</div>
            <div style={{ textAlign: 'right' }}>승률</div>
            <div style={{ textAlign: 'right' }}>대국</div>
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(240,226,191,.5)', fontSize: 13.5 }}>
              불러오는 중이옵니다…
            </div>
          ) : error ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#e89096', fontSize: 13.5 }}>{error}</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(240,226,191,.5)', fontSize: 13.5 }}>
              아직 기록이 없사옵니다
            </div>
          ) : (
            rows.map((r, i) => {
              const rank = (page - 1) * PAGE_SIZE + i + 1;
              const isMe = r.user_id === userId;
              const played = r.user_played || r.user_win + r.user_lose;
              const winRate = played > 0 ? Math.round((r.user_win / played) * 100) : 0;
              const medal = rank <= 3 ? RANK_HANJA?.[rank - 1] : undefined;

              return (
                <div
                  key={r.user_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr 110px 90px 90px 90px',
                    alignItems: 'center',
                    padding: '13px 20px',
                    fontSize: 13.5,
                    background: isMe ? GOLD(0.1) : 'transparent',
                    borderBottom: `1px solid ${GOLD(0.08)}`,
                  }}
                >
                  <div
                    style={{
                      color: rank <= 3 ? '#eed9a4' : 'rgba(240,226,191,.6)',
                      fontFamily: medal ? "'Song Myung', serif" : undefined,
                      fontSize: medal ? 16 : 13.5,
                    }}
                  >
                    {medal ?? rank}
                  </div>
                  <div style={{ color: '#f0e2bf', fontWeight: isMe ? 700 : 500, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    {profiles[r.user_id]?.user_nickname ?? r.user_id}
                    {isMe && <span style={{ fontSize: 11, color: GOLD(0.8) }}>(나)</span>}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 11.5,
                        padding: '3px 9px',
                        borderRadius: 999,
                        border: `1px solid ${TIER_COLOR[r.user_rank as RankType] ?? GOLD(0.4)}`,
                        color: TIER_COLOR[r.user_rank as RankType] ?? '#f0e2bf',
                      }}
                    >
                      {TIER_LABEL[r.user_rank as RankType] ?? r.user_rank}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', color: '#eed9a4' }}>{r.user_point}</div>
                  <div style={{ textAlign: 'right', color: 'rgba(240,226,191,.75)' }}>{winRate}%</div>
                  <div style={{ textAlign: 'right', color: 'rgba(240,226,191,.55)' }}>{played}</div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            style={{ ...ghostBtn, padding: '9px 18px', fontSize: 13, opacity: page <= 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: 'rgba(240,226,191,.7)',
              fontSize: 13,
              padding: '0 8px',
            }}
          >
            {page} 쪽
          </div>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || rows.length < PAGE_SIZE}
            style={{ ...ghostBtn, padding: '9px 18px', fontSize: 13, opacity: rows.length < PAGE_SIZE ? 0.4 : 1 }}
          >
            다음
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
