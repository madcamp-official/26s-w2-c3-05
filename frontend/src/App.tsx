import { useRef } from "react";
import { WebcamView } from "./features/face/components/WebcamView";
import { VRMAvatar } from "./features/face/components/VRMAvatar";
import { initialFaceParams, type FaceParams } from "./features/face/types";

export default function App() {

    const faceParamsRef = useRef<FaceParams>(initialFaceParams);

  return (
    <div style={{ display: "flex", gap: 16, padding: 16 }}>
      <div>
        <h2>웹캠</h2>
        <WebcamView faceParamsRef={faceParamsRef}/>
      </div>
      <div>
        <h2>아바타</h2>
        <VRMAvatar faceParamsRef={faceParamsRef}/>
      </div>
    </div>
  );
}