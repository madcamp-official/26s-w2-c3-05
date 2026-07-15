import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { VRMUtils } from "@pixiv/three-vrm";
import { loadVrm, applyArmsDown } from "../lib/vrmLoader";
import { applyFaceParams } from "../lib/blendshapeToVrm";
import { useAvatarStage, type AvatarEntry } from "./AvatarStage";
import type { FaceParamsRef } from "../types";
import type { AvatarMotionRef } from "./VRMAvatar";

// easeInOutQuad — 모션이 기계적으로 보이지 않게
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// 엎드리기 모션: 숙임(0.5s) → 유지(0.7s) → 일어남(0.6s)
const BOW_DOWN = 0.5, BOW_HOLD = 0.7, BOW_UP = 0.6;
const BOW_TOTAL = BOW_DOWN + BOW_HOLD + BOW_UP;

// Each VRM was authored with a different local head-axis direction.
const HEAD_PITCH_SIGNS: Record<string, 1 | -1> = {
  "/avatar.vrm": -1,
  "/servant.vrm": -1,
  "/servant_decimated.vrm": -1,
};

// 기존 <VRMAvatar>의 드롭인 대체. 자리표시 div만 렌더하고, 실제 3D는
// 상위 <AvatarStage>의 공유 렌더러가 이 div 영역(scissor)에 그린다.
export function AvatarView({
  faceParamsRef,
  motionRef,
  modelSrc = "/avatar.vrm",
  frame = "face",
  poseArmsDown = true,
  style,
}: {
  faceParamsRef?: FaceParamsRef; // 없으면 트래킹 없는 idle 아바타
  motionRef?: AvatarMotionRef;   // 엎드리기 등 일회성 모션 트리거 (선택)
  modelSrc?: string;             // 사용할 VRM 파일 경로 (기본: 공주 아바타)
  frame?: "face" | "full";       // face: 얼굴 프레이밍 / full: 전신 자동 프레이밍
  poseArmsDown?: boolean;        // T-pose 팔 내리기 보정 (스캔/흉상은 false)
  style?: CSSProperties;         // 크기·배치 (기본 480×480)
}) {
  const divRef = useRef<HTMLDivElement>(null);

  const stage = useAvatarStage();

  useEffect(() => {
    const el = divRef.current;
    if (!stage || !el) return;

    // 이 아바타 전용 씬/카메라/조명 (기존 VRMAvatar와 동일 구성)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    const dir = new THREE.DirectionalLight(0xffffff, Math.PI);
    dir.position.set(1, 1, 1);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const st = { vrm: null as VRM | null, bowT: -1 };

    const frameCamera = (aspect: number) => {
      camera.aspect = aspect;
      if (frame === "full" && st.vrm) {
        const box = new THREE.Box3().setFromObject(st.vrm.scene);
        const boxSize = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const distH = boxSize.y / 2 / Math.tan(fovRad / 2);
        const distW = boxSize.x / 2 / (Math.tan(fovRad / 2) * aspect);
        const dist = Math.max(distH, distW) * 1.15 + boxSize.z / 2;
        camera.position.set(0, center.y, dist);
        camera.lookAt(0, center.y, 0);
      } else {
        camera.position.set(0, 1.3, 1.5); // 얼굴 높이(약 1.3m)에서 정면
        camera.lookAt(0, 1.3, 0);
      }
      camera.updateProjectionMatrix();
    };

    const update = (delta: number) => {
      const vrm = st.vrm;
      if (!vrm) return;

      if (faceParamsRef) applyFaceParams(vrm, faceParamsRef.current); // 표정·머리·팔·몸통

      // 엎드리기 모션 트리거 (진행 중이 아닐 때만 새로 시작)
      if (motionRef?.current.action === "bow" && st.bowT < 0) {
        motionRef.current.action = null;
        st.bowT = 0;
      }
      if (st.bowT >= 0) {
        st.bowT += delta;
        const t = st.bowT;
        let k: number; // 0 = 서있음, 1 = 완전히 엎드림
        if (t < BOW_DOWN) k = ease(t / BOW_DOWN);
        else if (t < BOW_DOWN + BOW_HOLD) k = 1;
        else if (t < BOW_TOTAL) k = 1 - ease((t - BOW_DOWN - BOW_HOLD) / BOW_UP);
        else { k = 0; st.bowT = -1; }
        const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
        const spine = vrm.humanoid?.getNormalizedBoneNode("spine");
        const chest = vrm.humanoid?.getNormalizedBoneNode("chest");
        if (hips) hips.rotation.x = k * 0.55;
        if (spine) spine.rotation.x = k * 0.75;
        if (chest) chest.rotation.x = k * 0.45;
        vrm.scene.position.y = -k * 0.18;
      }

      vrm.update(delta); // 스프링본(머리카락·옷 흔들림) 갱신
    };

    const entry: AvatarEntry = { el, scene, camera, update, frameCamera, pendingFrame: true };
    stage.register(entry);

    let disposed = false;
    loadVrm(modelSrc)
      .then((vrm) => {
        if (disposed) { VRMUtils.deepDispose(vrm.scene); return; }
        if (poseArmsDown) applyArmsDown(vrm);
        st.vrm = vrm;
        vrm.scene.userData.headPitchSign = HEAD_PITCH_SIGNS[modelSrc] ?? 1;
        scene.add(vrm.scene);
        entry.pendingFrame = true; // 로드됐으니 카메라 재프레이밍
      })
      .catch((e) => console.error("VRM 로드 실패:", modelSrc, e));

    return () => {
      disposed = true;
      stage.unregister(entry);
      if (st.vrm) VRMUtils.deepDispose(st.vrm.scene);
    };
  }, [stage, modelSrc, frame, poseArmsDown, faceParamsRef, motionRef]);

  return <div ref={divRef} style={{ width: 480, height: 480, ...style }} />;
}
