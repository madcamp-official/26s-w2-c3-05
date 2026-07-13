import { useState } from 'react';
import type { UserInfo, PlayerInfo, Stat, Room, Scores, Notification, UserFriends, Topic } from './types/game';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import WaitingPage from './pages/WaitingPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

const BASE_URL = 'https://example.com';
const WS_URL = 'ws://localhost:8080';

const HEADER = {
  "Content-Type": "application/json",
  "Authorization": "Bearer {accessToken}"
};

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
    throw new Error(`네트워크 응답 에러: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// 개발 전용: ws API 요청 함수
// WIP => 소켓 요청 및 기능은 gameSocketClient.ts와 useGameSocket.ts로 분리해야 
export async function requestWebSocket<T>(endpoint: string, options?: StrictRequestInit): Promise<T> {
  const response = await fetch(`${WS_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new Error(`네트워크 응답 에러: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// - - - - - - - - - - - - - - - - - - - -
// 2. 인증 `/auth` - test required
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function userSignup(userId: string, userPw: string, userNickname: string): Promise<string> {
  const response = await request<Record<string, any>>(`/auth/signup`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId,  
      user_pw: userPw,
      user_nickname: userNickname })
  });

  return response.success
}

// test required 
// return token
export async function userLogin(userId: string, userPw: string): Promise<string> {
  const response = await request<Record<string, any>>(`/auth/login`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId,
      user_pw: userPw
    })
  });

  return response.data.accessToken
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

// test required
export async function checkUserID(userId: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/auth/check-id?userId=${userId}`, {
    method: "GET",
    headers: HEADER
  });

  return response.success
}

// test acquired
export async function checkUserNickname(nickname: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/auth/check-nickname?nickname=${nickname}`, {
    method: "GET",
    headers: HEADER
  });

  return response.success
}


// - - - - - - - - - - - - - - - - - - - -
// 3. 유저 `/users` - WIP
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function getUserInfo(): Promise<UserInfo> {
  const response = await request<Record<string, any>>(`/users/me`, {
    method: "GET",
    headers: HEADER
  });

  return response.data
}

// test required
export async function patchUserNickname(nickname: string): Promise<boolean> {
  const response = await request<Record<string, any>>(`/users/me`, {
    method: "PATCH",
    headers: HEADER,
    body: JSON.stringify({
      user_nickname: nickname })
    });

  return response.success
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

  return response.data.profile
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
// test required 
export async function getRooms(page: number, size: number, open: boolean): Promise<Room[]> {
  const response = await request<Record<string, any>>(`/rooms?page=${page}&size=${size}&open=${open}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response.data
}

// test required
export async function createRoom(userId: string, roomName: string, userNickname: string, playerLimit: number, roundLimit: number, timeLimit: number, roomPw?: string): Promise<number> {
  const response = await request<Record<string, any>>(`/rooms`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      creator_id: userId,  
      room_name: roomName,
      room_host: userNickname, 
      room_count: 1,
      player_limit: playerLimit,
      round_limit: roundLimit,
      time_limit: timeLimit,
      room_pw: roomPw,
      can_access: true
    })
  });
  
  return response.success
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
  const response = await request<Record<string, any>>('/rooms/{roomId}', {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      // creator_id: userId, 
      room_id: roomId
    })
  });
  
  return response.success
}

// test required
export async function joinRoom(userId: string, roomId: number): Promise<PlayerInfo> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/join`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return response.data
}

// test required
export async function leaveRoom(userId: string, roomId: number): Promise<boolean> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/leave`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return response.data
}

// test required
export async function getPlayers(roomId: number): Promise<PlayerInfo[]> {
  const response = await request<Record<string, any>>(`/rooms/${roomId}/players`, {
    method: "GET",
    headers: HEADER
  });
  
  return response.data
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
// !! WIP !! 
export async function getGameSnapshot(roomId: number): Promise<Room> {
  const room = await request<Room>(`/rooms/${roomId}/game`, {
    method: "GET",
    headers: HEADER
  });
  
  return room;
}

// !! WIP !! 
// REST 폴백 준비
export async function giveAward(roomId: number, targetUserId: string): Promise<number> {
  const response = await request<number>(`/rooms/${roomId}/game/award`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: targetUserId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return response
}

// !! WIP !!
export async function getResult(roomId: number): Promise<PlayerResult> {
  const result = await request<PlayerResult>(`/rooms/${roomId}/result`, {
    method: "GET",
    headers: HEADER
  });
  
  return result
}

// - - - - - - - - - - - - - - - - - - - -
// 6. 방 로비 `topics`
// - - - - - - - - - - - - - - - - - - - -

export async function getRandomTopic(): Promise<Topic> {
  const topic = await request<Topic>(`/topics/random`, {
    method: "GET",
    headers: HEADER
  });
  
  return topic
}

export async function getTopicList(): Promise<Topic[]> {
  const topics = await request<Topic[]>(`/topics`, {
    method: "GET",
    headers: HEADER
  });
  
  return topics;
}

export async function getTopicByID(topicId: number): Promise<Topic> {
  const topic = await request<Topic>(`/topics/${topicId}`, {
    method: "GET",
    headers: HEADER
  });
  
  return topic
}

// !! WIP !!
// 인증 필요
export async function postTopic(topicId: number, topicHead: string): Promise<number> {
  const response = await request<number>(`/topics`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      topic_id: topicId,
      topic_head: topicHead
    })
  });
  
  return response
}

