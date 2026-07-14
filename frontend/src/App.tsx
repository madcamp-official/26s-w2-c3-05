import { useState } from 'react';

import type { UserInfo, PlayerInfo, Stat, Room, Scores, Notification, UserFriends, Topic } from './types/game';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LobbyPage from './pages/LobbyPage';
import FriendsPage from './pages/FriendsPage';
import RankingPage from './pages/RankingPage';
import MyPage from './pages/MyPage';
import CreateRoomPage from './pages/CreateRoomPage';
import WaitingPage from './pages/WaitingPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import { SoundControl } from './components/SoundControl';
import type { GameEventMsg } from './features/game/hooks/useGameChannel';
import { connectStomp } from './lib/stompClient';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

const HEADER = {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${accessToken}"// `Bearer ${accessToken}`
};

// 매 요청 시점에 sessionStorage에서 토큰을 읽어 헤더 구성 (탭별 독립 — 계정 섞임 방지)
// (상수 HEADER는 로그인 "이전" 값이 박제되므로 새 코드는 이 함수를 사용)
function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type GetRequestInit = Omit<RequestInit, 'method' | 'body'> & {
  method: 'GET' | 'HEAD';
  body?: never;
}

type BodyRequestInit = Omit<RequestInit, 'method' | 'body'> & {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: BodyInit | null;
}

export type StrictRequestInit = GetRequestInit | BodyRequestInit;

// 범용 API 요청 함수
export async function request<T>(endpoint: string, options?: StrictRequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    // 토큰 만료(1시간): 죽은 세션을 정리해서 "조용한 실패" 대신 재로그인 유도
    if (response.status === 401) {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('userId');
      alert('입궁이 만료되었사옵니다. 다시 로그인하소서.');
      window.location.reload(); // 로그인 화면으로
    }
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }
  // 201/204처럼 본문이 없는 응답 대비
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// // 개발 전용: ws API 요청 함수
// // WIP => 소켓 요청 및 기능은 gameSocketClient.ts와 useGameSocket.ts로 분리해야 
// export async function requestWebSocket<T>(endpoint: string, options?: StrictRequestInit): Promise<T> {
//   const response = await fetch(`${WS_URL}${endpoint}`, options);

//   if (!response.ok) {
//     throw new Error(`네트워크 응답 에러: ${response.statusText}`);
//   }

//   return response.json() as Promise<T>;
// }

// - - - - - - - - - - - - - - - - - - - -
// 2. 인증 `/auth` - test required
// - - - - - - - - - - - - - - - - - - - -

// 회원가입: 백엔드는 201 + 빈 본문. 성공하면 true
export async function userSignup(userId: string, userPw: string, userNickname: string): Promise<boolean> {
  await request<void>(`/auth/signup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId, userPw, userNickname }),   // camelCase!
  });
  return true;
}

// 로그인: {accessToken} 이 바로 옴 (data 래핑 없음)
export async function userLogin(userId: string, userPw: string): Promise<string> {
  const response = await request<{ accessToken: string }>(`/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId, userPw }),
  });
  return response.accessToken;
}

// test required
// return token
export async function userRefresh(userId: string): Promise<string> {
  const response = await request<Record<string, any>>(`/auth/refresh`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId,
      refreshToken: true
    })
  });

  return response.data.accessToken
}

// test required
export async function userLogout(userId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/auth/logout`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId // get userid from somewhere  
    })
  });

  return response.success
}

// 아이디 중복확인: 응답이 boolean 그 자체 (true = 사용 가능)
export async function checkUserID(userId: string): Promise<boolean> {
  return request<boolean>(`/auth/check-id?userId=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function checkUserNickname(nickname: string): Promise<boolean> {
  return request<boolean>(`/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`, {
    method: "GET",
    headers: authHeaders(),
  });
}


// - - - - - - - - - - - - - - - - - - - -
// 3. 유저 `/users` - WIP
// - - - - - - - - - - - - - - - - - - - -

// 내 정보: 백엔드는 camelCase(MyPageResponse) → 프론트 타입(snake_case)으로 변환
export async function getUserInfo(): Promise<UserInfo> {
  const d = await request<Record<string, any>>(`/users/me`, {
    method: "GET",
    headers: authHeaders(),
  });
  return {
    user_id: d.userId,
    user_pw: '',
    registered_at: '',
    user_nickname: d.userNickname,
    user_profile: '',
  };
}

// 마이페이지 정보 (닉네임+전적, /users/me 응답을 snake_case로 변환)
export interface MyPageInfo {
  user_id: string;
  user_nickname: string;
  user_rank: string;
  user_point: number;
  user_win: number;
  user_lose: number;
  user_played: number;
  win_rate: number;   // 승률(%) — 서버 계산값
}

export async function getMyPage(): Promise<MyPageInfo> {
  const d = await request<Record<string, any>>(`/users/me`, {
    method: "GET",
    headers: authHeaders(),
  });
  return {
    user_id: d.userId,
    user_nickname: d.userNickname,
    user_rank: d.userRank,
    user_point: d.userPoint,
    user_win: d.userWin,
    user_lose: d.userLose,
    user_played: d.userPlayed,
    win_rate: d.winRate,
  };
}

// 닉네임 변경 (백엔드 계약: PATCH /users/me/nickname {userNickname})
export async function patchUserNickname(nickname: string): Promise<boolean> {
  await request<void>(`/users/me/nickname`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ userNickname: nickname }),
  });
  return true;
}

