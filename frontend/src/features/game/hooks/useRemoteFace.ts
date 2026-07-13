import { useEffect, useRef } from "react";
import type { StompSubscription } from "@stomp/stompjs";
import { getStomp } from "../../../lib/stompClient";
import { initialFaceParams, type FaceParams, type FaceParamsRef } from "../../face/types";

// 특정 유저의 표정 스트림을 구독해서 FaceParamsRef로 돌려준다
// → 반환된 ref를 <VRMAvatar faceParamsRef={...}> 에 그대로 꽂으면 끝
export function useRemoteFace(roomId: number, targetUserId: string): FaceParamsRef {
  const remoteRef = useRef<FaceParams>(initialFaceParams);

  useEffect(() => {
    let sub: StompSubscription | undefined;
    let retry: number;

    // 소켓이 아직 연결 전이면 연결될 때까지 재시도 후 구독
    const trySubscribe = () => {
      const client = getStomp();
      if (client?.connected) {
        sub = client.subscribe(`/topic/rooms/${roomId}/face`, (msg) => {
          const data = JSON.parse(msg.body) as { userId: string; face: FaceParams };
          if (data.userId === targetUserId) {
            remoteRef.current = data.face; // 상자에 넣기만 하면 아바타가 따라옴
          }
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
  }, [roomId, targetUserId]);

  return remoteRef;
}

// 의도: 기존 VRMAvatar가 받는 것과 똑같은 FaceParamsRef를 반환하는 게 포인트.
// 원격 아바타 렌더링이 이 한 줄이 됩니다: