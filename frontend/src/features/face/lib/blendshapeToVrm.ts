import * as THREE from "three";                    // ← 추가
import type { Category } from "@mediapipe/tasks-vision";
import type { VRM } from "@pixiv/three-vrm";
import type { FaceParams, Vec3 } from "../types";

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

// 팔 뼈 조준용 재사용 임시값 (매 프레임 new 방지)
const _rest = new THREE.Vector3();
const _target = new THREE.Vector3();
const _parentQuat = new THREE.Quaternion();
const _aimQuat = new THREE.Quaternion();

type ArmBone = "leftUpperArm" | "leftLowerArm" | "rightUpperArm" | "rightLowerArm";
type ChildBone = "leftLowerArm" | "leftHand" | "rightLowerArm" | "rightHand";

// 팔 뼈를 목표 3D 방향(dir, 캐릭터 공간)으로 조준한다.
// rest(bind) 방향은 VRM 골격에서 직접 읽어 모델별 축 차이에 영향받지 않는다.
//   - child.position = 자식 뼈의 로컬 오프셋 = 회전과 무관한 "뼈가 뻗은 방향"
//   - 목표를 부모 로컬 공간으로 옮긴 뒤 rest→목표 회전을 뼈의 로컬 쿼터니언으로 적용
function aimBone(vrm: VRM, boneName: ArmBone, childName: ChildBone, dir: Vec3, alpha: number) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;
  const bone = humanoid.getNormalizedBoneNode(boneName);
  const child = humanoid.getNormalizedBoneNode(childName);
  if (!bone || !child || !bone.parent) return; // 손 본 없는 흉상 모델 등은 건너뜀

  _rest.copy(child.position);
  if (_rest.lengthSq() < 1e-8) return;
  _rest.normalize();

  bone.parent.updateWorldMatrix(true, false);            // 상위(척추·가슴) 이번 프레임 값 반영
  bone.parent.getWorldQuaternion(_parentQuat).invert();  // 목표를 부모 로컬로 변환
  _target.set(dir.x, dir.y, dir.z).applyQuaternion(_parentQuat);
  if (_target.lengthSq() < 1e-8) return;
  _target.normalize();

  _aimQuat.setFromUnitVectors(_rest, _target);
  bone.quaternion.slerp(_aimQuat, alpha);                // slerp = 수신단 보간 + 떨림 필터
  bone.updateWorldMatrix(false, false);                  // 아래팔이 갱신된 위팔 기준으로 조준되게
}

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

  // ── 몸통 회전 — 팔보다 먼저 적용해야 팔이 갱신된 상체 기준으로 조준된다 ──
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

  // ── 팔 회전 — 포즈 인식 결과가 있을 때만 각 뼈를 3D 방향으로 조준 ──
  // 없으면(팔이 화면 밖 등) 마지막 자세/기본 팔내림 자세가 유지된다.
  if (params.armDirections) {
    const a = params.armDirections;
    aimBone(vrm, "leftUpperArm", "leftLowerArm", a.leftUpper, 0.4);
    aimBone(vrm, "leftLowerArm", "leftHand", a.leftLower, 0.4);
    aimBone(vrm, "rightUpperArm", "rightLowerArm", a.rightUpper, 0.4);
    aimBone(vrm, "rightLowerArm", "rightHand", a.rightLower, 0.4);
  }
}