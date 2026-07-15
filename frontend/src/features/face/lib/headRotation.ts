import * as THREE from "three";

// 매 프레임 new 하지 않도록 모듈 레벨에서 재사용 (GC 부담 줄이기)
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();

// facialTransformationMatrixes[0].data (16개) → 쿼터니언 {x,y,z,w}
export function matrixToHeadRotation(data: number[]) {
  _matrix.fromArray(data);              // 4×4 행렬 복원
  _quat.setFromRotationMatrix(_matrix); // 회전 성분만 추출
  // MediaPipe와 VRM 사이에서 pitch(x)는 같은 방향입니다.
  // x를 반전하면 고개를 숙일 때 아바타가 뒤로 젖혀집니다.
  // 좌우(yaw)만 카메라 좌표계 보정을 위해 반전합니다.
  return { x: _quat.x, y: -_quat.y, z: _quat.z, w: _quat.w };
}
