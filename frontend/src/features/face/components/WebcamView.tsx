import { useWebcam } from "../hooks/useWebcam";

export function WebcamView() {
  const { videoRef, error } = useWebcam();

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
