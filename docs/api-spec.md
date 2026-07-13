# 황궁야화 API 설계서 (Endpoint Spec)

> **상태**: 설계 단계. 아직 Controller/Service는 미구현이며, 이 문서는 도메인 엔티티(user·stat·room·player·friend·notification·topic)와 게임 흐름, `SecurityConfig` 를 근거로 설계한 **전체 엔드포인트 명세**입니다. 코드 구현 전 합의용.

---

## 1. 공통 규약 (Conventions)

- **Base URL**: `http://{host}:8080` (로컬 기준). 프록시/버전 접두사는 아직 없음.
  - 현재 `SecurityConfig` 는 `/auth/**` 만 공개, 나머지는 인증 필요. → 아래 경로는 **루트 레벨**로 설계.
  - 만약 `/api` 접두사를 붙이려면 `SecurityConfig` 의 `requestMatchers("/auth/**")` 도 `/api/auth/**` 로 바꿔야 함.
- **인증 방식**: ⚠️ 아직 코드에 필터가 없음. **JWT Bearer 토큰**을 전제로 설계함(세션 대신 권장 — REST·WebSocket·모바일 확장에 유리).
  - 인증 필요한 요청은 헤더 `Authorization: Bearer {accessToken}`.
  - 비밀번호는 `BCryptPasswordEncoder` 로 해시(이미 Bean 등록됨).
- **인증 표기**: 🔓 공개 · 🔒 로그인 필요 · 👑 방장 전용 · ⚙️ 관리자
- **요청/응답 포맷**: `application/json` (프로필 업로드만 `multipart/form-data`).
- **공통 응답 봉투(권장)**:
  ```json
  { "success": true, "data": { }, "error": null }
  ```
- **에러 포맷**:
  ```json
  { "success": false, "data": null,
    "error": { "code": "ROOM_FULL", "message": "정원이 가득 찼습니다." } }
  ```
- **페이지네이션**: 목록 조회는 `?page=0&size=20&sort=field,desc` (Spring Pageable 관례).
- **상태 코드**: `200` 성공 · `201` 생성 · `204` 본문없음 · `400` 검증실패 · `401` 미인증 · `403` 권한없음 · `404` 없음 · `409` 충돌(중복/정원초과) · `422` 도메인규칙 위반.
- **식별자**: `userId`(문자열, ≤16) · `roomId`(정수 IDENTITY) · `noticeNum`(Long IDENTITY) · `topicId`(정수).

---

## 2. 인증 `/auth` 🔓

| Method | Path | 인증 | 설명 | Request | Response |
|---|---|---|---|---|---|
| POST | `/auth/signup` | 🔓 | 회원가입 | `{ userId, userPw, userNickname }` | `201` 생성된 유저 요약 |
| POST | `/auth/login` | 🔓 | 로그인 → 토큰 발급 | `{ userId, userPw }` | `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | 🔓 | Access 토큰 재발급 | `{ refreshToken }` | `{ accessToken }` |
| POST | `/auth/logout` | 🔒 | 로그아웃(refresh 무효화) | — | `204` |
| GET | `/auth/check-id?userId=` | 🔓 | 아이디 중복 확인 | — | `{ available: true }` |
| GET | `/auth/check-nickname?nickname=` | 🔓 | 닉네임 중복 확인 | — | `{ available: false }` |

---

## 3. 유저 `/users` 🔒

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/users/me` | 🔒 | 내 계정정보(userId·nickname·registeredAt) |
| PATCH | `/users/me` | 🔒 | 닉네임 수정 |
| PATCH | `/users/me/password` | 🔒 | 비밀번호 변경 `{ currentPw, newPw }` |
| PUT | `/users/me/profile` | 🔒 | 프로필 이미지 업로드(`multipart` → `user_profile` bytea) |
| DELETE | `/users/me/profile` | 🔒 | 프로필 이미지 삭제 |
| GET | `/users/{userId}/profile` | 🔒 | 프로필 이미지 조회(`image/*`) |
| GET | `/users/{userId}` | 🔒 | 특정 유저 공개 정보 |
| GET | `/users/search?keyword=&page=&size=` | 🔒 | 닉네임/아이디로 유저 검색(친구 추가용) |
| DELETE | `/users/me` | 🔒 | 회원 탈퇴 |

