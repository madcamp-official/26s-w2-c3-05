# cheonha(천하) — 실시간 궁중 코미디 파티 게임 스펙

> 매 라운드 한 명이 **공주(술래)** 로 간택되고, 나머지 **신하** 들이 공주를 웃기기 위해 겨루는 다대일(N:1) 실시간 코미디 파티 게임. 웹캠 표정은 **VRM 아바타**로 실시간 반영되고, 참가자들은 음성·채팅으로 소통한다.
>
> 배포: https://cheonha.duckdns.org · 자세한 API·실행 방법은 [README.md](README.md) 참고.

---

## 1. 프로젝트 개요

궁중 '연회'를 배경으로 한 실시간 코미디 파티 게임. 한 방에 방장 포함 최대 5~6명이 모여 여러 라운드를 진행한다.

- 매 라운드 한 명이 **공주(술래)** 로 간택되고, 나머지는 **신하** 가 된다.
- 신하들은 말·표정·행동으로 공주를 웃기려 하고, **공주가 웃으면 신하들이 어점(御點)** 을 얻는다.
- 공주는 특히 재미있었던 신하에게 **어점을 직접 하사** 하거나, 방해가 되는 신하의 **마이크를 강제로 막을** 수 있다.
- 라운드마다 공주가 순환하고, **최종 어점 합계로 승자** 를 가려 전적·랭킹에 반영한다.
- 실제 웹캠 영상 대신 **VRM 3D 아바타** 에 표정·머리 움직임을 실시간 반영해, 얼굴을 드러내지 않고도 서로의 반응을 볼 수 있다.

---

## 2. 게임 규칙

| 항목 | 규칙 |
|---|---|
| 라운드 수 · 제한시간 | 방 생성 시 설정값(`roundLimit` · `timeLimit`)을 따른다. 각 라운드는 서버 타이머로 종료 |
| 공주 간택 | 평상시 라운드 순번대로 순환(`(round-1) % 인원`). 공주가 중간 이탈하면 남은 인원 중 랜덤 재간택 |
| 득점 (신하) | 공주가 웃으면 공주를 제외한 모든 신하가 +1점. **라운드당 신하 1인 상한 5점** |
| 어점 하사 (공주) | 공주가 특정 신하에게 직접 +1점. **라운드당 하사 총량 5점** |
| 종료 | 설정 라운드를 모두 마치면 게임 종료 → 최고 득점자가 승자 |
| 중단 | 남은 인원이 2명 미만이 되면 게임 중단(무효) 후 방 잠금 해제 |
| 이탈 | 이탈해도 그 시점까지의 점수는 유지되어 결과에 반영. 공주가 이탈하면 해당 라운드를 접고 다음 라운드로 |

> 규칙 상수: 라운드당 신하 득점 상한 `MAX_SCORE_PER_ROUND = 5`, 라운드당 어점 하사 상한 `AWARDS_PER_ROUND = 5` (`GameManager`).

---

## 3. 핵심 설계 결정

이 세 가지 판단이 전체 기술 스택을 결정한다.

### 3-1. 웹캠 원본 영상은 전송하지 않는다
브라우저에서 얼굴을 트래킹해 **표정 계수(블렌드셰이프)와 머리 회전값** 만 뽑아 전송하고, 아바타는 각 참가자의 브라우저가 직접 렌더링한다. 웹캠 원본 영상은 서버로 나가지 않는다.
- 장점: 대역폭이 극히 가볍고(프레임당 소량), 아바타 화질이 시청자 기기 성능을 따르며, 프라이버시가 우수하다.

### 3-2. 표정·채팅·게임 이벤트는 WebSocket, 음성만 WebRTC
- **표정 데이터 / 채팅 / 게임 이벤트**: 경량 → **STOMP over WebSocket** 브로드캐스트로 처리.
- **음성**: 실시간성이 중요 → **WebRTC P2P** 로 처리(미디어는 서버를 거치지 않음).

### 3-3. SFU(미디어 서버)는 필요 없다
인원이 5~6명 고정이고 무거운 영상 스트림이 없으므로 **음성 Mesh만으로 감당** 된다.
- 시그널링(offer/answer/ice)은 기존 STOMP 채널에 얹고, 미디어는 P2P로 흐른다.
- 서로 다른 NAT 환경 연결을 위해 STUN(Google) + 공개 TURN(openrelay)만 사용, 별도 미디어 서버는 두지 않는다.

---

## 4. 실시간 데이터 흐름 (STOMP + WebRTC)

- WebSocket 엔드포인트: `ws(s)://<host>/ws` (네이티브 WebSocket STOMP, SockJS 미사용)
- 클라 → 서버 접두사 `/app`, 서버 → 클라 방송 접두사 `/topic`, 브로커는 스프링 내장 SimpleBroker
- 모든 인바운드 STOMP 프레임은 인증 인터셉터를 통과(§8). 발신자는 서버 세션이 확정하므로 이름 위장이 불가능하다.

