import { useState } from 'react';

import type { UserInfo, PlayerInfo, Stat, Room, Scores, Notification, UserFriends, Topic } from './types/game';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LobbyPage from './pages/LobbyPage';
import FriendsPage from './pages/FriendsPage';
import RankingPage from './pages/RankingPage';
import CreateRoomPage from './pages/CreateRoomPage';
import WaitingPage from './pages/WaitingPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import { SoundControl } from './components/SoundControl';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

const HEADER = {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${accessToken}"// `Bearer ${accessToken}`
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
  | { screen: 'create-room' }
  | { screen: 'waiting'; room: Room }
  | { screen: 'game'; room: Room }
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
            onJoin={(room) => setStage({ screen: 'waiting', room })}
            onCreateRoom={() => setStage({ screen: 'create-room' })}
            onFriends={() => setStage({ screen: 'friends' })}
            onRanking={() => setStage({ screen: 'ranking' })}
          />
        );
      case 'friends':
        return <FriendsPage userId={userId} onRetreat={() => setStage({ screen: 'lobby' })} />;
      case 'ranking':
        return <RankingPage userId={userId} onRetreat={() => setStage({ screen: 'lobby' })} />;
      case 'create-room':
        return (
          <CreateRoomPage
            userId={userId}
            nickname={nick}
            onCancel={() => setStage({ screen: 'lobby' })}
            onCreated={() => setStage({ screen: 'lobby' })}
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
  };

  return (
    <>
      <SoundControl />
      {renderPage()}
    </>
  );
}
