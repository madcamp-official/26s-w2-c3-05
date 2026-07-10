import * as THREE from "three";

// 매 프레임 new 하지 않도록 모듈 레벨에서 재사용 (GC 부담 줄이기)
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();

// facialTransformationMatrixes[0].data (16개) → 쿼터니언 {x,y,z,w}
export function matrixToHeadRotation(data: number[]) {
  _matrix.fromArray(data);              // 4×4 행렬 복원
  _quat.setFromRotationMatrix(_matrix); // 회전 성분만 추출
  return { x: -_quat.x, y: -_quat.y, z: _quat.z, w: _quat.w };
}