import type { MutableRefObject } from "react";

export type FaceParams = {
  expressions: Record<string, number>;                       // { aa: 0.7, blinkLeft: 0.1, ... }
  headRotation: { x: number; y: number; z: number; w: number }; // 쿼터니언 (5단계에서 사용)
  timestamp: number;
};

export type FaceParamsRef = MutableRefObject<FaceParams>;

export const initialFaceParams: FaceParams = {
  expressions: {},
  headRotation: { x: 0, y: 0, z: 0, w: 1 }, // 단위 쿼터니언 = 회전 없음
  timestamp: 0,
};