import { useEffect, useRef } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createFaceLandmarker } from "../lib/faceLandmarker";

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>
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
          const bs = result.faceBlendshapes?.[0]?.categories;
          if (bs) {
            const get = (name: string) =>
              bs.find((c) => c.categoryName === name)?.score ?? 0;
            console.log(
              "jawOpen", get("jawOpen").toFixed(2),
              "| blinkL", get("eyeBlinkLeft").toFixed(2),
              "| blinkR", get("eyeBlinkRight").toFixed(2)
            );
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
  }, [videoRef]);

  return landmarkerRef;
}