### 발행 (Client → Server, `/app`)
| Destination | Payload | 설명 |
|---|---|---|
| `/app/rooms/{roomId}/enter` | — | 입장 알림 |
| `/app/rooms/{roomId}/leave` | — | 퇴장 알림(게임 중이면 이탈 처리) |
| `/app/rooms/{roomId}/start` | — | 게임 시작(방장) |
| `/app/rooms/{roomId}/chat` | `{ text }` | 채팅 전송 |
| `/app/rooms/{roomId}/face` | `{ expressions, headRotation }` | 표정 파라미터 스트림 |
| `/app/rooms/{roomId}/motion` | `{ action }` | 조아리기 등 아바타 모션 |
| `/app/rooms/{roomId}/laugh` | — | 공주 웃음 감지 알림 |
| `/app/rooms/{roomId}/award` | `{ targetId }` | 공주의 어점 하사 |
| `/app/rooms/{roomId}/mute` | `{ targetId, muted }` | 공주의 신하 강제 음소거 |
| `/app/rooms/{roomId}/rtc` | `{ to, type, payload }` | WebRTC 시그널(offer/answer/ice) |

### 구독 (Server → Client, `/topic`)
| Destination | 설명 |
|---|---|
| `/topic/rooms/{roomId}` | 방 이벤트(입장·퇴장 등) |
| `/topic/rooms/{roomId}/chat` | 채팅 브로드캐스트(발신자 = 서버 확정) |
| `/topic/rooms/{roomId}/game` | 게임 이벤트: `ROUND_START` · `LAUGH` · `AWARD` · `ROUND_END` · `GAME_END` · `GAME_ABORT` |
| `/topic/rooms/{roomId}/face` | 표정 스트림 릴레이(DB 미경유) |
| `/topic/rooms/{roomId}/motion` | 모션 릴레이 |
| `/topic/rooms/{roomId}/mute` | 강제 음소거 상태 |
| `/topic/rooms/{roomId}/rtc` | WebRTC 시그널 릴레이 |
| `/user/queue/notifications` | 로그인 유저 개인 알림 |

### 데이터 종류별 특성
| 데이터 종류 | 전송 방식 | 경로 | 특징 |
|---|---|---|---|
| 표정 데이터 | WebSocket(STOMP) 릴레이 | 참가자 → 서버 → 전원 | 초당 다수, 프레임당 소량, DB 미경유 |
| 채팅 | WebSocket(STOMP) | 참가자 → 서버 → 전원 | 서버가 발신자 확정 |
| 게임 이벤트·점수 | WebSocket(STOMP) | 서버 → 전원 | **서버 권위**(라운드·점수·종료 판정) |
| 음성 | WebRTC(P2P Mesh) | 참가자 ↔ 참가자 | 시그널만 STOMP 경유, 미디어는 P2P |

---

## 5. 기술 스택

### 프론트엔드
- **React 18 + Vite 6 + TypeScript**
- 상태는 React 기본(`useState`/`useRef`)으로 관리(별도 전역 상태 라이브러리 미사용)
- `@stomp/stompjs` 로 표정·채팅·게임 이벤트 처리, `RTCPeerConnection` 으로 음성

### 얼굴·포즈 트래킹
- **MediaPipe Tasks Vision** — 브라우저에서 WASM/GPU로 동작
- `FaceLandmarker`(표정 블렌드셰이프 + 머리 회전) · `PoseLandmarker`(상체 포즈)

### 아바타 렌더링
- **VRM(3D)** — `@pixiv/three-vrm` + **Three.js**
- MediaPipe 계수 → VRM 블렌드셰이프/본 매핑은 자체 변환 로직(`blendshapeToVrm`)으로 처리
- 공유 렌더러 1개로 다수 아바타를 렌더해 비용 절감

### 백엔드
- **Spring Boot 3.5 · Java 17**
- **STOMP(WebSocket)**: 표정·채팅·게임 이벤트 브로드캐스트, WebRTC 시그널 릴레이
- **REST**: 인증(JWT) · 방/로비 · 유저/전적/랭킹 · 친구 · 알림 · 주제
- 인메모리 게임 상태·타이머(`GameManager`/`GameState`)로 라운드 진행을 서버가 주관
- JWT(`jjwt`), 환경변수 로딩(`spring-dotenv`)

### 데이터베이스
- **PostgreSQL 16** + Spring Data JPA(`ddl-auto: validate`)
- 스키마는 SQL로 직접 관리(`docs/db/database.sql`), JPA는 매핑 검증만 담당

### 인프라
- **Docker Compose**: `postgres` + `backend`(Spring) + `frontend`(nginx) 3개 컨테이너
- **nginx** 가 프론트 정적 빌드를 서빙하고 **TLS 종단** + REST·`/ws` 리버스 프록시
- **DuckDNS** 도메인 + **Let's Encrypt** 인증서, **HTTPS/WSS 필수**(웹캠·마이크 접근 조건)

---

## 6. 시스템 구성

