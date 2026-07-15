import type { MutableRefObject } from "react";

export type FaceParams = {
  expressions: Record<string, number>;                       // { aa: 0.7, blinkLeft: 0.1, ... }
  headRotation: { x: number; y: number; z: number; w: number }; // 쿼터니언 (5단계에서 사용)
  armRotations?: ArmRotations;   // ← 추가 (없으면 팔 미인식 상태)
  bodyRotation?: BodyRotation;   // ← 추가 (없으면 몸통 미인식 상태)
  timestamp: number;
};

export type ArmRotations = {
  leftUpper: number;  // 왼쪽 위팔 z회전(라디안)
  leftLower: number;  // 왼쪽 아래팔
  rightUpper: number;
  rightLower: number;
};

// ← 추가: 상체(척추·가슴) 회전. 오일러 라디안
export type BodyRotation = {
  x: number; // 앞뒤 숙임(pitch): +면 상체를 앞으로 숙임
  y: number; // 좌우 비틀기(yaw): 몸통을 좌우로 트는 회전
  z: number; // 좌우 기울기(roll): 어깨선이 좌우로 기우는 정도
};

export type FaceParamsRef = MutableRefObject<FaceParams>;

export const initialFaceParams: FaceParams = {
  expressions: {},
  headRotation: { x: 0, y: 0, z: 0, w: 1 }, // 단위 쿼터니언 = 회전 없음
  timestamp: 0,
};