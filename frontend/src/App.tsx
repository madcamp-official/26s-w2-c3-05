import { WebcamView } from "./features/face/components/WebcamView";

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Face Tracking Avatar</h1>
      <WebcamView />
    </div>
  );
}