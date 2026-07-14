import { useEffect, useRef } from 'react';
import type { StompSubscription } from '@stomp/stompjs';
import { getStomp } from '../../../lib/stompClient';

// 서버 GameEvent 페이로드 (backend GameEvent.java와 1:1)
export interface GameEventMsg {
  type: 'ROUND_START' | 'LAUGH' | 'ROUND_END' | 'GAME_END' | 'GAME_ABORT';
  round?: number;
  princessId?: string;
  topicId?: number;
  topicHead?: string;
  scores?: Record<string, number>;  // key = userId
  winnerId?: string;
}

// /topic/rooms/{id}/game 구독. 이벤트가 올 때마다 onEvent 호출
export function useGameChannel(roomId: number, onEvent: (e: GameEventMsg) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;   // 최신 핸들러 유지 (재구독 없이)

  useEffect(() => {
    let sub: StompSubscription | undefined;
    let retry: number;

    const trySubscribe = () => {
      const client = getStomp();
      if (client?.connected) {
        sub = client.subscribe(`/topic/rooms/${roomId}/game`, (msg) => {
          handlerRef.current(JSON.parse(msg.body) as GameEventMsg);
        });
      } else {
        retry = window.setTimeout(trySubscribe, 500);  // 연결 전이면 재시도
      }
    };
    trySubscribe();

    return () => {
      sub?.unsubscribe();
      window.clearTimeout(retry);
    };
  }, [roomId]);
}