```
브라우저(React/VRM)
   │  HTTPS(REST) · WSS(STOMP)          ┌───────────────┐
   ├───────────────────────────────────▶│  nginx :443   │  TLS 종단 · 정적 서빙
   │                                     │  (frontend)   │  /(정적) · /ws·REST → 프록시
   │  WebRTC(P2P, 음성 미디어)            └──────┬────────┘
   │◀───────(참가자 간 직접 연결)────────▶       │
   │                                     ┌──────▼────────┐
   │                                     │ backend :8080 │  Spring Boot
   │                                     │  REST + STOMP │  인메모리 GameManager
   │                                     └──────┬────────┘
   │                                     ┌──────▼────────┐
   │                                     │ postgres :5432│  PostgreSQL 16
   │                                     └───────────────┘
```

- 외부 진입점은 nginx(80/443)뿐. backend·postgres는 컴포즈 내부 네트워크에서만 통신한다.
- 음성 미디어(WebRTC)는 서버를 거치지 않고 참가자 사이를 직접 흐른다(시그널만 STOMP 경유).

---

## 7. 서버 권위와 상태 관리

- 라운드 전환·점수·종료 등 **게임 판정은 전적으로 서버가 결정** 하고 `/topic/rooms/{id}/game` 으로 방송한다. 클라이언트는 이벤트를 반영만 한다(예전 로컬 계산 방식에서 남을 못 보던 문제 제거).
- 게임 상태는 DB가 아니라 **서버 메모리** (`GameState`)에 방 단위로 존재하며, 라운드 타이머는 자체 `ScheduledExecutorService` 로 건다.
- 라운드 전환은 `synchronized` 로 직렬화하고 `roundActive` 플래그로 이중 처리(타이머 vs 웃음 동시 도착)를 막는다.
- 이탈 처리(`handlePlayerLeave`)는 참가자 목록에서만 제거하고 **점수는 유지** → 결과 화면에 이탈 시점 점수가 그대로 나온다.
- DB는 **시작/종료 두 순간** 에만 관여(방 잠금·전적 집계)해 트랜잭션 경계를 단순화한다.

---

## 8. 인증 · 보안

- **REST**: 로그인 시 `accessToken`/`refreshToken` 발급(JWT, 유효기간 1시간). 보호 API는 `Authorization: Bearer <token>`.
- **STOMP**: 소켓 CONNECT 프레임의 `Authorization: Bearer <token>` 를 인증 인터셉터(`StompAuthChannelInterceptor`)가 검증해 세션 `Principal` 을 확정. 이후 모든 발신자는 서버가 세션에서 결정하므로 **타인 사칭 불가**.
- **공주 권한 검증**: 어점 하사·강제 음소거는 서버가 "현재 라운드 공주인지" 확인한 뒤에만 반영한다.
- 배포 시 `getUserMedia`/WebRTC는 보안 컨텍스트에서만 동작 → **HTTPS/WSS 필수**.

---

## 9. DB 스키마 개요

전체 정의는 [`docs/db/database.sql`](docs/db/database.sql). ENUM 타입으로 역할·결과·랭크·친구/알림 상태를 표현한다.

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `user_info` | user_id, user_pw, user_nickname, user_profile(BYTEA), registered_at | 계정·프로필 |
| `stat` | user_id, user_rank(생성 컬럼), user_point, user_win/lose/played | point 기준 랭크 티어 자동 계산 |
| `room` / `player_info` | 방 설정 · 참가자 역할(role)·결과(result)·순위 | 로비·인게임 참가 정보 |
| `topic` | topic_id, topic_head | 라운드 발언 주제(시드: `docs/seeds/seed_topic.json`) |
| `user_friends` | from_id, to_id, friend_status, friend_date | 친구 관계(NONE/REQUESTED/FRIENDS) |
| `notification` | notice_num, recipient_id, actor_id, type, is_read | 친구 요청/수락·시스템 알림 |

---

## 10. 알아둘 함정

- **HTTPS/WSS 필수**: `getUserMedia`는 보안 컨텍스트에서만 동작. `localhost`는 예외라 개발은 되지만, 배포 시 반드시 TLS(nginx + Let's Encrypt)가 필요하다. ("로컬은 되는데 배포하면 카메라 안 켜짐" 함정)
- **WebRTC NAT 통과**: 엄격한 NAT/방화벽 환경에서는 STUN만으로 부족할 수 있어 TURN 중계가 필요하다(현재 공개 TURN 사용). UDP 포트 정책도 확인.
- **표정-음성 싱크**: 표정(STOMP)과 음성(WebRTC)이 다른 경로라 미세한 어긋남이 가능하다.
- **저사양 기기 부담**: 시청자 기기에서 3D(VRM) 렌더링이 돌아가므로 아주 저사양 기기에선 부담될 수 있어 공유 렌더러로 비용을 줄인다.
- **동시성**: 타이머 만료와 웃음/이탈 이벤트가 동시에 들어와도 라운드가 두 번 넘어가지 않도록 서버에서 직렬화·플래그로 방어한다.