### 전적 / 랭킹
| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/users/me/stat` | 🔒 | 내 전적(rank·point·win·lose·played) |
| GET | `/users/{userId}/stat` | 🔒 | 특정 유저 전적 |
| GET | `/rankings?page=&size=` | 🔒 | 랭킹 보드(point 내림차순, rank 표시) |

---

## 4. 방 · 로비 `/rooms` 🔒

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/rooms?page=&size=&open=` | 🔒 | 방 목록(로비). 정원·현재인원·canAccess·방장·비번유무 |
| POST | `/rooms` | 🔒 | 방 생성 `{ playerLimit, roundLimit, timeLimit, roomPw? }` → `roomId` |
| GET | `/rooms/{roomId}` | 🔒 | 방 상세 |
| PATCH | `/rooms/{roomId}` | 👑 | 방 설정 변경(정원·라운드·시간·비번) |
| DELETE | `/rooms/{roomId}` | 👑 | 방 삭제/해산 |
| POST | `/rooms/{roomId}/join` | 🔒 | 입장 `{ roomPw? }` → PlayerInfo 생성 |
| POST | `/rooms/{roomId}/leave` | 🔒 | 퇴장 |
| GET | `/rooms/{roomId}/players` | 🔒 | 참가자 목록(role·ready 상태) |
| POST | `/rooms/{roomId}/ready` | 🔒 | 준비 토글 `{ ready: true }` |
| POST | `/rooms/{roomId}/kick` | 👑 | 강제 퇴장 `{ targetUserId }` |
| POST | `/rooms/{roomId}/start` | 👑 | 게임 시작(전원 준비 시) |

---

## 5. 게임 진행 `/rooms/{roomId}/game` 🔒

> 실시간 이벤트(발언·어점·라운드 전환)는 **WebSocket**(§8)에서 처리. 아래 REST는 스냅샷/영속화용.

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/rooms/{roomId}/game` | 🔒 | 현재 게임 상태 스냅샷(재접속용: 라운드·공주·점수·남은시간) |
| POST | `/rooms/{roomId}/game/award` | 🔒 | 어점(御點) 하사 `{ targetUserId }` (공주=PRINCESS만, REST 폴백) |
| GET | `/rooms/{roomId}/result` | 🔒 | 최종 결과(playerResult: WIN/LOSE·playerRank) |

---

## 6. 발언 주제 `/topics` 🔒

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/topics/random` | 🔒 | 라운드용 랜덤 주제 1건 |
| GET | `/topics` | 🔒 | 전체 주제 목록 |
| GET | `/topics/{topicId}` | 🔒 | 특정 주제 조회 |
| POST | `/topics` | ⚙️ | 주제 추가(관리자) |
| PUT | `/topics/{topicId}` | ⚙️ | 주제 수정(관리자) |
| DELETE | `/topics/{topicId}` | ⚙️ | 주제 삭제(관리자) |

---

## 7. 친구 `/friends` 🔒

> `FriendType`: `NONE` · `REQUESTED` · `FRIENDS`

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/friends` | 🔒 | 친구 목록(FRIENDS) |
| GET | `/friends/requests/received` | 🔒 | 받은 친구 요청(REQUESTED) |
| GET | `/friends/requests/sent` | 🔒 | 보낸 친구 요청 |
| POST | `/friends/requests` | 🔒 | 친구 요청 `{ toUserId }` → 상대에게 알림 발생 |
| POST | `/friends/requests/{fromUserId}/accept` | 🔒 | 요청 수락 → FRIENDS + 알림 |
| DELETE | `/friends/requests/{fromUserId}` | 🔒 | 요청 거절/취소 |
| DELETE | `/friends/{userId}` | 🔒 | 친구 삭제 |

---

## 8. 알림 `/notifications` 🔒

> `NotificationType`: `FRIEND_REQUEST` · `FRIEND_ACCEPT` · `SYSTEM`

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/notifications?page=&size=` | 🔒 | 내 알림 목록 |
| GET | `/notifications/unread-count` | 🔒 | 안읽음 개수(뱃지) |
| PATCH | `/notifications/{noticeNum}/read` | 🔒 | 개별 읽음 처리 |
| PATCH | `/notifications/read-all` | 🔒 | 전체 읽음 처리 |
| DELETE | `/notifications/{noticeNum}` | 🔒 | 알림 삭제 |