// test required
export async function patchUserPassword(password: string): Promise<UserInfo> {
  const response = await request<Record<string, any>>(`/users/me/password`, {
    method: "PATCH",
    headers: HEADER,
    body: JSON.stringify({ 
      user_pw: password })
    });

  return response.success
}

// test required
export async function putUserProfile(userId: string, profile: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/users/me/profile`, {
    method: "PUT",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId,
      user_profile: profile })
    });

  return response.success
}

// test required
export async function deleteUserProfile(userId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/users/me/profile`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({  
      user_id: userId })
    });

  return response.success
}


// !! WIP !! 
// get profile as byte type
export async function getUserProfile(userId: string): Promise<string> {
  const response = await request<Record<string, any>>(`/users/${userId}/profile`, {
    method: "GET",
    headers: HEADER,
  });

  const byteData = response.data.profile
   // 변환 로직

  return byteData
}

// test required
export async function getUser(userId: string): Promise<UserInfo> {
  const response = await request<Record<string, any>>(`/users/${userId}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// test required
export async function searchUser(keyword: string, page: number, size: number): Promise<UserInfo> {
  const response = await request<Record<string, any>>(`/users/search?keyword=${keyword}&page=${page}&size=${size}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// test required
export async function deleteUser(userId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/users/me`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId
    })
  });

  return response.success
}

// test required 
export async function getMyStat(): Promise<Stat> {
  const response = await request<Record<string, any>>(`/users/me/stat`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// test required
export async function getUserStat(userId: string): Promise<Stat> {
  const response = await request<Record<string, any>>(`/users/${userId}/stat`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// test required
export async function getRankings(page: number, size: number): Promise<Stat[]> {
  const response = await request<Record<string, any>>(`/rankings?page=${page}&size=${size}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// - - - - - - - - - - - - - - - - - - - -
// 4. 방 로비 `/rooms`
// - - - - - - - - - - - - - - - - - - - -
// 방 목록: 백엔드 RoomDto(camelCase) → 프론트 Room(snake_case) 변환
export async function getRooms(): Promise<Room[]> {
  const list = await request<Record<string, any>[]>(`/rooms`, {
    method: "GET",
    headers: authHeaders(),
  });
  
  return list.map((d) => ({
      room_id: d.roomId,
      creator_id: d.creatorId,
      room_name: d.roomName,
      room_host: d.creatorNickname ?? d.creatorId,
      room_count: d.currentPlayers,
      player_limit: d.playerLimit,
      round_limit: d.roundLimit,
      time_limit: d.timeLimit,
      can_access: true,            // 목록엔 입장 가능한 방만 옴
    }));
  }

// 방 생성: 생성자는 JWT로 서버가 알아냄 → 방 정보만 보냄. roomId 반환
export async function createRoom(
  _userId: string, roomName: string, _userNickname: string,
  playerLimit: number, roundLimit: number, timeLimit: number, roomPw?: string
): Promise<number> {
  const d = await request<Record<string, any>>(`/rooms`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ roomName, playerLimit, roundLimit, timeLimit, roomPw }),
  });
  return d.roomId;
}

// test required
export async function getRoomDetail(roomId: string): Promise<Room> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// test required
export async function patchRoom(roomId: string, playerLimit: number, roundLimit: number, timeLimit: number, roomPw?: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}`, {
    method: "PATCH",
    headers: HEADER,
    body: JSON.stringify({
      // creator_id: userId,  
      player_limit: playerLimit,
      round_limit: roundLimit,
      time_limit: timeLimit,
      room_pw: roomPw
    })
  });
  
  return response.success
}

// test required
export async function deleteRoom(roomId: number): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      // creator_id: userId, 
      room_id: roomId
    })
  });
  
  return response.success
}

// 방 입장 (비밀방이면 roomPw 전달)
export async function joinRoom(_userId: string, roomId: number, roomPw?: string): Promise<Room> {
  const d = await request<Record<string, any>>(`/rooms/${roomId}/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ roomPw }),
  });
  return {
    room_id: d.roomId, creator_id: d.creatorId, room_name: d.roomName,
    room_host: d.creatorNickname ?? d.creatorId,
    room_count: d.currentPlayers, player_limit: d.playerLimit,
    round_limit: d.roundLimit, time_limit: d.timeLimit, can_access: true,
  } as Room;
}

