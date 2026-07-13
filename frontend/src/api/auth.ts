import { request } from './client';

// 백엔드 계약에 맞춘 필드명(camelCase)
//  POST /auth/signup  { userId, userPw, userNickname } -> 201 (본문 없음)
//  POST /auth/login   { userId, userPw }               -> 200 { accessToken }
export interface TokenResponse {
  accessToken: string;
}

export function signup(userId: string, userPw: string, userNickname: string): Promise<void> {
  return request<void>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ userId, userPw, userNickname }),
  });
}

export function login(userId: string, userPw: string): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId, userPw }),
  });
}
