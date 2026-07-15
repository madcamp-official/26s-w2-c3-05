import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { applyFaceParams } from "../lib/blendshapeToVrm";   // ← 추가
import type { FaceParamsRef } from "../types";              // ← 추가

/** 외부에서 일회성 모션을 트리거하는 상자 (faceParamsRef와 같은 ref 통신 패턴)
 *  사용법: motionRef.current.action = 'bow' → 렌더 루프가 읽고 모션 실행 후 null로 되돌림 */
export type AvatarMotion = { action: "bow" | null };
export type AvatarMotionRef = MutableRefObject<AvatarMotion>;

// easeInOutQuad — 모션이 기계적으로 보이지 않게
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

const HEAD_PITCH_SIGNS: Record<string, 1 | -1> = {
  "/avatar.vrm": -1,
  "/servant.vrm": 1,
  "/servant_decimated.vrm": 1,
};

export function VRMAvatar({
  faceParamsRef,
  motionRef,
  modelSrc = "/avatar.vrm",
  frame = "face",
  poseArmsDown = true,
  style,
}: {
  faceParamsRef?: FaceParamsRef; // 없으면 트래킹 없는 idle 아바타 (신하 등)
  motionRef?: AvatarMotionRef;   // 엎드리기 등 일회성 모션 트리거 (선택)
  modelSrc?: string;             // 사용할 VRM 파일 경로 (기본: 공주 아바타)
  frame?: "face" | "full";       // face: 기존 얼굴 프레이밍 / full: 전신 자동 프레이밍
  poseArmsDown?: boolean;        // T-pose 팔 내리기 보정 (스캔/흉상은 false로 끄기, 기본 true)
  style?: CSSProperties;         // 크기·배치를 호출부에서 지정 (기본 480×480)
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1) 렌더러: 실제로 픽셀을 그리는 엔진. alpha:true로 배경 투명
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 2) 씬(무대) + 카메라(시점)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20);
    camera.position.set(0, 1.3, 1.5); // 얼굴 높이(약 1.3m)에서 정면으로
    camera.lookAt(0, 1.3, 0);

    // 3) 조명: 없으면 캐릭터가 새까맣게 나옴
    //    (three r155+는 물리기반이라 Math.PI가 예전 intensity 1에 해당)
    const dirLight = new THREE.DirectionalLight(0xffffff, Math.PI);
    dirLight.position.set(1, 1, 1);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5)); // 전체적으로 살짝 띄우기

    // 4) VRM 로드: GLTFLoader에 VRM 플러그인을 끼워서 .vrm을 해석
    let vrm: VRM | null = null;
    let disposed = false;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader
      .loadAsync(modelSrc)
      .then((gltf) => {
        if (disposed) return;              // 로드 중 언마운트되면 버림
        vrm = gltf.userData.vrm as VRM;    // 파싱된 VRM은 여기에 담김
        VRMUtils.rotateVRM0(vrm);          // VRM0.x 모델이 뒤돌아 있는 것 보정
        vrm.scene.userData.headPitchSign = HEAD_PITCH_SIGNS[modelSrc] ?? 1;
        scene.add(vrm.scene);

        // T포즈 모델(avatar.vrm 등)은 팔을 아래로 내려 정지 자세로 만든다.
        // 이미 팔이 포즈된 스캔/흉상 모델은 poseArmsDown=false로 이 보정을 끈다.
        if (poseArmsDown) {
            const rad = THREE.MathUtils.degToRad(70); // 내리는 각도 (65~75 사이 취향껏)
            const leftArm = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
            const rightArm = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
            if (leftArm) leftArm.rotation.z = rad;
            if (rightArm) rightArm.rotation.z = -rad;
        }

        // frame="full": 모델 크기(gnome처럼 키가 다른 모델 포함)에 맞춰 전신이 잡히게 카메라 자동 배치
        if (frame === "full") {
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const fovRad = THREE.MathUtils.degToRad(camera.fov);
          // 세로/가로 중 더 많이 필요한 거리로 맞추고 15% 여유
          const distH = size.y / 2 / Math.tan(fovRad / 2);
          const distW = size.x / 2 / (Math.tan(fovRad / 2) * camera.aspect);
          const dist = Math.max(distH, distW) * 1.15 + size.z / 2;
          camera.position.set(0, center.y, dist);
          camera.lookAt(0, center.y, 0);
        }
      })
      .catch((e) => console.error("VRM 로드 실패:", e));

    // 5) 렌더 루프: 매 프레임 화면을 다시 그림
    const clock = new THREE.Clock();
    let rafId = 0;

    // 엎드리기 모션: 숙임(0.5s) → 유지(0.7s) → 일어남(0.6s)
    const BOW_DOWN = 0.5, BOW_HOLD = 0.7, BOW_UP = 0.6;
    const BOW_TOTAL = BOW_DOWN + BOW_HOLD + BOW_UP;
    let bowT = -1; // -1 = 대기, 0~BOW_TOTAL = 진행 중(경과 초)

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const delta = clock.getDelta();      // 지난 프레임과의 시간차(초)
      if (vrm) {
          if (faceParamsRef) {
            applyFaceParams(vrm, faceParamsRef.current); // <- 표정 적용 (반드시 update 전에)
          }

          // 모션 트리거 감지 (진행 중이 아닐 때만 새로 시작)
          if (motionRef?.current.action === "bow" && bowT < 0) {
            motionRef.current.action = null;
            bowT = 0;
          }
          if (bowT >= 0) {
            bowT += delta;
            let k: number; // 0 = 서있음, 1 = 완전히 엎드림
            if (bowT < BOW_DOWN) k = ease(bowT / BOW_DOWN);
            else if (bowT < BOW_DOWN + BOW_HOLD) k = 1;
            else if (bowT < BOW_TOTAL) k = 1 - ease((bowT - BOW_DOWN - BOW_HOLD) / BOW_UP);
            else { k = 0; bowT = -1; } // 종료 → 대기 상태 복귀
            // 상체를 앞으로 깊게 숙이고(절), 몸 전체를 살짝 낮춘다
            const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
            const spine = vrm.humanoid?.getNormalizedBoneNode("spine");
            const chest = vrm.humanoid?.getNormalizedBoneNode("chest");
            if (hips) hips.rotation.x = k * 0.55;
            if (spine) spine.rotation.x = k * 0.75;
            if (chest) chest.rotation.x = k * 0.45;
            vrm.scene.position.y = -k * 0.18; // 무릎 꿇듯 낮아지는 느낌
          }

          vrm?.update(delta);                  // 스프링본(머리카락·옷 흔들림) 갱신
          }
      renderer.render(scene, camera);
    };
    animate();

    // 6) 창 크기 변경 대응
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // 7) 정리: 메모리 누수 방지 (StrictMode 이중 마운트/HMR 대비)
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [faceParamsRef, motionRef, modelSrc, frame, poseArmsDown]);

  return <div ref={containerRef} style={{ width: 480, height: 480, ...style }} />;
}
