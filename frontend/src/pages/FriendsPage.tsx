import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { UserFriends, Notification, UserInfo } from '../types/game';
import { panel, primaryBtn, ghostBtn, Divider, Seal, Backdrop, GOLD } from '../components/ui';
import {
  getFriends,
  getFriendsRequestsToMe,
  getFriendsRequestsByMe,
  sendFriendsRequests,
  acceptFriendsRequests,
  deleteFriendsRequests,
  deleteFriends,
  searchUser,
  getUser,
} from '../App';

type Tab = 'friends' | 'received' | 'sent';

export default function FriendsPage({
  userId,
  onRetreat,
}: {
  userId: string;
  onRetreat: () => void;
}) {
  const [tab, setTab] = useState<Tab>('friends');

  const [friends, setFriends] = useState<UserFriends[]>([]);
  const [received, setReceived] = useState<Notification[]>([]);
  const [sent, setSent] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const loadProfiles = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids)).filter((id) => id && id !== userId);
    if (unique.length === 0) return;
    const pairs = await Promise.all(
      unique.map(async (id) => {
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
  }, [userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setActionError('');
    try {
      const [f, r, s] = await Promise.all([
        getFriends(),
        getFriendsRequestsToMe(),
        getFriendsRequestsByMe(),
      ]);
      setFriends(f ?? []);
      setReceived(r ?? []);
      setSent(s ?? []);

      const ids: string[] = [
        ...(f ?? []).map((x) => (x.from_id === userId ? x.to_id : x.from_id)),
        ...(r ?? []).map((x) => x.actor_id),
        ...(s ?? []).map((x) => x.recipient_id),
      ];
      await loadProfiles(ids);
    } catch {
      setActionError('명부를 불러오지 못하였사옵니다');
    } finally {
      setLoading(false);
    }
  }, [userId, loadProfiles]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const nameOf = (id: string) => profiles[id]?.user_nickname ?? id;

  const friendRows = useMemo(
    () =>
      friends.map((f) => ({
        id: f.from_id === userId ? f.to_id : f.from_id,
        since: f.friend_date,
      })),
    [friends, userId]
  );

  const doSearch = async () => {
    const v = query.trim();
    if (!v) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const raw = await searchUser(v, 1, 10);
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setSearchResults(list.filter((u) => u.user_id !== userId));
    } catch {
      setActionError('검색에 실패하였사옵니다');
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetId: string) => {
    try {
      await sendFriendsRequests(userId, targetId);
      setSentIds((prev) => new Set(prev).add(targetId));
    } catch {
      setActionError('요청을 보내지 못하였사옵니다');
    }
  };

  const accept = async (actorId: string) => {
    try {
      await acceptFriendsRequests(userId, actorId);
      await refresh();
    } catch {
      setActionError('요청 수락에 실패하였사옵니다');
    }
  };

  const declineReceived = async (actorId: string) => {
    try {
      await deleteFriendsRequests(userId, actorId);
      await refresh();
    } catch {
      setActionError('처리에 실패하였사옵니다');
    }
  };

  const cancelSent = async (recipientId: string) => {
    try {
      await deleteFriendsRequests(userId, recipientId);
      await refresh();
    } catch {
      setActionError('처리에 실패하였사옵니다');
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await deleteFriends(friendId);
      await refresh();
    } catch {
      setActionError('벗을 내치지 못하였사옵니다');
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'friends', label: '벗 목록', count: friendRows.length },
    { key: 'received', label: '받은 청', count: received.length },
    { key: 'sent', label: '보낸 청', count: sent.length },
  ];

  return (
    <Backdrop
      image="/assets/bg-lobby.png"
      overlay="linear-gradient(180deg, rgba(14,6,4,.62) 0%, rgba(14,6,4,.78) 100%)"
      scroll
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 860,
          margin: '0 auto',
          padding: '44px 32px 60px',
          animation: 'fadeUp .5s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Seal char="友" size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Song Myung', serif", fontSize: 28, color: '#eed9a4', letterSpacing: 6 }}>
              벗 명부{' '}
              <span style={{ fontSize: 16, color: 'rgba(238,217,164,.6)', letterSpacing: 2 }}>交友帖</span>
            </div>
            <div style={{ marginTop: 2, color: 'rgba(240,226,191,.75)', fontSize: 14 }}>
              궁 안팎의 벗을 청하고, 청을 받으소서
            </div>
          </div>
          <button onClick={onRetreat} style={{ ...ghostBtn, padding: '12px 20px', fontSize: 14, letterSpacing: 2 }}>
            로비로
          </button>
        </div>

        <Divider margin="24px 0 22px" />

        {/* 검색 및 벗 청하기 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={query}
            placeholder="아이디 또는 궁호로 벗을 찾으소서"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSearch();
            }}
            style={{
              flex: 1,
              background: 'rgba(12,5,4,.6)',
              border: `1px solid ${GOLD(0.4)}`,
              borderRadius: 8,
              padding: '12px 14px',
              color: '#f5e9cf',
              fontSize: 14,
              letterSpacing: 0.5,
            }}
          />
          <button
            onClick={doSearch}
            disabled={searching}
            style={{ ...primaryBtn, padding: '0 22px', fontSize: 13, letterSpacing: 2 }}
          >
            {searching ? '찾는 중…' : '찾기'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'rgba(22,9,7,.6)',
              border: `1px solid ${GOLD(0.25)}`,
              borderRadius: 10,
              padding: 10,
            }}
          >
            {searchResults.map((u) => {
              const already = friendRows.some((f) => f.id === u.user_id);
              const isSent = sentIds.has(u.user_id) || sent.some((s) => s.recipient_id === u.user_id);
              return (
                <div
                  key={u.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: 8,
                    background: 'rgba(12,5,4,.4)',
                  }}
                >
                  <div style={{ flex: 1, color: '#f0e2bf', fontSize: 14 }}>
                    {u.user_nickname}{' '}
                    <span style={{ color: 'rgba(240,226,191,.5)', fontSize: 11.5 }}>@{u.user_id}</span>
                  </div>
                  <button
                    onClick={() => sendRequest(u.user_id)}
                    disabled={already || isSent}
                    style={{
                      ...ghostBtn,
                      padding: '7px 14px',
                      fontSize: 12,
                      letterSpacing: 1,
                      opacity: already || isSent ? 0.45 : 1,
                    }}
                  >
                    {already ? '이미 벗' : isSent ? '청을 보냄' : '벗 청하기'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Divider margin="24px 0 18px" />

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 8,
                fontSize: 13,
                letterSpacing: 1.5,
                cursor: 'pointer',
                border: `1px solid ${tab === t.key ? GOLD(0.6) : GOLD(0.2)}`,
                background: tab === t.key ? GOLD(0.12) : 'transparent',
                color: tab === t.key ? '#f0e2bf' : 'rgba(240,226,191,.55)',
              }}
            >
              {t.label} {t.count > 0 && <span style={{ color: GOLD(0.8) }}>· {t.count}</span>}
            </button>
          ))}
        </div>

        {actionError && (
          <div style={{ marginTop: 14, color: '#e89096', fontSize: 12.5, textAlign: 'center' }}>{actionError}</div>
        )}

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <EmptyState text="불러오는 중이옵니다…" />
          ) : tab === 'friends' ? (
            friendRows.length === 0 ? (
              <EmptyState text="아직 청한 벗이 없사옵니다" />
            ) : (
              friendRows.map((f) => (
                <Row key={f.id}>
                  <RowName>{nameOf(f.id)}</RowName>
                  <RowSub>@{f.id}</RowSub>
                  <button
                    onClick={() => removeFriend(f.id)}
                    style={{ ...ghostBtn, padding: '8px 14px', fontSize: 12, letterSpacing: 1 }}
                  >
                    절연하기
                  </button>
                </Row>
              ))
            )
          ) : tab === 'received' ? (
            received.length === 0 ? (
              <EmptyState text="받은 청이 없사옵니다" />
            ) : (
              received.map((n) => (
                <Row key={String(n.notice_num)}>
                  <RowName>{nameOf(n.actor_id)}</RowName>
                  <RowSub>@{n.actor_id}</RowSub>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => accept(n.actor_id)}
                      style={{ ...primaryBtn, padding: '8px 14px', fontSize: 12, letterSpacing: 1 }}
                    >
                      수락
                    </button>
                    <button
                      onClick={() => declineReceived(n.actor_id)}
                      style={{ ...ghostBtn, padding: '8px 14px', fontSize: 12, letterSpacing: 1 }}
                    >
                      거절
                    </button>
                  </div>
                </Row>
              ))
            )
          ) : sent.length === 0 ? (
            <EmptyState text="보낸 청이 없사옵니다" />
          ) : (
            sent.map((n) => (
              <Row key={String(n.notice_num)}>
                <RowName>{nameOf(n.recipient_id)}</RowName>
                <RowSub>@{n.recipient_id}</RowSub>
                <button
                  onClick={() => cancelSent(n.recipient_id)}
                  style={{ ...ghostBtn, padding: '8px 14px', fontSize: 12, letterSpacing: 1 }}
                >
                  청 거두기
                </button>
              </Row>
            ))
          )}
        </div>
      </div>
    </Backdrop>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderRadius: 10,
        background: 'rgba(22,9,7,.6)',
        border: `1px solid ${GOLD(0.22)}`,
      }}
    >
      {children}
    </div>
  );
}

function RowName({ children }: { children: ReactNode }) {
  return <div style={{ color: '#f0e2bf', fontSize: 14.5, fontWeight: 600 }}>{children}</div>;
}

function RowSub({ children }: { children: ReactNode }) {
  return <div style={{ flex: 1, color: 'rgba(240,226,191,.5)', fontSize: 12 }}>{children}</div>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '32px 0',
        textAlign: 'center',
        color: 'rgba(240,226,191,.5)',
        fontSize: 13.5,
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
}
