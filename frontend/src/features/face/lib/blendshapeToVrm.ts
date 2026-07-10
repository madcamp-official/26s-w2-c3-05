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

// FaceParams를 실제 아바타에 적용 (지금은 표정만; 머리회전은 5단계에서 추가)
export function applyFaceParams(vrm: VRM, params: FaceParams) {
  const em = vrm.expressionManager;
  if (!em) return; // 표정 없는 모델 방어
  for (const [name, value] of Object.entries(params.expressions)) {
    em.setValue(name, value);
  }
}