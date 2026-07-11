import { useState } from 'react';
import type { UserInfo, PlayerInfo, Stat, Room, Scores, Topic } from './types/game';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import WaitingPage from './pages/WaitingPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

const BASE_URL = 'https://example.com';

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

// // 실제 호출 시 사용법
// async function getUserData() {
//   // request 함수 호출 시 <User> 타입을 주입
//   const user = await request<User>('https://example.com');
//   console.log(user.name); 
// }


// - - - - - - - - - - - - - - - - - - - -
// 2. 인증 `/auth`
// - - - - - - - - - - - - - - - - - - - -

// !! WIP !! 
export async function userSignup(userId: string, userPw: string, userNickname: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/auth/signup', {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere  
      user_pw: userPw,
      user_nickname: userNickname })
  });

  return user;
}

// !! WIP !! 
// return token
export async function userLogin(userId: string, userPw: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/auth/login', {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere  
      user_pw: userPw
    })
  });

  return user;
}

// !! WIP !! 
// return token
export async function userRefresh(userId: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/auth/refresh', {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId // get userid from somewhere  
    })
  });

  return user;
}

// !! WIP !! 
export async function userLogout(userId: string): Promise<number> {
  const user = await request<UserInfo>('/auth/logout', {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId // get userid from somewhere  
    })
  });

  return 204;
}

// !! WIP !! 
export async function checkUserID(): Promise<UserInfo> {
  const user = await request<UserInfo>('/auth/check-id?userId={userId}', {
    method: "GET",
    headers: HEADER
  });

  return user;
}

// !! WIP !! 
export async function checkUserNickname(): Promise<UserInfo> {
  const user = await request<UserInfo>('/auth/check-nickname?nickname={nickname}', {
    method: "GET",
    headers: HEADER
  });

  return user;
}


// - - - - - - - - - - - - - - - - - - - -
// 3. 유저 `/users`
// - - - - - - - - - - - - - - - - - - - -

// !! WIP !! 
export async function getUserInfo(): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me', {
    method: "GET",
    headers: HEADER
  });

  return user;
}

// !! WIP !! 
export async function patchUserNickname(nickname: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me', {
    method: "PATCH",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere  
      user_nickname: nickname })
    });

  return user;
}

// !! WIP !! 
export async function patchUserPassword(password: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me/password', {
    method: "PATCH",
    headers: HEADER,
    body: JSON.stringify({ 
      user_id: userId, // get userid from somewhere  
      user_pw: password })
    });

  return user;
}

// !! WIP !! 
export async function putUserProfile(profile: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me/profile', {
    method: "PUT",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      user_profile: profile })
    });

  return user;
}

// !! WIP !! 
export async function deleteUserProfile(profile: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me/profile', {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere   
      user_profile: profile })
    });

  return user;
}


// !! WIP !! 
// get profile as byte type
export async function getUserProfile(): Promise<string> {
  const user = await request<string>('/users/{userId}/profile', {
    method: "GET",
    headers: HEADER,
  });

  return user;
}

// !! WIP !! 
// 공개정보 api
export async function getUser(): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/{userId}', {
    method: "GET",
    headers: HEADER,
  });
  
  return user;
}

// !! WIP !! 
export async function searchUser(keyword: string, page: number, size: number): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/search?keyword={keyword}&page={page}&size={size}', {
    method: "GET",
    headers: HEADER,
  });
  
  return user;
}

// !! WIP !! 
export async function deleteUser(): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me', {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId // get userid from somewhere   
    })
  });

  return user;
}

// !! WIP !! 
export async function getMyStat(): Promise<Stat> {
  const stat = await request<Stat>('/users/me/stat', {
    method: "GET",
    headers: HEADER,
  });
  
  return stat;
}

// !! WIP !! 
export async function getUserStat(userId: string): Promise<Stat> {
  const stat = await request<Stat>('/users/{userId}/stat', {
    method: "GET",
    headers: HEADER,
  });
  
  return stat;
}