### 실시간 알림(선택)
| 채널 | Destination | 설명 |
|---|---|---|
| WS SUB | `/user/queue/notifications` | 로그인 유저 개인 알림 실시간 수신 |

---

## 9. 실시간 게임 (WebSocket / STOMP) 🔒

> `PlayerInfo` 주석대로 *"실시간 상태는 서버 메모리에서 관리"* → 인게임 상호작용은 STOMP over WebSocket 권장.
> 핸드셰이크 시 `Authorization: Bearer {token}` 로 인증.

- **Endpoint**: `GET /ws` (SockJS/STOMP 핸드셰이크)

### 구독 (Server → Client)
| Destination | 설명 |
|---|---|
| `/topic/rooms/{roomId}` | 방 상태(입장·퇴장·준비·시작) 브로드캐스트 |
| `/topic/rooms/{roomId}/chat` | 어전 대화(채팅) |
| `/topic/rooms/{roomId}/game` | 라운드 전환·공주 간택·점수·발언 상태 |
| `/user/queue/notifications` | 개인 알림 |

### 발행 (Client → Server)
| Destination | Payload | 설명 |
|---|---|---|
| `/app/rooms/{roomId}/chat` | `{ text }` | 채팅 전송 |
| `/app/rooms/{roomId}/speaking` | `{ speaking: bool }` | 발언(마이크) 상태 |
| `/app/rooms/{roomId}/award` | `{ targetUserId }` | 공주의 어점 하사 |
| `/app/rooms/{roomId}/round/next` | — | (방장/서버) 다음 라운드·공주 간택 |
| `/app/rooms/{roomId}/face` | `{ expressions, headRotation }` | (선택) 공주 얼굴 파라미터 중계 → 관전자 아바타 동기화 |

---

## 10. 시스템 · 메타 🔓

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/health` | 🔓 | 헬스체크(또는 `/actuator/health`) |
| GET | `/version` | 🔓 | 빌드/버전 정보 |

---

## 부록 A. Enum 값

| Enum | 값 |
|---|---|
| `RankType` | `NONE` · `BRONZE` · `SILVER` · `GOLD` · `PLATINUM` · `DIAMOND` |
| `RoleType` | `PRINCESS`(공주) · `SERVANT`(신하) · `NONE` |
| `WinType` | `WIN` · `OTHER` · `LOSE` · `NONE` |
| `FriendType` | `NONE` · `REQUESTED` · `FRIENDS` |
| `NotificationType` | `FRIEND_REQUEST` · `FRIEND_ACCEPT` · `SYSTEM` |

## 부록 B. 핵심 엔티티 필드 요약

- **UserInfo**: `userId`(PK,≤16) · `userPw`(해시) · `registeredAt` · `userNickname`(≤12) · `userProfile`(bytea)
- **Stat** (User와 1:1, PK=FK): `userRank` · `userPoint` · `userWin` · `userLose` · `userPlayed`
- **RoomInfo**: `roomId`(IDENTITY) · `creator`(방장) · `playerLimit` · `roundLimit` · `timeLimit` · `roomPw` · `canAccess`
- **PlayerInfo** (userId+roomId 복합키): `playerRole` · `playerResult` · `playerRank`
- **UserFriends** (fromId+toId 복합키): `friendDate` · `friendStatus`
- **Notification**: `noticeNum`(IDENTITY) · `recipient` · `actor`(nullable) · `type` · `isRead` · `createdAt`
- **Topic**: `topicId` · `topicHead`

## 부록 C. 결정 필요 사항 (구현 전)

1. **인증 방식 확정** — JWT(권장) vs 세션. 이 결정으로 `/auth/login` 응답과 WebSocket 인증이 확정됨.
2. **관리자(⚙️) 권한 모델** — `UserInfo` 에 역할 컬럼이 없음. 주제 CRUD 등 관리자 API가 필요하면 role/authority 추가 필요.
3. **`/api` 접두사** 사용 여부 — 사용 시 `SecurityConfig` 매처 동반 수정.
4. **게임 실시간 전송** — WebSocket(STOMP) 도입 여부. 미도입 시 §5·§9를 REST 폴링으로 대체.
