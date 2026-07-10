import { useWebcam } from "../hooks/useWebcam";
import { useFaceLandmarker } from "../hooks/useFaceLandmarker";
import type { FaceParamsRef } from "../types";

export function WebcamView({ faceParamsRef }: { faceParamsRef: FaceParamsRef }) {
    // faceParamsRef를 받아서 비디오와 동기화
  const { videoRef, error } = useWebcam();
  useFaceLandmarker(videoRef, faceParamsRef); // ← 상자 넘김

  if (error) return <p style={{ color: "red" }}>카메라 오류: {error}</p>;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ width: 480, transform: "scaleX(-1)" }} // 셀피 거울 모드
    />
  );
}
