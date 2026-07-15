import type { MutableRefObject } from "react";

export type FaceParams = {
  expressions: Record<string, number>;                       // { aa: 0.7, blinkLeft: 0.1, ... }
  headRotation: { x: number; y: number; z: number; w: number }; // 쿼터니언 (5단계에서 사용)
  armRotations?: ArmRotations;   // ← 추가 (없으면 팔 미인식 상태)
  timestamp: number;
};

export type ArmRotations = {
  leftUpper: number;  // 왼쪽 위팔 z회전(라디안)
  leftLower: number;  // 왼쪽 아래팔
  rightUpper: number;
  rightLower: number;
};

export type FaceParamsRef = MutableRefObject<FaceParams>;

export const initialFaceParams: FaceParams = {
  expressions: {},
  headRotation: { x: 0, y: 0, z: 0, w: 1 }, // 단위 쿼터니언 = 회전 없음
  timestamp: 0,
};