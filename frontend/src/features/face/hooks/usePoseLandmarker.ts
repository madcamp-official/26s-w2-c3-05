import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { createPoseLandmarker } from "../lib/poseLandMarker";
import type { ArmDirections, BodyRotation, FaceParamsRef, Vec3 } from "../types";

// MediaPipe Pose 랜드마크 번호
// 11 왼어깨 / 13 왼팔꿈치 / 15 왼손목  ·  12 오른어깨 / 14 오른팔꿈치 / 16 오른손목
// 23 왼골반 / 24 오른골반  (몸통 좌표계 계산용)
const L_SHOULDER = 11, L_ELBOW = 13, L_WRIST = 15;
const R_SHOULDER = 12, R_ELBOW = 14, R_WRIST = 16;
const L_HIP = 23, R_HIP = 24;

// 랜드마크 신뢰도(visibility)가 이보다 낮으면 화면 밖 → 그 프레임은 스킵
const MIN_VISIBILITY = 0.5;

// 몸통 기준 방향 → 아바타(캐릭터) 공간 축 부호.
// 팔이 거울처럼 안 움직이면 SIGN_X, 앞뒤(뻗기)가 반대면 SIGN_Z 를 1 ↔ -1 로 뒤집는다.
const SIGN_X = -1; // 좌우(거울)
const SIGN_Z = -1; // 앞뒤(깊이)

// 방향 벡터 EMA 계수(1=필터 없음, 낮을수록 부드럽지만 지연↑). 소스단 떨림 제거용.
const DIR_SMOOTH = 0.5;

// 몸통 회전 감도/한계(라디안). 방향이 반대로 보이면 해당 *_SIGN 만 1 ↔ -1 로 뒤집으면 된다.
const PITCH_GAIN = 1.2, MAX_PITCH = 0.5, PITCH_SIGN = 1;  // 앞뒤 숙임(x)
const YAW_GAIN  = 1.3, MAX_YAW  = 0.6, YAW_SIGN  = 1;     // 좌우 비틀기(y)
const ROLL_GAIN = 1.1, MAX_ROLL = 0.5, ROLL_SIGN = 1;     // 좌우 기울기(z)

const clampAbs = (v: number, m: number) => Math.max(-m, Math.min(m, v));

const lerpVec = (s: Vec3, t: Vec3, a: number): Vec3 => ({
  x: s.x + (t.x - s.x) * a,
  y: s.y + (t.y - s.y) * a,
  z: s.z + (t.z - s.z) * a,
});

// 웹캠으로 팔(어깨→팔꿈치→손목)과 몸통(어깨·골반)을 3D로 인식해
// faceParamsRef.armDirections / bodyRotation 에 병합한다.
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
    let smoothed: ArmDirections | null = null; // 방향 벡터 EMA 상태(프레임 간 유지)

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
          const world = result.worldLandmarks?.[0]; // 미터 단위 3D

          let arms: ArmDirections | undefined;
          let body: BodyRotation | undefined;

          if (lm && world) {
            const vis = (i: number) => (lm[i]?.visibility ?? 0) >= MIN_VISIBILITY;

            // 몸통(어깨·골반)이 잡혀야 좌표계를 만들 수 있다 (팔 방향도 이 축에 투영)
            if ([L_SHOULDER, R_SHOULDER, L_HIP, R_HIP].every(vis)) {
              // MediaPipe world(x오른쪽·y아래·z뒤) → three(x오른쪽·y위·z앞): y,z 부호 반전
              const W = (i: number) =>
                new THREE.Vector3(world[i].x, -world[i].y, -world[i].z);

              const Ls = W(L_SHOULDER), Rs = W(R_SHOULDER);
              const Lh = W(L_HIP), Rh = W(R_HIP);
              const sMid = Ls.clone().add(Rs).multiplyScalar(0.5);
              const hMid = Lh.clone().add(Rh).multiplyScalar(0.5);

              // 몸통 직교좌표계: x=어깨선, y=척추(위), z=정면
              const bX = Rs.clone().sub(Ls).normalize();
              let bY = sMid.clone().sub(hMid).normalize();
              const bZ = bX.clone().cross(bY).normalize();
              bY = bZ.clone().cross(bX).normalize(); // 재직교화

              // ── 몸통 회전: 좌표축이 정지 자세(정면·직립)에서 벗어난 정도 ──
              const roll  = Math.atan2(bY.x, bY.y);  // 어깨선이 좌우로 기움
              const pitch = Math.atan2(bY.z, bY.y);  // 척추가 앞뒤로 눕음
              const yaw   = Math.atan2(bZ.x, -bZ.z); // 몸통이 수평면에서 돎
              body = {
                x: clampAbs(pitch * PITCH_GAIN, MAX_PITCH) * PITCH_SIGN,
                y: clampAbs(yaw   * YAW_GAIN,   MAX_YAW)   * YAW_SIGN,
                z: clampAbs(roll  * ROLL_GAIN,  MAX_ROLL)  * ROLL_SIGN,
              };

              // ── 팔 방향: 분절 벡터를 몸통축에 투영 → 몸통 기준 3D 단위방향 ──
              if ([L_ELBOW, L_WRIST, R_ELBOW, R_WRIST].every(vis)) {
                const segDir = (a: number, b: number): Vec3 => {
                  const d = W(b).sub(W(a));
                  const v = new THREE.Vector3(
                    SIGN_X * d.dot(bX), // 몸통 오른쪽
                    d.dot(bY),          // 위
                    SIGN_Z * d.dot(bZ)  // 정면
                  ).normalize();
                  return { x: v.x, y: v.y, z: v.z };
                };

                // 웹캠은 "카메라가 나를 보는" 좌표 → 거울처럼: 사람 오른쪽 = 아바타 왼팔
                const raw: ArmDirections = {
                  leftUpper: segDir(R_SHOULDER, R_ELBOW),
                  leftLower: segDir(R_ELBOW, R_WRIST),
                  rightUpper: segDir(L_SHOULDER, L_ELBOW),
                  rightLower: segDir(L_ELBOW, L_WRIST),
                };

                smoothed = smoothed
                  ? {
                      leftUpper: lerpVec(smoothed.leftUpper, raw.leftUpper, DIR_SMOOTH),
                      leftLower: lerpVec(smoothed.leftLower, raw.leftLower, DIR_SMOOTH),
                      rightUpper: lerpVec(smoothed.rightUpper, raw.rightUpper, DIR_SMOOTH),
                      rightLower: lerpVec(smoothed.rightLower, raw.rightLower, DIR_SMOOTH),
                    }
                  : raw;
                arms = smoothed;
              }
            }
          }

          // 팔/몸통 중 잡힌 것만 병합해서 같은 상자에 기록 (표정·머리회전은 보존)
          if (arms || body) {
            faceParamsRef.current = {
              ...faceParamsRef.current,
              ...(arms ? { armDirections: arms } : {}),
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