// !! WIP !! 
export async function getRankings(page: number, size: number): Promise<Stat[]> {
  const stat = await request<Stat[]>('/rankings?page={page}&size={size}', {
    method: "GET",
    headers: HEADER,
  });
  
  return stat;
}

// - - - - - - - - - - - - - - - - - - - -
// 4. 방 로비 `/rooms`
// - - - - - - - - - - - - - - - - - - - -
// !! WIP !! 
export async function getRooms(page: number, size: number, open: boolean): Promise<Room[]> {
  const rooms = await request<Room[]>(`/rooms?page=${page}&size=${size}&open=${open}`, {
    method: "GET",
    headers: HEADER,
  });
  
  return rooms;
}

// !! WIP !! 
export async function createRoom(roomName: string, playerLimit: number, roundLimit: number, timeLimit: number, roomPw?: string): Promise<number> {
  const roomId = await request<number>('/rooms', {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      creator_id: userId, // get userid from somewhere 
      room_name: roomName,
      room_host: userNickname, // get user nickname from somewhere
      player_limit: playerLimit,
      room_cap: 1,
      round_limit: roundLimit,
      time_limit: timeLimit,
      room_pw: roomPw,
      can_access: true
    })
  });
  
  return roomId;
}

// !! WIP !! 
export async function getRoomDetail(): Promise<Room> {
  const room = await request<Room>('/rooms/{roomId}', {
    method: "GET",
    headers: HEADER,
  });
  
  return room;
}

// !! WIP !! 
export async function patchRoom(playerLimit: number, roundLimit: number, timeLimit: number, roomPw?: string): Promise<Room> {
  const room = await request<Room>('/rooms/{roomId}', {
    method: "PATCH",
    headers: HEADER,
    body: JSON.stringify({
      creator_id: userId, // get userid from somewhere 
      player_limit: playerLimit,
      round_limit: roundLimit,
      time_limit: timeLimit,
      room_pw: roomPw
    })
  });
  
  return room;
}

// !! WIP !! 
export async function deleteRoom(roomId: number): Promise<number> {
  const roomDeleted = await request<number>('/rooms/{roomId}', {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      creator_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return roomDeleted;
}

// !! WIP !! 
export async function joinRoom(roomId: number): Promise<PlayerInfo> {
  const player = await request<PlayerInfo>(`/rooms/${roomId}/join`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return player
}

// !! WIP !! 
export async function leaveRoom(roomId: number): Promise<number> {
  const leftRoom = await request<number>(`/rooms/${roomId}/leave`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return leftRoom
}

export async function getPlayers(roomId: number): Promise<PlayerInfo[]> {
  const players = await request<PlayerInfo[]>(`/rooms/${roomId}/players`, {
    method: "GET",
    headers: HEADER
  });
  
  return players
}

// !! WIP !! 
export async function playerReady(roomId: number): Promise<number> {
  const response = await request<number>(`/rooms/${roomId}/ready`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId,
      ready: true
    })
  });
  
  return response
}

// !! WIP !! 
export async function playerKick(roomId: number, targetUserId: string): Promise<number> {
  const response = await request<number>(`/rooms/${roomId}/kick`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId,
      target_user_id: targetUserId 
    })
  });
  
  return response
}

// !! WIP !! 
export async function playerStart(roomId: number): Promise<number> {
  const response = await request<number>(`/rooms/${roomId}/start`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return response
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
  const room = await request<number>(`/rooms/${roomId}/game/award`, {
    method: "POST",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere 
      room_id: roomId
    })
  });
  
  return room;
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
  
  return topic;
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
  
  return topic;
}

export async function postTopic(): Promise<number> {
  const topic = await request<Topic>(`/topics`, {
    method: "GET",
    headers: HEADER,
  });
  
  return topic;
}

// - - - - - - - - - - - - - - - - - - - -
// 7. 방 로비 `/rooms/{roomId}/game`
// - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - -
// 8. 방 로비 `/rooms/{roomId}/game`
// - - - - - - - - - - - - - - - - - - - -

// - - - - - - - - - - - - - - - - - - - -
// 9. 방 로비 `/rooms/{roomId}/game`
// - - - - - - - - - - - - - - - - - - - -

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