// !! WIP !!
// 인증 필요
export async function putTopic(topicId: number, topicHead: string): Promise<number> {
  const response = await request<number>(`/topics/${topicId}`, {
    method: "PUT",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      topic_id: topicId,
      topic_head: topicHead
    })
  });
  
  return response
}

// !! WIP !!
// 인증 필요
export async function deleteTopic(topicId: number): Promise<number> {
  const response = await request<number>(`/topics/${topicId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      topic_id: topicId
    })
  });
  
  return response
}

// - - - - - - - - - - - - - - - - - - - -
// 7. 친구 `/friends`
// - - - - - - - - - - - - - - - - - - - -

export async function getFriends(): Promise<UserFriends[]> {
  const friends = await request<UserFriends[]>(`/friends`, {
    method: "GET",
    headers: HEADER
  });
  
  return friends;
}

export async function getFriendsRequestsToMe(): Promise<Notification[]> {
  const requests = await request<Notification[]>(`/friends/requests/received`, {
    method: "GET",
    headers: HEADER
  });
  
  return requests;
}

export async function getFriendsRequestsByMe(): Promise<Notification[]> {
  const requests = await request<Notification[]>(`/friends/requests/sent`, {
    method: "GET",
    headers: HEADER
  });
  
  return requests;
}

// !! WIP !!
export async function sendFriendsRequests(toUserId: string): Promise<number> {
  const response = await request<number>(`/friends/requests`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      recipient_id: toUserId
    })
  });
  
  return response;
}

// !! WIP !!
export async function acceptFriendsRequests(fromUserId: string): Promise<number> {
  const response = await request<number>(`/friends/requests/${fromUserId}/accept`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      actor_id: fromUserId
    })
  });
  
  return response;
}

// !! WIP !!
export async function deleteFriendsRequests(fromUserId: string): Promise<number> {
  const response = await request<number>(`/friends/requests/${fromUserId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      actor_id: fromUserId
    })
  });
  
  return response;
}

// !! WIP !!
export async function deleteFriends(userId: string): Promise<number> {
  const response = await request<number>(`/friends/${userId}`, {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      to_id: userId // get userid (friend) from somewhere 
    })
  });
  
  return response;
}


// - - - - - - - - - - - - - - - - - - - -
// 8. 알림 `/notifications`
// - - - - - - - - - - - - - - - - - - - -
// !! WIP !!
export async function getNotifications(page: number, size: number): Promise<Notification[]> {
  const notifications = await request<Notification[]>(`/notifications?page=${page}&size=${size}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return notifications;
}

// !! WIP !!
export async function getNotificationUnreadCount(): Promise<number> {
  const unread_count = await request<number>(`/notifications/unread-count`, {
    method: "GET",
    headers: HEADER,
  });
  
  return unread_count;
}

// !! WIP !! user/queue/notifications

// - - - - - - - - - - - - - - - - - - - -
// 9. 실시간 게임 (WebSocket / STOMP)
// - - - - - - - - - - - - - - - - - - - -

// !! WIP !!
export async function openWebSocket(): Promise<number> {
  const response = await requestWebSocket<number>(`/ws`, {
    method: "GET",
    headers: HEADER,
  });
  
  return response
}

// - - - - - - - - - - - - - - - - - - - -
// 10. 시스템 · 메타
// - - - - - - - - - - - - - - - - - - - -

// test required
export async function getHealth(): Promise<number> {
  const health = await request<number>(`/health`, {
    method: "GET",
    headers: HEADER,
  });
  
  return health
}

// test required
export async function getVersion(): Promise<string> {
  const version = await request<string>(`/version`, {
    method: "GET",
    headers: HEADER,
  });
  
  return version
}


type Stage =
  | { screen: 'login' }
  | { screen: 'lobby' }
  | { screen: 'waiting'; room: Room }
  | { screen: 'game'; room: Room }
  | { screen: 'result'; room: Room; scores: Scores };

export default function App() {
  const [nick, setNick] = useState('');
  const [stage, setStage] = useState<Stage>({ screen: 'login' });

  switch (stage.screen) {
    case 'login':
      return (
        <LoginPage
          onEnter={(name) => {
            setNick(name);
            setStage({ screen: 'lobby' });
          }}
        />
      );
    case 'lobby':
      return (
        <LobbyPage
          nick={nick}
          onRetreat={() => setStage({ screen: 'login' })}
          onJoin={(room) => setStage({ screen: 'waiting', room })} 
        />
      );
    case 'waiting':
      return (
        <WaitingPage
          nick={nick}
          room={stage.room}
          onLeave={() => setStage({ screen: 'lobby' })}
          onStart={() => setStage({ screen: 'game', room: stage.room })}
        />
      );
    case 'game':
      return (
        <GamePage
          nick={nick}
          onFinish={(scores) => setStage({ screen: 'result', room: stage.room, scores })}
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
}
