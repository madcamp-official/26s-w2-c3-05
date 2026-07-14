export type Screen = 'login' | 'lobby' | 'waiting' | 'game' | 'result';
export type RankType = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type RoleType = 'PRINCESS' | 'SERVANT' | 'NONE';
export type WinType = 'WIN' | 'OTHER' | 'LOSE' | 'NONE';
export type FriendType = 'NONE' | 'REQUESTED' | 'FRIENDS';
export type NotificationType = 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'SYSTEM';

export interface Room {
  room_id: number;
  creator_id?: string; // 방장 userId (호스트 판별용; 목데이터 호환 위해 optional)
  room_name: string; // name
  room_host: string; // host
  room_count: number; // count
  player_limit: number; // cap 
  round_limit: number;
  time_limit: number;
  room_pw?: string;
  can_access: boolean; //open
}

export interface Bot {
  name: string;
  title: string;
}

export type ChatKind = 'system' | 'self' | 'other';

export interface ChatMsg {
  kind: ChatKind;
  text: string;
  who?: string;
  crown?: boolean;
}

export type Scores = Record<string, number>;

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