import type { MutableRefObject } from "react";

export type FaceParams = {
  expressions: Record<string, number>;                       // { aa: 0.7, blinkLeft: 0.1, ... }
  headRotation: { x: number; y: number; z: number; w: number }; // 쿼터니언 (5단계에서 사용)
  armDirections?: ArmDirections; // 팔 뼈가 향할 3D 방향(없으면 팔 미인식 상태)
  bodyRotation?: BodyRotation;   // 상체(척추·가슴) 회전(없으면 몸통 미인식 상태)
  timestamp: number;
};

export type Vec3 = { x: number; y: number; z: number };

// 각 팔 뼈(위팔/아래팔)가 가리켜야 할 "몸통 기준" 단위 방향 벡터.
// 화면 평면 각도 1개가 아니라 3D 방향이라 앞으로 뻗기·비틀기·깊이까지 반영된다.
// 좌표계: 몸통 기준(x=몸통 오른쪽, y=위, z=정면). 아바타 쪽에서 이 방향으로 뼈를 조준(quaternion)한다.
export type ArmDirections = {
  leftUpper: Vec3;   // 아바타 왼팔 위팔 (어깨→팔꿈치)
  leftLower: Vec3;   // 아바타 왼팔 아래팔 (팔꿈치→손목)
  rightUpper: Vec3;
  rightLower: Vec3;
};

// 상체(척추·가슴) 회전. 오일러 라디안 — 어깨선·척추로 만든 몸통축에서 뽑는다.
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