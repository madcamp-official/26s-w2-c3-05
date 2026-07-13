import { Client } from "@stomp/stompjs";

// 앱 전체가 공유하는 소켓 1개

let client: Client | null = null;

// 로그인 후 한 번 호출. 이미 연결돼 있으면 재사용 (싱글턴)
export function connectStomp(token: string): Client {
  if (client?.active) return client;
  client = new Client({
    brokerURL: import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws",
    connectHeaders: { Authorization: `Bearer ${token}` }, // CONNECT 프레임에 토큰
    reconnectDelay: 3000, // 끊기면 3초 후 자동 재연결
  });
  client.activate();
  return client;
}

export function getStomp(): Client | null {
  return client;
}

export function disconnectStomp() {
  client?.deactivate();
  client = null;
}

// 의도: 소켓은 앱에 하나면 됩니다.
// 로그인 시 connectStomp(토큰),
// 로그아웃 시 disconnectStomp().
// 훅들은 getStomp()로 가져다 씀.