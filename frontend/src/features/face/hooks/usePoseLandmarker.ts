import { useEffect, useRef } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { createPoseLandmarker } from "../lib/poseLandMarker";
import type { ArmRotations, BodyRotation, FaceParamsRef } from "../types";

// MediaPipe Pose 랜드마크 번호
// 11 왼어깨 / 13 왼팔꿈치 / 15 왼손목  ·  12 오른어깨 / 14 오른팔꿈치 / 16 오른손목
// 23 왼골반 / 24 오른골반  (몸통 방향 계산용)
const L_SHOULDER = 11, L_ELBOW = 13, L_WRIST = 15;
const R_SHOULDER = 12, R_ELBOW = 14, R_WRIST = 16;
const L_HIP = 23, R_HIP = 24;

const MIN_VISIBILITY = 0.5;

// 몸통 회전 감도/한계(라디안). 방향이 반대로 보이면 해당 *_SIGN 만 1 ↔ -1 로 뒤집으면 된다.
const PITCH_GAIN = 1.1, MAX_PITCH = 0.5, PITCH_SIGN = 1;  // 앞뒤 숙임(x)
const YAW_GAIN  = 1.2, MAX_YAW  = 0.6, YAW_SIGN  = 1;     // 좌우 비틀기(y)
const ROLL_GAIN = 1.0, MAX_ROLL = 0.5, ROLL_SIGN = 1;     // 좌우 기울기(z)

const clampAbs = (v: number, m: number) => Math.max(-m, Math.min(m, v));

// 웹캠으로 팔(어깨→팔꿈치→손목)과 몸통(어깨·골반)을 인식해
// faceParamsRef.armRotations / bodyRotation 에 병합한다.
// 같은 ref를 공유하므로 기존 얼굴 중계(useFaceSender/useRemoteFaces)에
// 팔·몸통 데이터가 자동으로 실려 나간다.
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
          const world = result.worldLandmarks?.[0]; // 미터 단위 3D (몸통 방향 계산에 사용)

          let arms: ArmRotations | undefined;
          let body: BodyRotation | undefined;

          if (lm) {
            const vis = (i: number) => (lm[i]?.visibility ?? 0) >= MIN_VISIBILITY;

            // ── 팔 회전 (기존 로직 그대로) ──
            if ([L_SHOULDER, L_ELBOW, L_WRIST, R_SHOULDER, R_ELBOW, R_WRIST].every(vis)) {
              const angle = (a: number, b: number) =>
                Math.atan2(lm[b].y - lm[a].y, lm[b].x - lm[a].x);

              // 웹캠은 "카메라가 나를 보는" 좌표 → 화면 왼쪽 팔(R계열) = 아바타 leftArm
              const screenLeftUpper = angle(R_SHOULDER, R_ELBOW);
              const screenLeftLower = angle(R_ELBOW, R_WRIST) - screenLeftUpper;
              const screenRightUpper = Math.PI - angle(L_SHOULDER, L_ELBOW);
              const screenRightLower = (Math.PI - angle(L_ELBOW, L_WRIST)) - screenRightUpper;

              arms = {
                leftUpper: screenLeftUpper,
                leftLower: screenLeftLower,
                rightUpper: -screenRightUpper,
                rightLower: -screenRightLower,
              };
            }

            // ── 몸통 회전 (신규) ──
            // 어깨선(왼→오른 어깨)과 척추(골반중앙→어깨중앙) 벡터를 만들어
            // 정지 자세(정면·직립)를 0으로 하는 편차를 pitch/yaw/roll 로 뽑는다.
            if (world && [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP].every(vis)) {
              const p = (i: number) => world[i];
              const mid = (a: number, b: number) => ({
                x: (p(a).x + p(b).x) / 2,
                y: (p(a).y + p(b).y) / 2,
                z: (p(a).z + p(b).z) / 2,
              });

              const across = {                                   // 어깨선
                x: p(R_SHOULDER).x - p(L_SHOULDER).x,
                y: p(R_SHOULDER).y - p(L_SHOULDER).y,
                z: p(R_SHOULDER).z - p(L_SHOULDER).z,
              };
              const sMid = mid(L_SHOULDER, R_SHOULDER);
              const hMid = mid(L_HIP, R_HIP);
              const up = { x: sMid.x - hMid.x, y: sMid.y - hMid.y, z: sMid.z - hMid.z }; // 척추

              // |가로/세로| 를 기준축으로 써서 정지 자세가 0 이 되게 한다
              const roll  = Math.atan2(across.y, Math.abs(across.x)); // 어깨선이 좌우로 기운 정도
              const yaw   = Math.atan2(across.z, Math.abs(across.x)); // 어깨선이 수평면에서 돈 정도
              const pitch = Math.atan2(up.z,     Math.abs(up.y));     // 척추가 앞뒤로 눕는 정도

              body = {
                x: clampAbs(pitch * PITCH_GAIN, MAX_PITCH) * PITCH_SIGN,
                y: clampAbs(yaw   * YAW_GAIN,   MAX_YAW)   * YAW_SIGN,
                z: clampAbs(roll  * ROLL_GAIN,  MAX_ROLL)  * ROLL_SIGN,
              };
            }
          }

          // 팔/몸통 중 잡힌 것만 병합해서 같은 상자에 기록 (표정·머리회전은 보존)
          if (arms || body) {
            faceParamsRef.current = {
              ...faceParamsRef.current,
              ...(arms ? { armRotations: arms } : {}),
              ...(body ? { bodyRotation: body } : {}),
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