import type { Bot, Room } from '../types/game';

/** 게임 규칙 */
export const ROUND_SECONDS = 180; // 라운드 시간(초) — 테스트 시 줄여서 사용
export const TOTAL_ROUNDS = 4;
export const BOT_CHATTER = true;

/** 데모용 봇 유저 */
export const BOTS: Bot[] = [
  { name: '임소상', title: '숙원(淑媛)' },
  { name: '화예비', title: '소의(昭儀)' },
  { name: '유란', title: '귀인(貴人)' },
  { name: '소백향', title: '상궁(尙宮)' },
];

/** 데모용 방 목록 */
export const ROOMS: Room[] = [
  { room_id: 0, room_name: '모란정', room_host: '매향', room_count: 3, player_limit: 6, round_limit: 5, time_limit: 300, can_access: true },
  { room_id: 1, room_name: '봉황궁', room_host: '임소상', room_count: 5, player_limit: 6, round_limit: 5, time_limit: 300, can_access: false },
  { room_id: 2, room_name: '옥로전', room_host: '화예비', room_count: 2, player_limit: 5, round_limit: 5, time_limit: 300, can_access: true },
  { room_id: 3, room_name: '청운각', room_host: '한서정', room_count: 6, player_limit: 6, round_limit: 5, time_limit: 300, can_access: false },
  { room_id: 4, room_name: '월하방', room_host: '유란', room_count: 1, player_limit: 5, round_limit: 5, time_limit: 300, can_access: true },
  { room_id: 5, room_name: '금란지', room_host: '소백향', room_count: 4, player_limit: 6, round_limit: 5, time_limit: 300, can_access: true },
];

export const BOT_LINES = [
  '공주마마, 소인의 우스갯소리 하나 들어보시겠사옵니까?',
  '어젯밤 수라간에서 만두를 훔치다 들켰사옵니다…',
  '하하, 이 몸의 재담은 천하제일이옵니다!',
  '마마, 그 이야기는 벌써 세 번째이옵니다.',
  '소인, 오늘은 기필코 어점을 받겠사옵니다.',
  '궁 밖 저잣거리의 소문을 들으셨사옵니까?',
  '아이고 배야, 웃다가 숨넘어가겠사옵니다.',
  '조용히들 하시오, 공주마마 말씀 중이시옵니다.',
];

export const PRINCESS_LINES = [
  '그대들 중 누가 나를 웃게 하겠는가?',
  '흠, 방금 그 이야기는 제법 재미있었느니라.',
  '더 아뢰어 보아라. 듣고 있느니라.',
];

export const ROUND_HANJA = ['第一宴', '第二宴', '第三宴', '第四宴', '第五宴', '第六宴'];
export const RANK_HANJA = ['壹', '貳', '參', '四', '五', '六'];
