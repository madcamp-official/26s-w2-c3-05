import { useEffect } from "react";
import { getStomp } from "../../../lib/stompClient";
import type { FaceParamsRef } from "../../face/types";

// 내가 이번 라운드 공주일 때, 웃음(happy)이 감지될 때마다 서버에 알린다.
// 라운드가 3분간 이어지므로 여러 번 보낼 수 있게 하되,
// - HIGH 넘으면 1회 전송 후 무장 해제, happy가 LOW 밑으로 내려가면 재무장 (한 번 웃음 = 1회)
// - COOLDOWN으로 연속 스팸 방지 (실제 점수 상한은 서버가 라운드당 3점으로 관리)
export function useLaughSender(roomId: number, isPrincess: boolean, faceParamsRef: FaceParamsRef) {
  useEffect(() => {
    if (!isPrincess) return;

    const HIGH = 0.5;         // 웃음으로 인정하는 임계치
    const LOW = 0.3;          // 이 아래로 내려가야 다음 웃음 인정
    const COOLDOWN_MS = 2000; // 최소 전송 간격

    let armed = true;         // 다시 웃음 보낼 준비됨
    let lastSent = 0;

    const timer = window.setInterval(() => {
      const happy = faceParamsRef.current.expressions.happy ?? 0;
      const client = getStomp();
      const now = Date.now();

      if (armed && happy > HIGH && client?.connected && now - lastSent > COOLDOWN_MS) {
        client.publish({ destination: `/app/rooms/${roomId}/laugh` });
        lastSent = now;
        armed = false;        // 한 번 웃음 → 표정 풀릴 때까지 대기
      }
      if (happy < LOW) armed = true; // 표정이 풀리면 다음 웃음 인정
    }, 100);

    return () => clearInterval(timer);
  }, [roomId, isPrincess, faceParamsRef]);
}
