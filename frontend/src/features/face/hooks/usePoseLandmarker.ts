import { useEffect, useRef } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { createPoseLandmarker } from "../lib/poseLandMarker";
import type { FaceParamsRef } from "../types";

// MediaPipe Pose 랜드마크 번호
// 11 왼어깨 / 13 왼팔꿈치 / 15 왼손목  ·  12 오른어깨 / 14 오른팔꿈치 / 16 오른손목
// (화면 기준 좌표계: x 오른쪽+, y 아래+, 값은 0~1 정규화)
const L_SHOULDER = 11, L_ELBOW = 13, L_WRIST = 15;
const R_SHOULDER = 12, R_ELBOW = 14, R_WRIST = 16;

// 랜드마크 신뢰도(visibility)가 이보다 낮으면 팔이 화면 밖 → 그 프레임은 스킵
const MIN_VISIBILITY = 0.5;

// 웹캠으로 팔(어깨→팔꿈치→손목)을 인식해 faceParamsRef.armRotations에 병합한다.
// useFaceLandmarker와 같은 rAF 패턴 — 같은 ref를 공유하므로
// 기존 얼굴 중계(useFaceSender/useRemoteFaces)에 팔 데이터가 자동으로 실려 나간다.
export function usePoseLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  faceParamsRef: FaceParamsRef
) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    let rafId = 0;
    let cancelled = false;
    let lastVideoTime = -1;

    (async () => {
      const landmarker = await createPoseLandmarker();
      if (cancelled) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      const loop = () => {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const result = landmarker.detectForVideo(video, performance.now());
          const lm = result.landmarks?.[0];

          // 어깨~손목 6개 랜드마크가 모두 화면에 잡혔을 때만 갱신
          const ok =
            lm &&
            [L_SHOULDER, L_ELBOW, L_WRIST, R_SHOULDER, R_ELBOW, R_WRIST].every(
              (i) => (lm[i]?.visibility ?? 0) >= MIN_VISIBILITY
            );

          if (ok) {
            // 두 점을 잇는 벡터의 화면 기준 각도
            const angle = (a: number, b: number) =>
              Math.atan2(lm[b].y - lm[a].y, lm[b].x - lm[a].x);

            // 팔을 아래로 내리면 벡터가 아래(+y)를 향해 atan2 = +90°(π/2),
            // T포즈(수평)면 0°가 되도록 어깨 기준 각도를 그대로 쓴다.
            // VRM 본 규약: leftUpperArm.rotation.z = +면 팔이 내려감, right는 부호 반대.
            //
            // 웹캠은 거울이 아니라 "카메라가 나를 보는" 좌표라서
            // 화면 왼쪽에 보이는 팔(랜드마크 R계열) = 아바타의 leftArm 이 자연스럽다.
            const screenLeftUpper = angle(R_SHOULDER, R_ELBOW);              // 화면 왼쪽 위팔
            const screenLeftLower = angle(R_ELBOW, R_WRIST) - screenLeftUpper;
            const screenRightUpper = Math.PI - angle(L_SHOULDER, L_ELBOW);   // 화면 오른쪽 위팔 (방향 반전)
            const screenRightLower = (Math.PI - angle(L_ELBOW, L_WRIST)) - screenRightUpper;

            faceParamsRef.current = {
              ...faceParamsRef.current,
              armRotations: {
                leftUpper: screenLeftUpper,
                leftLower: screenLeftLower,
                rightUpper: -screenRightUpper,
                rightLower: -screenRightLower,
              },
              timestamp: performance.now(),
            };
          }
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [videoRef, faceParamsRef]);

  return landmarkerRef;
}
