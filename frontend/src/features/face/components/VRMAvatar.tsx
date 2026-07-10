import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { applyFaceParams } from "../lib/blendshapeToVrm";   // ← 추가
import type { FaceParamsRef } from "../types";              // ← 추가

export function VRMAvatar({ faceParamsRef }: { faceParamsRef: FaceParamsRef }) {
    // ← prop
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
      .loadAsync("/avatar.vrm")
      .then((gltf) => {
        if (disposed) return;              // 로드 중 언마운트되면 버림
        vrm = gltf.userData.vrm as VRM;    // 파싱된 VRM은 여기에 담김
        VRMUtils.rotateVRM0(vrm);          // VRM0.x 모델이 뒤돌아 있는 것 보정
        scene.add(vrm.scene);

        // ↓ 추가: T포즈 → 팔을 아래로 내린 정지 자세
            const rad = THREE.MathUtils.degToRad(70); // 내리는 각도 (65~75 사이 취향껏)
            const leftArm = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
            const rightArm = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
            if (leftArm) leftArm.rotation.z = rad;
            if (rightArm) rightArm.rotation.z = -rad;
      })
      .catch((e) => console.error("VRM 로드 실패:", e));

    // 5) 렌더 루프: 매 프레임 화면을 다시 그림
    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const delta = clock.getDelta();      // 지난 프레임과의 시간차(초)
      if (vrm) {
          applyFaceParams(vrm, faceParamsRef.current); // <- 표정 적용 (반드시 update 전에)
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
  }, [faceParamsRef]);

  return <div ref={containerRef} style={{ width: 480, height: 480 }} />;
}