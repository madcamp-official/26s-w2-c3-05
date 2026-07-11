import { useState } from 'react';
import type { Room, Scores } from './types/game';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import WaitingPage from './pages/WaitingPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

type Stage =
  | { screen: 'login' }
  | { screen: 'lobby' }
  | { screen: 'waiting'; room: Room }
  | { screen: 'game'; room: Room }
  | { screen: 'result'; room: Room; scores: Scores };

export interface UserInfo {
  user_id: string;
  user_pw: string;
  registered_at: string; // timestamptz 타입
  user_nickname: string;
  user_profile: string; // buffer 타입
}

export interface PlayerInfo {
  user_id: string;
  room_id: number;
  player_role: string; // roletype_t 타입
  player_result: string; // wintype_t 타입
  player_rank: number;
}

export interface RoomInfo {
  room_id: number;
  creator_id: string;
  player_limit: number;
  round_limit: number;
  time_limit: number;
  room_pw: string;
  can_access: boolean;
}

export interface Stat {
  user_id: string;
  user_rank: string; //ranktype_t 타입
  user_point: number;
  user_win: number;
  user_lose: number;
  user_played: number;
}

export interface Notification {
  notice_num: bigint;
  recipient_id: string;
  actor_id: string;
  type: string; //notificationtype_t
  is_read: boolean;
  created_at: string; // timestamptz 타입
}

export interface UserFriends {
  from_id: string;
  to_id: string;
  friend_date: string; // timestamptz 타입
  friend_status: string; //friendtype_t 타입
}

export interface Topic {
  topic_id: number;
  topic_head: string;
}

// 범용 API 요청 함수
export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`네트워크 응답 에러: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// // 실제 호출 시 사용법
// interface User {
//   id: number;
//   name: string;
// }

// async function getUserData() {
//   // request 함수 호출 시 <User> 타입을 주입
//   const user = await request<User>('https://example.com');
//   console.log(user.name); 
// }

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
