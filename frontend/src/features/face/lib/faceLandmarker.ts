import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export async function createFaceLandmarker(): Promise<FaceLandmarker> {
  // WASM 런타임 로드 (설치된 버전과 동일하게 0.10.35 고정)
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );

  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      // 구글 공식 호스팅 모델 (스펙의 로컬 경로는 실제로 존재하지 않아 이걸로 대체)
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    outputFaceBlendshapes: true,            // 52개 표정 계수
    outputFacialTransformationMatrixes: true, // 머리 회전 행렬 (5단계에서 사용)
    numFaces: 1,
  });
}