import * as THREE from "three";                    // ← 추가
import type { Category } from "@mediapipe/tasks-vision";
import type { VRM } from "@pixiv/three-vrm";
import type { FaceParams } from "../types";

// MediaPipe 52개(ARKit식) → VRM 표준 프리셋으로 매핑
export function blendshapeToExpressions(categories: Category[]): Record<string, number> {
  const get = (name: string) =>
    categories.find((c) => c.categoryName === name)?.score ?? 0;

  return {
    aa: get("jawOpen"),                        // 입 벌림
    blinkLeft: get("eyeBlinkRight"),           // ← 좌우 반전 주의 (아래 설명)
    blinkRight: get("eyeBlinkLeft"),
    happy: (get("mouthSmileLeft") + get("mouthSmileRight")) / 2,
  };
}

const _headQuat = new THREE.Quaternion();          // ← 재사용용

export function applyFaceParams(vrm: VRM, params: FaceParams) {
  // 표정
  const em = vrm.expressionManager;
  if (em) {
    for (const [name, value] of Object.entries(params.expressions)) {
      em.setValue(name, value);
    }
  }

  // 머리 회전
  const head = vrm.humanoid?.getNormalizedBoneNode("head");
  if (head) {
    const { x, y, z, w } = params.headRotation;
    _headQuat.set(x, y, z, w);
    head.quaternion.slerp(_headQuat, 0.4); // 0.4로 부드럽게 보간 = 공짜 노이즈 필터
  }

  // 팔 회전 — 포즈 인식 결과가 있을 때만 적용.
  // 없으면(팔이 화면 밖 등) 마지막 자세/기본 팔내림 자세가 유지된다.
  if (params.armRotations) {
    const a = params.armRotations;
    const setArmZ = (
      bone: "leftUpperArm" | "leftLowerArm" | "rightUpperArm" | "rightLowerArm",
      z: number
    ) => {
      const node = vrm.humanoid?.getNormalizedBoneNode(bone);
      if (node) node.rotation.z += (z - node.rotation.z) * 0.3; // lerp = 떨림 필터
    };
    setArmZ("leftUpperArm", a.leftUpper);
    setArmZ("leftLowerArm", a.leftLower);
    setArmZ("rightUpperArm", a.rightUpper);
    setArmZ("rightLowerArm", a.rightLower);
  }

  // ── 몸통 회전 — 포즈(어깨·골반) 인식 결과가 있을 때만 (신규) ──
  // 척추→가슴→(윗가슴)→골반 순으로 나눠 적용해 상체가 한 번에 꺾이지 않고 자연스럽게 휜다.
  if (params.bodyRotation) {
    const b = params.bodyRotation;
    const setBody = (
      bone: "spine" | "chest" | "upperChest" | "hips",
      w: number
    ) => {
      const node = vrm.humanoid?.getNormalizedBoneNode(bone);
      if (!node) return; // upperChest 등 모델에 없는 본은 무시
      node.rotation.x += (b.x * w - node.rotation.x) * 0.25; // lerp = 떨림 필터
      node.rotation.y += (b.y * w - node.rotation.y) * 0.25;
      node.rotation.z += (b.z * w - node.rotation.z) * 0.25;
    };
    setBody("spine", 0.45);
    setBody("chest", 0.30);
    setBody("upperChest", 0.20);
    setBody("hips", 0.10); // 골반은 살짝만 — 전신 모델이 통째로 기우는 것 방지
  }

}