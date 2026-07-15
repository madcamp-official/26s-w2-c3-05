import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

// 한 아바타가 스테이지에 등록하는 정보. AvatarView가 만들어 넘긴다.
export type AvatarEntry = {
  el: HTMLElement;                     // 화면에서 이 아바타가 차지할 자리(추적 div)
  scene: THREE.Scene;                  // 이 아바타 전용 씬(조명+VRM)
  camera: THREE.PerspectiveCamera;     // 이 아바타 전용 카메라
  update: (delta: number) => void;     // 매 프레임 표정·모션 적용
  frameCamera: (aspect: number) => void; // 종횡비 바뀌거나 VRM 로드 시 카메라 재배치
  pendingFrame: boolean;               // frameCamera 재실행 필요 플래그
};

type StageApi = {
  register: (e: AvatarEntry) => void;
  unregister: (e: AvatarEntry) => void;
};
const StageContext = createContext<StageApi | null>(null);
export const useAvatarStage = () => useContext(StageContext);

const _size = new THREE.Vector2();

// 스테이지: 화면 전체를 덮는 <canvas> 1개 + WebGLRenderer 1개로
// 등록된 모든 아바타를 setScissor/setViewport로 각자 자리에만 그린다.
// → 아바타 N개여도 WebGL 컨텍스트/렌더러는 이 1개뿐 (최적화 A).
export function AvatarStage({ children, zIndex = 40 }: { children: ReactNode; zIndex?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entriesRef = useRef<AvatarEntry[]>([]);

  // 등록/해제는 state가 아니라 ref 배열 조작 → 리렌더 유발 안 함
  const api = useMemo<StageApi>(
    () => ({
      register: (e) => { entriesRef.current.push(e); },
      unregister: (e) => {
        const i = entriesRef.current.indexOf(e);
        if (i >= 0) entriesRef.current.splice(i, 1);
      },
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0); // 투명 오버레이
    const clock = new THREE.Clock();
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      const W = window.innerWidth, H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);

      const sz = renderer.getSize(_size);
      if (sz.x !== W || sz.y !== H || renderer.getPixelRatio() !== dpr) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H, false); // false = 캔버스 style은 CSS(100vw/vh)로 관리
      }

      // 프레임 시작: 전체를 투명으로 한 번 클리어(움직인 div의 잔상 제거)
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);

      for (const e of entriesRef.current) {
        const r = e.el.getBoundingClientRect();
        // 화면 밖이거나 크기 0이면 스킵
        if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) continue;

        const aspect = r.width / r.height;
        if (Math.abs(e.camera.aspect - aspect) > 1e-4) { e.camera.aspect = aspect; e.pendingFrame = true; }
        if (e.pendingFrame) { e.frameCamera(aspect); e.pendingFrame = false; }

        e.update(delta);

        // WebGL 좌표는 y가 아래→위. div의 화면 사각형을 그대로 이 아바타 영역으로.
        const bottom = H - r.bottom;
        renderer.setViewport(r.left, bottom, r.width, r.height);
        renderer.setScissor(r.left, bottom, r.width, r.height);
        renderer.render(e.scene, e.camera);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  return (
    <StageContext.Provider value={api}>
      {children}
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex }}
      />
    </StageContext.Provider>
  );
}
