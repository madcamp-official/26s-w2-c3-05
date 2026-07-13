import { useEffect } from "react";
import { getStomp } from "../../../lib/stompClient";
import type { FaceParamsRef } from "../../face/types";

const SEND_INTERVAL_MS = 50; // 초당 20회 (인식은 30~60fps지만 전송은 줄임)

// 내 faceParamsRef를 주기적으로 방 채널에 쏜다
export function useFaceSender(roomId: number, faceParamsRef: FaceParamsRef) {
  useEffect(() => {
    let lastSent = 0; // 같은 프레임 중복 전송 방지

    const timer = window.setInterval(() => {
      const client = getStomp();
      const params = faceParamsRef.current;
      if (!client?.connected) return;
      if (params.timestamp === lastSent) return; // 새 인식 결과 없으면 스킵
      lastSent = params.timestamp;

      client.publish({
        destination: `/app/rooms/${roomId}/face`,
        body: JSON.stringify(params),
      });
    }, SEND_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [roomId, faceParamsRef]);
}

// 의도: 렌더 프레임마다가 아니라 50ms 타이머로 스로틀해서 트래픽을 초당 20회로 제한.
// timestamp 비교로 얼굴 인식이 멈춰 있을 땐(자리 비움 등) 아예 안 보냅니다.