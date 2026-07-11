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
// 3. 유저 `/users`
// - - - - - - - - - - - - - - - - - - - -

export async function getUserInfo(): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/me', {
    method: "GET",
    headers: HEADER
  });

  return user;
}

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

export async function getUserProfile(profile: string): Promise<UserInfo> {
  const user = await request<UserInfo>('/users/{userId}/profile', {
    method: "DELETE",
    headers: HEADER,
    body: JSON.stringify({
      user_id: userId, // get userid from somewhere   
      user_profile: profile })
    });

  return user;
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