// 방 나가기 (DELETE + body 없음 — 백엔드 계약)
export async function leaveRoom(_userId: string, roomId: number): Promise<void> {
  await request<void>(`/rooms/${roomId}/leave`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}


// 방 참가자 목록
export async function getPlayers(roomId: number): Promise<{ user_id: string; nickname: string }[]> {
  const list = await request<Record<string, any>[]>(`/rooms/${roomId}/players`, {
    method: "GET",
    headers: authHeaders(),
  });
  return list.map((d) => ({ user_id: d.userId, nickname: d.nickname }));
}

// test required
export async function playerReady(userId: string, roomId: number): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/ready`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId,
      ready: true
    })
  });
  
  return response.success
}

// test required
export async function playerKick(userId: string, roomId: number, targetUserId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/kick`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId,
      target_user_id: targetUserId 
    })
  });
  
  return response.success
}

//  test required
export async function playerStart(userId: string, roomId: number): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/start`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return response.success
}


// - - - - - - - - - - - - - - - - - - - -
// 5. 방 로비 `/rooms/{roomId}/game`
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function getGameSnapshot(roomId: number): Promise<Room> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/game`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
// REST 폴백 준비
export async function giveAward(roomId: number, targetUserId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/game/award`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: targetUserId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return response.success
}

// test required
// "Scores" 타입으로 Promise해야 하는지 불확실
export async function getResult(roomId: number): Promise<Scores> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/result`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// - - - - - - - - - - - - - - - - - - - -
// 6. 방 로비 `topics`
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function getRandomTopic(): Promise<Topic> {
  const response = await request<Record<string, any>>(`/topics/random`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function getTopicList(): Promise<Topic[]> {
  const response = await request<Record<string, any>>(`/topics`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function getTopicByID(topicId: number): Promise<Topic> {
  const response = await request<Record<string, any>>(`/topics/${topicId}`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
// 인증 필요
export async function postTopic(userId: string, topicId: number, topicHead: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/topics`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      topic_id: topicId,
      topic_head: topicHead
    })
  });
  
  return response.success
}

// test required
// 인증 필요
export async function putTopic(userId: string, topicId: number, topicHead: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/topics/${topicId}`, {
    method: "PUT",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      topic_id: topicId,
      topic_head: topicHead
    })
  });
  
  return response.success
}

// test required
// 인증 필요
export async function deleteTopic(userId: string, topicId: number): Promise<boolean> {
  const response = await request<Record<string, any>>(`/topics/${topicId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      topic_id: topicId
    })
  });
  
  return response.success
}

// - - - - - - - - - - - - - - - - - - - -
// 7. 친구 `/friends`
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function getFriends(): Promise<UserFriends[]> {
  const response = await request<Record<string, any>>(`/friends`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function getFriendsRequestsToMe(): Promise<Notification[]> {
  const response = await request<Record<string, any>>(`/friends/requests/received`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function getFriendsRequestsByMe(): Promise<Notification[]> {
  const response = await request<Record<string, any>>(`/friends/requests/sent`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function sendFriendsRequests(userId: string, toUserId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/friends/requests`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      recipient_id: toUserId
    })
  });
  
  return response.success
}

// test required
export async function acceptFriendsRequests(userId: string, fromUserId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/friends/requests/${fromUserId}/accept`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      actor_id: fromUserId
    })
  });
  
  return response.success
}

// test required
export async function deleteFriendsRequests(userId: string, fromUserId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/friends/requests/${fromUserId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      actor_id: fromUserId
    })
  });
  
  return response.success
}

// test required
export async function deleteFriends(userId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/friends/${userId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      to_id: userId // get userid (friend) from somewhere 
    })
  });
  
  return response.success
}


// - - - - - - - - - - - - - - - - - - - -
// 8. 알림 `/notifications`
// - - - - - - - - - - - - - - - - - - - -
// test required
export async function getNotifications(page: number, size: number): Promise<Notification[]> {
  const response = await request<Record<string, any>>(`/notifications?page=${page}&size=${size}`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function getNotificationUnreadCount(): Promise<number> {
  const response = await request<Record<string, any>>(`/notifications/unread-count`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// !! WIP !! user/queue/notifications

// - - - - - - - - - - - - - - - - - - - -
// 9. 실시간 게임 (WebSocket / STOMP)
// - - - - - - - - - - - - - - - - - - - -

// !! WIP !!
// export async function openWebSocket(): Promise<boolean> {
//   const response = await requestWebSocket<Record<string, any>>(`/ws`, {
//     method: "GET",
//     headers: HEADER
//   });
  
//   return response.success
// }

// - - - - - - - - - - - - - - - - - - - -
// 10. 시스템 · 메타
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function getHealth(): Promise<number> {
  const response = await request<Record<string, any>>(`/health`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// test required
export async function getVersion(): Promise<string> {
  const response = await request<Record<string, any>>(`/version`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
}

// Stages and Main App

type Stage =
  | { screen: 'login' }
  | { screen: 'signup' }
  | { screen: 'lobby' }
  | { screen: 'friends' }
  | { screen: 'ranking' }
  | { screen: 'mypage' }
  | { screen: 'create-room' }
  | { screen: 'waiting'; room: Room }
  | { screen: 'game'; room: Room; firstEvent: GameEventMsg }
  | { screen: 'result'; room: Room; scores: Scores };

export default function App() {
  const [nick, setNick] = useState('');
  const [userId, setUserId] = useState('');
  const [stage, setStage] = useState<Stage>({ screen: 'login' });

  // 화면 분기만 담당 (switch가 case마다 바로 return하므로 함수로 분리)
  const renderPage = () => {
    switch (stage.screen) {
      case 'login':
        return (
          <LoginPage
            onEnter={(id, name) => {
              setUserId(id);
              connectStomp(sessionStorage.getItem('accessToken') ?? ''); // 추가
              setNick(name);
              setStage({ screen: 'lobby' });
            }}
            onSignup={() => setStage({ screen: 'signup' })}
          />
        );
      case 'signup':
        return (
          <SignupPage
            onSignedUp={() => setStage({ screen: 'login' })}
            onBack={() => setStage({ screen: 'login' })}
          />
        );
      case 'lobby':
        return (
          <LobbyPage
            nick={nick}
            onRetreat={() => setStage({ screen: 'login' })}
            onJoin={async (room) => {
              try {
                // 서버에 실제 입장 등록 (이걸 안 하면 명단에 안 잡힘)
                const joined = await joinRoom('', room.room_id);
                setStage({ screen: 'waiting', room: joined });
              } catch {
                alert('입장할 수 없는 연회이옵니다 (정원 초과·비밀방·이미 시작됨)');
              }
            }}
            onCreateRoom={() => setStage({ screen: 'create-room' })}
            onFriends={() => setStage({ screen: 'friends' })}
            onRanking={() => setStage({ screen: 'ranking' })}
            onMyPage={() => setStage({ screen: 'mypage' })}
          />
        );
      case 'friends':
        return <FriendsPage userId={userId} onRetreat={() => setStage({ screen: 'lobby' })} />;
      case 'mypage':
        return (
          <MyPage
            onBack={() => setStage({ screen: 'lobby' })}
            onNicknameChanged={(n) => setNick(n)}
          />
        );
      case 'ranking':
        return <RankingPage userId={userId} onRetreat={() => setStage({ screen: 'lobby' })} />;
      case 'create-room':
        return (
          <CreateRoomPage
            userId={userId}
            nickname={nick}
            onCancel={() => setStage({ screen: 'lobby' })}
            onCreated={async (roomId) => {
              const room = await joinRoom('', roomId);   // 재입장 허용이라 방장도 안전 (방 정보 획득용)
              setStage({ screen: 'waiting', room });
            }}
          />
        );
      case 'waiting':
        return (
          <WaitingPage
            nick={nick}
            room={stage.room}
            onLeave={() => setStage({ screen: 'lobby' })}
            onStart={(first) => setStage({ screen: 'game', room: stage.room, firstEvent: first })}
          />
        );
      case 'game':
        return (
          <GamePage
            nick={nick}
            room={stage.room}
            firstEvent={stage.firstEvent}
            onFinish={(scores) => setStage({ screen: 'result', room: stage.room, scores })}
            onAborted={() => setStage({ screen: 'waiting', room: stage.room })}
            onExit={() => setStage({ screen: 'lobby' })}
          />
        );
      case 'result':
        return (
          <ResultPage
            nick={nick}
            scores={stage.scores}
            onLobby={() => setStage({ screen: 'lobby' })}
            onAgain={() => setStage({ screen: 'waiting', room: stage.room })}
          />
        );
    }
  };

  return (
    <>
      <SoundControl />
      {renderPage()}
    </>
  );
}
