import { useEffect, useRef } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createFaceLandmarker } from "../lib/faceLandmarker";
import { blendshapeToExpressions } from "../lib/blendshapeToVrm";
import { matrixToHeadRotation } from "../lib/headRotation";   // ← 추가
// detectForVideo 결과에서 행렬도 함께 꺼내 faceParamsRef에 넣습니다
import type { FaceParamsRef } from "../types";

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  faceParamsRef: FaceParamsRef            // -> box에 write
) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  useEffect(() => {
    let rafId = 0;
    let cancelled = false;
    let lastVideoTime = -1;

    (async () => {
      const landmarker = await createFaceLandmarker();
      if (cancelled) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      const loop = () => {
        const video = videoRef.current;
        // 영상이 준비됐고, 새 프레임일 때만 감지 (같은 프레임 재처리 방지)
        if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const result = landmarker.detectForVideo(video, performance.now());
          const cats = result.faceBlendshapes?.[0]?.categories;
          const matrix = result.facialTransformationMatrixes?.[0]?.data; // ← 추가
          if (cats) {
            // 콘솔 로그 대신 이제 상자에 기록
            faceParamsRef.current = {
              expressions: blendshapeToExpressions(cats),
              // 행렬이 있으면 회전 갱신, 없으면 직전 값 유지
              headRotation: matrix ? matrixToHeadRotation(matrix) :
              faceParamsRef.current.headRotation, // 5단계에서 채움
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