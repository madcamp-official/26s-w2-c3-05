import { useEffect, useRef, useCallback } from "react";
import type { StompSubscription } from "@stomp/stompjs";
import { getStomp } from "../../../lib/stompClient";
import { initialFaceParams, type FaceParams, type FaceParamsRef } from "../../face/types";

// 방 전원의 표정 스트림을 "구독 1개"로 받아서 유저별 FaceParamsRef 맵으로 나눠준다.
// (useRemoteFace의 다인원 버전 — 신하 N명이어도 소켓 구독은 하나)
// 사용법:
//   const faceRefFor = useRemoteFaces(roomId);
//   <VRMAvatar faceParamsRef={faceRefFor(userId)} />
export function useRemoteFaces(roomId: number): (userId: string) => FaceParamsRef {
  // userId → ref 상자. ref 정체성이 유지돼야 VRMAvatar effect가 재실행되지 않는다.
  const refsRef = useRef<Record<string, FaceParamsRef>>({});

  const faceRefFor = useCallback((userId: string): FaceParamsRef => {
    if (!refsRef.current[userId]) {
      refsRef.current[userId] = { current: initialFaceParams };
    }
    return refsRef.current[userId];
  }, []);

  useEffect(() => {
    let sub: StompSubscription | undefined;
    let retry: number;

    // 소켓이 아직 연결 전이면 연결될 때까지 재시도 후 구독
    const trySubscribe = () => {
      const client = getStomp();
      if (client?.connected) {
        sub = client.subscribe(`/topic/rooms/${roomId}/face`, (msg) => {
          const data = JSON.parse(msg.body) as { userId: string; face: FaceParams };
          faceRefFor(data.userId).current = data.face; // 해당 유저 상자에 넣으면 아바타가 따라옴
        });
      } else {
        retry = window.setTimeout(trySubscribe, 300);
      }
    };
    trySubscribe();

    return () => {
      clearTimeout(retry);
      sub?.unsubscribe();
    };
  }, [roomId, faceRefFor]);

  return faceRefFor;
}
