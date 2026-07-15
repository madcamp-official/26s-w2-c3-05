import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
// 인식기 생성
export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      // lite 모델: 팔 각도용으로 충분하고 가장 가벼움
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}