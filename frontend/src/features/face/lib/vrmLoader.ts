import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";

// ── VRM 로딩 캐시 (최적화 B) ──
// 같은 .vrm 파일을 여러 아바타가 써도 다운로드는 URL당 딱 한 번(in-flight 공유).
// 파싱은 인스턴스마다 독립적으로 해야 각자 뼈/포즈가 따로 논다.
const bufferCache = new Map<string, Promise<ArrayBuffer>>();

function loadBuffer(url: string): Promise<ArrayBuffer> {
  let p = bufferCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`VRM ${url} ${r.status}`);
      return r.arrayBuffer();
    });
    bufferCache.set(url, p);
  }
  return p;
}

// URL의 VRM을 로드 (다운로드는 캐시, 파싱은 매번 독립 인스턴스).
export async function loadVrm(url: string): Promise<VRM> {
  const buf = await loadBuffer(url);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  // 캐시 버퍼를 여러 번 파싱하므로 복사본을 넘겨 원본 detach 방지
  const gltf = await loader.parseAsync(buf.slice(0), "");
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.rotateVRM0(vrm); // VRM0.x 모델이 뒤돌아 있는 것 보정
  // 스킨드메시 경계구가 잘못 잡혀 컬링돼 사라지는 것 방지 (공유 렌더러/커스텀 카메라 보정)
  vrm.scene.traverse((o) => (o.frustumCulled = false));
  return vrm;
}

// T-pose 모델의 팔을 아래로 내려 정지 자세로 (스캔/흉상 모델은 호출 안 함).
export function applyArmsDown(vrm: VRM) {
  const rad = THREE.MathUtils.degToRad(70);
  const l = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
  const r = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
  if (l) l.rotation.z = rad;
  if (r) r.rotation.z = -rad;
}
