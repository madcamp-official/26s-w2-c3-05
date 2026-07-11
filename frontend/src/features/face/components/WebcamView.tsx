import type { CSSProperties } from "react";
import { useWebcam } from "../hooks/useWebcam";
import { useFaceLandmarker } from "../hooks/useFaceLandmarker";
import type { FaceParamsRef } from "../types";

export function WebcamView({
  faceParamsRef,
  style,
}: {
  faceParamsRef: FaceParamsRef;
  style?: CSSProperties; // 크기·배치를 호출부에서 지정 (기본 width 480, 셀피 미러)
}) {
  // faceParamsRef를 받아서 비디오와 동기화
  const { videoRef, error } = useWebcam();
  useFaceLandmarker(videoRef, faceParamsRef); // ← 상자 넘김

  if (error)
    return (
      <p style={{ color: "#e8858c", fontSize: 10, margin: 0, padding: 4, textAlign: "center" }}>
        카메라 오류
      </p>
    );

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ width: 480, transform: "scaleX(-1)", display: "block", ...style }} // 셀피 거울 모드
    />
  );
}
