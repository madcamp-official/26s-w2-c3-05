// 프론트 → 로컬 백엔드 연동용 범용 요청 함수
// (App.tsx의 기존 WIP request와 별개로, 연동 확인 목적의 최소 클라이언트)
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
// 빌드 시 env로 주소를 갈아끼울 수 있게.
// 배포에선 ''(빈값)을 줘서 같은 origin 상대경로(/auth/login)로 요청
// → nginx가 백엔드로 넘김.

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }

  // 201/204 등 빈 본문 대비
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
