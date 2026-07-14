import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { ChatMsg, Room, Scores } from '../types/game';
import { ROUND_HANJA, ROUND_SECONDS } from '../constants/game';
import { getPlayers, leaveRoom } from '../App';
import { useGameChannel, type GameEventMsg } from '../features/game/hooks/useGameChannel';
import { useLaughSender } from '../features/game/hooks/useLaughSender';
import { getStomp } from '../lib/stompClient';
import type { StompSubscription } from '@stomp/stompjs';
import { GOLD, SpeakingBars, primaryBtn } from '../components/ui';
import { VRMAvatar, type AvatarMotion, type AvatarMotionRef } from '../features/face/components/VRMAvatar';
import { WebcamView } from '../features/face/components/WebcamView';
import { initialFaceParams, type FaceParams, type FaceParamsRef } from '../features/face/types';
import { useFaceSender } from '../features/game/hooks/useFaceSender';
import { useRemoteFaces } from '../features/game/hooks/useRemoteFaces';

import { useAudio } from '../components/AudioContext';

/** 공주가 한 라운드에 하사할 수 있는 어점 총량 */
const AWARDS_PER_ROUND = 5;

interface GameState {
  round: number;
  secLeft: number;
  princess: string;
  scores: Scores;
  speaking: Record<string, boolean>;
  micOn: boolean;
  chat: ChatMsg[];
  interstitial: boolean;
  awardsThisRound: number; // 이번 라운드에 공주가 하사한 어점 수 (라운드마다 0으로 리셋)
}

// 신하(관객) 배치는 인원수에 따라 동적으로 계산 (servants 계산부 참고)

export default function GamePage({ nick, room, firstEvent, onFinish, onAborted, onExit }: {
  nick: string;
  room: Room;
  firstEvent: GameEventMsg;   // 대기방에서 받은 1라운드 시작 정보
  onFinish: (scores: Scores) => void;
  onAborted: () => void;      // 인원 부족으로 게임 중단 → 대기화면 복귀
  onExit: () => void;         // 내가 연회를 파하고 나감 → 로비로
}) {
  // 방 생성 시 설정한 제한시간 (서버 타이머와 동일 기준; 없으면 기본값)
  const roundSeconds = room.time_limit || ROUND_SECONDS;

  const [g, setG] = useState<GameState>(() => ({
    round: 1,
    secLeft: roundSeconds,
    princess: '',               // 서버 ROUND_START가 채운다
    scores: { [nick]: 0 },
    speaking: {},
    micOn: true,
    interstitial: false,
    awardsThisRound: 0,
    chat: [{ kind: 'system', text: '제1연(第一宴)이 개막하였사옵니다' }],
  }));
  const [draft, setDraft] = useState('');
  const [princessId, setPrincessId] = useState('');

  const gRef = useRef(g);
  gRef.current = g;
  const timers = useRef<number[]>([]);
  const worldRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  // 얼굴 트래킹: 로컬 사용자의 웹캠 → faceParamsRef → VRM 아바타(표정·머리회전)
  const faceParamsRef = useRef<FaceParams>(initialFaceParams);

  // 유저별 모션 상자: 이름 → AvatarMotionRef (내 것/남의 것 동일 경로로 구동)
  const motionRefs = useRef<Record<string, AvatarMotionRef>>({});
  const motionRefFor = (name: string): AvatarMotionRef => {
    if (!motionRefs.current[name]) motionRefs.current[name] = { current: { action: null } };
    return motionRefs.current[name];
  };

  // 절할 때 뜨는 '소인 죽을죄를…' 말풍선 — 유저별 표시 상태
  const [bowingWho, setBowingWho] = useState<Record<string, boolean>>({});
  const bowTimers = useRef<Record<string, number>>({});
  const playBow = (name: string) => {
    motionRefFor(name).current.action = 'bow';        // 아바타 모션
    setBowingWho((prev) => ({ ...prev, [name]: true })); // 말풍선
    window.clearTimeout(bowTimers.current[name]);
    bowTimers.current[name] = window.setTimeout(
      () => setBowingWho((prev) => ({ ...prev, [name]: false })), 2000);
  };
  useEffect(() => () => Object.values(bowTimers.current).forEach(clearTimeout), []);

  // 엎드리기 버튼: 내 화면에서 재생 + 같은 방 전원에게 중계
  const triggerBow = () => {
    playBow(nick);
    const client = getStomp();
    if (client?.connected) {
      client.publish({
        destination: `/app/rooms/${room.room_id}/motion`,
        body: JSON.stringify({ action: 'bow' }),
      });
    }
  };

  // 서버 이벤트는 userId 기준, UI는 닉네임 기준 → 경계에서 변환한다
  const playersRef = useRef<Record<string, string>>({}); // userId → nickname
  const [allNames, setAllNames] = useState<string[]>([nick]);
  const allNamesRef = useRef(allNames);
  allNamesRef.current = allNames;

  const loadPlayers = () => {
    getPlayers(room.room_id)
      .then((list) => {
        playersRef.current = Object.fromEntries(list.map((p) => [p.user_id, p.nickname]));
        setAllNames(list.map((p) => p.nickname));
      })
      .catch(() => {});
  };
  useEffect(loadPlayers, [room.room_id]);

  const idToNick = (id?: string) => (id && playersRef.current[id]) || id || '';

  // 공주 닉네임 재동기화: 1라운드 시작 이벤트가 명단 로딩보다 먼저 오면
  // idToNick이 userId를 그대로 반환해 "공주가 신하 목록에도 보이는" 문제가 생긴다.
  // 명단이 채워진 뒤 princessId 기준으로 닉네임을 다시 계산해 바로잡는다.
  useEffect(() => {
    if (princessId) {
      setG((prev) => ({ ...prev, princess: idToNick(princessId) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNames, princessId]);
  const scoresToNick = (s?: Record<string, number>): Scores =>
    Object.fromEntries(Object.entries(s ?? {}).map(([id, v]) => [idToNick(id), v]));

  const pushChat = (msg: ChatMsg) =>
    setG((prev) => ({ ...prev, chat: [...prev.chat, msg].slice(-80) }));

  const nickToId = (name: string) =>
    Object.keys(playersRef.current).find((id) => playersRef.current[id] === name);

  // 어점 하사: 서버로 보내기만 한다 — 점수·한도 검증·방송은 서버가 담당하고
  // 모두가 AWARD 이벤트로 동일하게 반영받는다 (예전엔 로컬 전용이라 남에게 안 보였음)
  const award = (target: string) => {
    if (gRef.current.awardsThisRound >= AWARDS_PER_ROUND) return;
    const targetId = nickToId(target);
    const client = getStomp();
    if (!targetId || !client?.connected) return;
    client.publish({
      destination: `/app/rooms/${room.room_id}/award`,
      body: JSON.stringify({ targetId }),
    });
  };

  // 서버 게임 이벤트 → 로컬 상태 반영 (라운드 전환·점수·종료는 전부 서버가 결정)
  const applyEvent = (ev: GameEventMsg) => {
    if (ev.type === 'ROUND_START') {
      setG((prev) => ({
        ...prev,
        round: ev.round ?? prev.round,
        princess: idToNick(ev.princessId),
        secLeft: roundSeconds,
        interstitial: false,
        awardsThisRound: 0,
      }));
      setPrincessId(ev.princessId ?? '');   // 얼굴 중계 대상(userId) 갱신
      pushChat({
        kind: 'system',
        text: `제${ev.round}연 개막 — ${idToNick(ev.princessId)} 님이 공주로 간택되셨사옵니다 ♕`,
      });
      if (ev.topicHead) pushChat({ kind: 'system', text: `이번 연회의 주제: 「${ev.topicHead}」` });
    } else if (ev.type === 'LAUGH') {
      setG((prev) => ({ ...prev, scores: scoresToNick(ev.scores) }));
      pushChat({ kind: 'system', text: '공주께서 웃음을 터뜨리셨사옵니다! 하인들에게 어점이 내려졌사옵니다 ✦' });
    } else if (ev.type === 'AWARD') {
      // 어점 하사: 전원 동일하게 점수 갱신 + 시스템 메시지
      setG((prev) => ({
        ...prev,
        scores: scoresToNick(ev.scores),
        awardsThisRound: prev.awardsThisRound + 1,
      }));
      pushChat({
        kind: 'system',
        text: `공주께서 ${idToNick(ev.targetId)} 님에게 어점(御點)을 하사하셨사옵니다 ✦`,
      });
    } else if (ev.type === 'ROUND_END') {
      setG((prev) => ({ ...prev, interstitial: true, secLeft: 0, scores: scoresToNick(ev.scores) }));
    } else if (ev.type === 'GAME_END') {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish(scoresToNick(ev.scores));
      }
    } else if (ev.type === 'GAME_ABORT') {
      // 인원 부족(1명 잔류) → 서버가 게임 중단 + 방 잠금 해제 → 대기화면 복귀
      if (!finishedRef.current) {
        finishedRef.current = true;
        onAborted();
      }
    }
  };

  useGameChannel(room.room_id, applyEvent);

  // 대기방에서 받은 1라운드 시작 정보 즉시 적용
  useEffect(() => {
    applyEvent(firstEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 내가 공주인 라운드에 웃음(happy) 감지 → 서버로 전송 (점수 계산·방송은 서버 담당)
  useLaughSender(room.room_id, g.princess === nick, faceParamsRef);

  // 얼굴 중계: 전원이 자기 표정을 송출하고, 전원의 표정을 유저별 ref로 수신한다
  // → 공주뿐 아니라 신하 아바타들도 실제 유저 얼굴(표정·머리회전)로 동기화
  useFaceSender(room.room_id, faceParamsRef, true);
  const faceRefFor = useRemoteFaces(room.room_id);

  // 1초 게임 루프: 화면용 타이머 감소 + 발화 표시 (라운드 전환·점수는 서버가 방송)
  useEffect(() => {
    const loop = window.setInterval(() => {
      const cur = gRef.current;
      if (cur.interstitial || finishedRef.current) return;

      if (Math.random() < 0.6) {
        const speaking: Record<string, boolean> = {};
        allNamesRef.current.forEach((n) => (speaking[n] = Math.random() < 0.3));
        speaking[nick] = cur.micOn && Math.random() < 0.3;
        setG((prev) => ({ ...prev, speaking }));
      }

      setG((prev) => ({ ...prev, secLeft: Math.max(0, prev.secLeft - 1) }));
    }, 1000);
    return () => {
      clearInterval(loop);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 채팅 자동 스크롤
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [g.chat]);

  const sendChat = () => {
    const t = draft.trim();
    if (!t) return;
    pushChat({ kind: 'self', who: nick, text: t }); // 내 화면엔 즉시 표시
    const client = getStomp();
    if (client?.connected) {
      client.publish({
        destination: `/app/rooms/${room.room_id}/chat`,
        body: JSON.stringify({ text: t }),          // 같은 방 사람들에게 중계
      });
    }
    setDraft('');
  };

  // 게임 중 실시간 수신: 채팅 / 모션(조아리기) / 입퇴장
  useEffect(() => {
    const myId = sessionStorage.getItem('userId') ?? '';
    const subs: StompSubscription[] = [];
    let retry: number | undefined;

    const trySub = () => {
      const client = getStomp();
      if (!client?.connected) {
        retry = window.setTimeout(trySub, 500);
        return;
      }

      // 채팅: 남이 보낸 것만 추가 (내 것은 전송 시 이미 찍음)
      subs.push(client.subscribe(`/topic/rooms/${room.room_id}/chat`, (msg) => {
        const d = JSON.parse(msg.body) as { userId: string; text: string };
        if (d.userId === myId) return;
        const who = idToNick(d.userId);
        pushChat({ kind: 'other', who, text: d.text, crown: who === gRef.current.princess });
      }));

      // 모션: 다른 유저의 조아리기를 그 유저 아바타에서 재생
      subs.push(client.subscribe(`/topic/rooms/${room.room_id}/motion`, (msg) => {
        const d = JSON.parse(msg.body) as { userId: string; action: string };
        if (d.userId === myId || d.action !== 'bow') return;
        playBow(idToNick(d.userId));
      }));

      // 입퇴장: 나간 유저의 아바타 즉시 제거 / 들어오면 명단 재조회
      subs.push(client.subscribe(`/topic/rooms/${room.room_id}`, (msg) => {
        const d = JSON.parse(msg.body) as { type: string; userId: string };
        if (d.type === 'LEAVE') {
          const gone = idToNick(d.userId);
          setAllNames((prev) => prev.filter((n) => n !== gone));
          pushChat({ kind: 'system', text: `${gone} 님이 연회장을 떠나셨사옵니다` });
        } else if (d.type === 'ENTER') {
          loadPlayers();
        }
      }));
    };
    trySub();

    return () => {
      subs.forEach((s) => s.unsubscribe());
      window.clearTimeout(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.room_id]);

  // 마우스 패럴랙스
  const onStageMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = worldRef.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(nx * 6).toFixed(2)}deg) rotateX(${(-ny * 3.5).toFixed(2)}deg)`;
  };
  const onStageLeave = () => {
    const el = worldRef.current;
    if (el) el.style.transform = 'rotateY(0deg) rotateX(0deg)';
  };

  const iAmPrincess = g.princess === nick;
  const awardsLeft = AWARDS_PER_ROUND - g.awardsThisRound; // 이번 라운드 남은 어점
  // 공주의 라이브 얼굴 소스: 내가 공주면 로컬 웹캠, 아니면 소켓으로 받은 원격 표정
  const princessFace = iAmPrincess ? faceParamsRef : (princessId ? faceRefFor(princessId) : null);
  // 신하의 얼굴 소스: 내 신하는 로컬 웹캠(지연 없음), 남의 신하는 원격 표정 스트림
  const servantFaceFor = (name: string): FaceParamsRef | undefined => {
    if (name === nick) return faceParamsRef;
    const id = nickToId(name);
    return id ? faceRefFor(id) : undefined; // 명단 로딩 전엔 idle
  };
  const low = g.secLeft <= 30;
  const mmss = `${Math.floor(Math.max(0, g.secLeft) / 60)}:${String(Math.max(0, g.secLeft) % 60).padStart(2, '0')}`;
  const servantNames = allNames.filter((n) => n !== g.princess);
  // 인원수 기반 상대 크기: 1명이면 크게, 늘어날수록 하단을 나눠 갖도록 축소
  // (공주 무대는 화면 중앙~상단이라 bottom 고정이면 겹치지 않음)
  const SERVANT_SCALES = [1.8, 1.45, 1.2, 1.0];
  const servantScale = SERVANT_SCALES[Math.min(servantNames.length, SERVANT_SCALES.length) - 1] ?? 0.85;
  const servants = servantNames.map((n, i, arr) => ({
    name: n,
    isMe: n === nick,
    score: g.scores[n] ?? 0,
    speaking: !!g.speaking[n] && !(n === nick && !g.micOn),
    muted: n === nick && !g.micOn,
    pos: {
      left: `${((i + 1) / (arr.length + 1)) * 100}%`, // 하단 폭을 인원수로 균등 분할
      bottom: '0%',
      z: 100,
      sc: servantScale,
    },
    delay: `${i * 0.9}s`,
  }));

  const { setMusicSrc } = useAudio();
  useEffect(() => {
    setMusicSrc('../../assets/bgm/bgm_gameplay1.mp3');
  }, [setMusicSrc]);  

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex' }}>
      {/* ─── 3D 무대 ─── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: "url('/assets/bg-gameplay.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(12,6,5,.42) 0%, rgba(12,6,5,.28) 40%, rgba(12,6,5,.6) 100%)',
          }}
        />

        {/* HUD */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 0', zIndex: 2 }}>
          {/* 공주 마이크 토글 (옥좌 3D에 묻히지 않게 화면 고정 HUD에 배치) */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            {iAmPrincess && (
              <MicButton micOn={g.micOn} onClick={() => setG((p) => ({ ...p, micOn: !p.micOn }))} />
            )}
          </div>
          <Pill>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: 'linear-gradient(180deg,#9c2027,#701318)',
                border: `1px solid ${GOLD(0.6)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f0dcae',
                fontFamily: "'Song Myung', serif",
                fontSize: 12,
              }}
            >
              宴
            </div>
            <span style={{ color: '#f0e2bf', fontSize: 14, letterSpacing: 1 }}>
              제{g.round}연 · {ROUND_HANJA[g.round - 1]}
            </span>
          </Pill>
          <Pill>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: low ? '#d8434b' : '#dfba6e',
                animation: 'glowPulse 1.6s ease infinite',
              }}
            />
            <span
              style={{
                color: low ? '#e8858c' : '#f0e2bf',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {mmss}
            </span>
          </Pill>
          {/* 라운드 전환은 서버(3분 타이머)가 담당 — 시연용 스킵 버튼 제거 */}
          <div style={{ flex: 1 }} />
        </div>

        {/* 원근 무대 */}
        <div
          onMouseMove={onStageMove}
          onMouseLeave={onStageLeave}
          style={{ position: 'relative', flex: 1, minHeight: 0, perspective: 1050, overflow: 'hidden' }}
        >
          <div
            ref={worldRef}
            style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transition: 'transform .3s ease-out' }}
          >
            {/* 뒷벽 */}
            <div
              style={{
                position: 'absolute',
                inset: '-14%',
                backgroundImage: "url('/assets/bg-gameplay.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                transform: 'translateZ(-420px) scale(1.7)',
                filter: 'brightness(.8) saturate(1.05)',
              }}
            />
            {/* 바닥 빛 웅덩이 */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '-16%',
                width: 1300,
                height: 520,
                transform: 'translateX(-50%) rotateX(74deg) translateZ(-80px)',
                background:
                  'radial-gradient(ellipse at center, rgba(240,205,120,.34) 0%, rgba(160,80,40,.1) 50%, transparent 74%)',
                pointerEvents: 'none',
              }}
            />
            {/* 기둥 원경/근경 */}
            <Column side="left" far />
            <Column side="right" far />
            <Column side="left" />
            <Column side="right" />
            {/* 등롱 */}
            <Lantern left="26%" delay="0s" />
            <Lantern left="calc(74% - 30px)" delay="1.2s" />

            {/* 병풍(옥좌 뒤 장식벽) */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '30%',
                transform: 'translateX(-50%) translateZ(-300px)',
                width: '58%',
                height: '64%',
                borderRadius: 6,
                border: `2px solid rgba(216,180,106,.45)`,
                background:
                  'radial-gradient(circle at 50% 40%, rgba(240,205,120,.3), transparent 56%), repeating-radial-gradient(circle at 50% 38%, rgba(216,180,106,.13) 0 16px, rgba(50,26,12,.14) 16px 32px), linear-gradient(180deg, #261307, #140904)',
                boxShadow: 'inset 0 0 70px rgba(0,0,0,.65), 0 0 50px rgba(0,0,0,.5)',
              }}
            />
            {/* 단상 + 계단 */}
            <Dais bottom="24%" width="58%" height="9%" z={-260} strong />
            <Dais bottom="19%" width="66%" height="5.5%" z={-250} />
            <Dais bottom="14%" width="74%" height="5.5%" z={-240} />
            <Dais bottom="9%" width="82%" height="5.5%" z={-230} />

            {/* 공주(버튜버) — 옥좌 위 */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '32%',
                transform: 'translateX(-50%) translateZ(-260px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 60,
                  width: 400,
                  height: 280,
                  background:
                    'radial-gradient(ellipse at center, rgba(240,205,120,.38) 0%, rgba(240,205,120,0) 62%)',
                  animation: 'glowPulse 4s ease infinite',
                }}
              />
              {princessFace ? (
                // 공주로 간택된 사람의 웹캠 얼굴이 실시간 반영되는 VRM 아바타
                // 병풍(옥좌 뒤 네모 박스) 규격에 맞게 크게 표시
                <VRMAvatar
                  faceParamsRef={princessFace}
                  style={{
                    position: 'relative',
                    width: 'min(58vh, 560px)',
                    height: 'min(48vh, 470px)',
                    animation: 'bob 6s ease-in-out infinite',
                    filter: 'drop-shadow(0 16px 34px rgba(0,0,0,.6))',
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                // 얼굴 소스가 없는 공주(현재는 봇)는 기존 정적 이미지로 표시
                <img
                  src="/assets/vtuber.png"
                  alt="공주 버튜버"
                  style={{
                    position: 'relative',
                    height: 'min(48vh, 470px)',
                    animation: 'bob 6s ease-in-out infinite',
                    filter: 'drop-shadow(0 16px 34px rgba(0,0,0,.6))',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <div
                style={{
                  width: 'min(260px, 30vw)',
                  height: 20,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,.55), transparent 68%)',
                  marginTop: -14,
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: -2,
                  pointerEvents: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: 'rgba(18,8,6,.85)',
                    border: `1px solid ${GOLD(0.65)}`,
                    boxShadow: `inset 0 0 0 3px rgba(18,8,6,.5), inset 0 0 0 4px ${GOLD(0.2)}, 0 10px 30px rgba(0,0,0,.5)`,
                    backdropFilter: 'blur(6px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: '#eed9a4', fontSize: 14 }}>♕</span>
                  <span style={{ color: '#f0e2bf', fontSize: 14.5, fontWeight: 700, letterSpacing: 2 }}>
                    공주 · {g.princess}
                  </span>
                  <span style={{ color: 'rgba(238,217,164,.5)', fontSize: 11.5 }}>公主</span>
                </div>
                {iAmPrincess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'rgba(200,50,58,.22)',
                        border: '1px solid rgba(216,67,75,.55)',
                        color: '#f2c7ca',
                        fontSize: 11.5,
                        letterSpacing: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      그대가 공주이옵니다 — 어점(御點)을 하사하소서 · 남은 어점 {Math.max(0, awardsLeft)}/{AWARDS_PER_ROUND}
                    </div>
                    <BowButton disabled />
                  </div>
                )}
              </div>
            </div>

            {/* 신하들 */}
            {servants.map((p) => (
              <div
                key={p.name}
                style={{
                  position: 'absolute',
                  left: p.pos.left,
                  bottom: p.pos.bottom,
                  transform: `translate(-50%, 0) translateZ(${p.pos.z}px) scale(${p.pos.sc})`,
                  transformOrigin: '50% 100%', // 발밑 기준으로 확대 → 커져도 바닥 아래로 안 잘림

                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {/* 절할 때 뜨는 대사 말풍선 (현재는 내 신하만 절 가능 → p.isMe)
                    TODO(멀티플레이): 원격 신하 절 이벤트도 각자 말풍선으로 표시 */}
                {bowingWho[p.name] && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 10,
                      zIndex: 6,
                      animation: 'fadeIn .2s ease both',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        maxWidth: 132,
                        textAlign: 'center',
                        lineHeight: 1.35,
                        background: 'rgba(18,8,6,.92)',
                        border: `1px solid ${GOLD(0.6)}`,
                        borderRadius: 10,
                        padding: '7px 13px',
                        color: '#f0e2bf',
                        fontSize: 12.5,
                        letterSpacing: 0.5,
                        boxShadow: `inset 0 0 0 2px rgba(18,8,6,.5), inset 0 0 0 3px ${GOLD(0.18)}, 0 8px 20px rgba(0,0,0,.55)`,
                      }}
                    >
                      소인 죽여주시옵소서...!!!
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: `7px solid ${GOLD(0.6)}`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <ServantFigure glow={p.isMe} delay={p.delay} motionRef={motionRefFor(p.name)} faceParamsRef={servantFaceFor(p.name)} />
                <div
                  style={{
                    width: 112,
                    height: 20,
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,.55), transparent 68%)',
                    marginTop: -14,
                  }}
                />
              </div>
            ))}

            {/* 우측 컨트롤 패널 — 아바타에 가려지지 않게 무대 오른쪽에 세로 스택으로 고정.
                공주: 유저별 어점 하사 박스(위→아래) / 신하: 내 마이크·조아리기(위→아래) */}
            <div
              style={{
                position: 'absolute',
                top: 76,
                right: 12,
                bottom: 12,
                zIndex: 150,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 10,
                overflowY: 'auto',
                pointerEvents: 'none', // 빈 영역은 무대 클릭 통과, 박스만 조작 가능
              }}
            >
              {servants.map((p) => (
                <div
                  key={`hud-${p.name}`}
                  style={{
                    pointerEvents: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 9,
                    background: 'rgba(18,8,6,.88)',
                    border: `1px solid ${p.isMe ? GOLD(0.8) : GOLD(0.35)}`,
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 8px 22px rgba(0,0,0,.45)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#f0e2bf', fontSize: 13, fontWeight: 600 }}>
                      {p.name}{' '}
                      {p.isMe && <span style={{ color: 'rgba(238,217,164,.55)', fontSize: 11 }}>(나)</span>}
                    </span>
                    {p.speaking && <SpeakingBars />}
                    {p.muted && <span style={{ color: '#e8858c', fontSize: 10 }}>✕</span>}
                    <span style={{ color: '#eed9a4', fontSize: 12, marginLeft: 'auto' }}>✦ {p.score}</span>
                  </div>
                  {iAmPrincess && !p.isMe && (
                    <button
                      onClick={() => award(p.name)}
                      disabled={awardsLeft <= 0}
                      title={awardsLeft <= 0 ? '이번 라운드 어점을 모두 하사하셨사옵니다' : undefined}
                      style={{
                        ...primaryBtn,
                        padding: '6px 11px',
                        borderRadius: 7,
                        fontSize: 11.5,
                        letterSpacing: 1,
                        opacity: awardsLeft <= 0 ? 0.4 : 1,
                        cursor: awardsLeft <= 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✦ 어점 하사
                    </button>
                  )}
                  {p.isMe && !iAmPrincess && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <MicButton micOn={g.micOn} onClick={() => setG((prev) => ({ ...prev, micOn: !prev.micOn }))} />
                      <BowButton onClick={triggerBow} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 용안 근경(표정 동기화) */}
          <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 3, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: '50%',
                border: `2px solid ${GOLD(0.7)}`,
                boxShadow: '0 8px 26px rgba(0,0,0,.55), inset 0 0 0 3px rgba(18,8,6,.6)',
                background: '#2a130c',
                overflow: 'hidden',
              }}
            >
              {/* 라이브 웹캠 셀피 — 이 뷰가 카메라를 켜고 얼굴 파라미터를 갱신한다(옥좌 아바타 구동) */}
              <WebcamView
                faceParamsRef={faceParamsRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: 'rgba(18,8,6,.75)',
                  border: `1px solid ${GOLD(0.45)}`,
                  color: '#f0e2bf',
                  fontSize: 11.5,
                  letterSpacing: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                용안(龍顔) 근경
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(18,8,6,.6)',
                  border: `1px solid ${GOLD(0.25)}`,
                  color: 'rgba(240,226,191,.55)',
                  fontSize: 10.5,
                  whiteSpace: 'nowrap',
                }}
              >
                ◉ 표정 실시간 동기화
              </span>
            </div>
          </div>
        </div>

        {/* 간택 연출 */}
        {g.interstitial && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8,3,2,.82)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              animation: 'fadeIn .4s ease both',
              zIndex: 5,
            }}
          >
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `2px dashed ${GOLD(0.55)}`,
                  animation: 'spinSlow 7s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 14,
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg,#9c2027,#701318)',
                  border: `1px solid ${GOLD(0.7)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f0dcae',
                  fontFamily: "'Song Myung', serif",
                  fontSize: 34,
                }}
              >
                擇
              </div>
            </div>
            <div style={{ color: '#f0e2bf', fontSize: 19, letterSpacing: 4 }}>다음 공주를 간택하는 중이옵니다…</div>
            <div style={{ color: 'rgba(240,226,191,.55)', fontSize: 13, letterSpacing: 1 }}>
              어점을 가장 많이 받은 이가 옥좌에 오르옵니다
            </div>
          </div>
        )}
      </div>

      {/* ─── 어전 대화 ─── */}
      <div
        style={{
          width: 352,
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(16,7,5,.94)',
          borderLeft: `1px solid ${GOLD(0.4)}`,
        }}
      >
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: "'Song Myung', serif", fontSize: 21, color: '#eed9a4', letterSpacing: 3 }}>
              어전 대화
            </div>
            <div style={{ color: 'rgba(238,217,164,.5)', fontSize: 12 }}>御前對話</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 4px' }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD(0.4)})` }} />
            <div style={{ width: 6, height: 6, background: GOLD(0.6), transform: 'rotate(45deg)' }} />
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD(0.4)}, transparent)` }} />
          </div>
        </div>
        <div
          ref={chatRef}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {g.chat.map((m, i) => (
            <ChatBubble key={i} msg={m} />
          ))}
        </div>
        <div
          style={{
            padding: '14px 16px 16px',
            borderTop: `1px solid ${GOLD(0.25)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // 한글 IME 조합 중의 Enter는 무시 — 조합 확정 Enter가 핸들러를 한 번 더
                // 발화시켜 마지막 글자("안녕"→"녕")가 별도 메시지로 전송되는 버그 방지
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') sendChat();
              }}
              placeholder="말을 아뢰시오…"
              style={{
                flex: 1,
                background: 'rgba(12,5,4,.6)',
                border: `1px solid ${GOLD(0.4)}`,
                borderRadius: 8,
                padding: '11px 13px',
                color: '#f5e9cf',
                fontSize: 13.5,
              }}
            />
            <button onClick={sendChat} style={{ ...primaryBtn, flex: 'none', width: 44, fontSize: 16 }}>
              ➤
            </button>
          </div>
          <button
            onClick={async () => {
              // 서버에 이탈을 알려야 남은 유저 화면에서 내 아바타가 즉시 사라진다
              // (소켓 leave → 서버가 LEAVE 방송 + 게임 이탈 처리 + 공주였다면 라운드 전환)
              finishedRef.current = true;
              const client = getStomp();
              if (client?.connected) {
                client.publish({ destination: `/app/rooms/${room.room_id}/leave` });
              }
              await leaveRoom('', room.room_id).catch(() => {});
              onExit();
            }}
            style={{
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${GOLD(0.35)}`,
              background: 'transparent',
              color: 'rgba(240,226,191,.65)',
              fontSize: 13,
              letterSpacing: 2,
              cursor: 'pointer',
            }}
          >
            연회 파하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── 보조 컴포넌트 ───────────────── */

function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 16px',
        borderRadius: 999,
        background: 'rgba(18,8,6,.72)',
        border: `1px solid ${GOLD(0.5)}`,
        backdropFilter: 'blur(6px)',
      }}
    >
      {children}
    </div>
  );
}

/** 엎드리기 버튼 — 신하만 활성, 공주는 비활성 */
function BowButton({ disabled = false, onClick }: { disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? '공주는 엎드리지 않사옵니다' : '공주마마께 큰절을 올리옵니다'}
      style={{
        padding: '4px 11px',
        borderRadius: 999,
        border: `1px solid ${GOLD(disabled ? 0.18 : 0.45)}`,
        background: 'rgba(12,5,4,.6)',
        color: disabled ? 'rgba(240,226,191,.3)' : '#f0e2bf',
        fontSize: 11,
        letterSpacing: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      조아리기
    </button>
  );
}

function MicButton({ micOn, onClick }: { micOn: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 11px',
        borderRadius: 999,
        border: `1px solid ${GOLD(0.45)}`,
        background: 'rgba(12,5,4,.6)',
        color: micOn ? '#f0e2bf' : '#e8858c',
        fontSize: 11,
        letterSpacing: 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {micOn ? '마이크 켬' : '마이크 끔'}
    </button>
  );
}

/** 붉은 기둥 (far: 원경 / 기본: 화면 가장자리 근경) */
function Column({ side, far = false }: { side: 'left' | 'right'; far?: boolean }) {
  const base: CSSProperties = far
    ? {
        position: 'absolute',
        top: '-12%',
        bottom: '-6%',
        [side]: '10%',
        width: 52,
        transform: 'translateZ(-240px)',
        background:
          side === 'left'
            ? 'linear-gradient(90deg, #380c0b, #8e241f 42%, #5a1512 70%, #2a0807)'
            : 'linear-gradient(90deg, #2a0807, #5a1512 30%, #8e241f 58%, #380c0b)',
        boxShadow: '0 0 30px rgba(0,0,0,.5)',
      }
    : {
        position: 'absolute',
        top: '-14%',
        bottom: '-10%',
        [side]: '-1%',
        width: 96,
        transform: 'translateZ(60px)',
        background:
          side === 'left'
            ? 'linear-gradient(90deg, #240605, #571311 40%, #7c1d18 60%, #1c0504)'
            : 'linear-gradient(90deg, #1c0504, #7c1d18 40%, #571311 60%, #240605)',
        boxShadow: '0 0 40px rgba(0,0,0,.65)',
      };
  return (
    <div style={base}>
      {far && (
        <>
          <div
            style={{
              position: 'absolute',
              left: -8,
              right: -8,
              top: '6%',
              height: 16,
              background: 'linear-gradient(180deg, #b98d4a, #6e4d1e)',
              borderRadius: 3,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -6,
              right: -6,
              bottom: '4%',
              height: 22,
              background: 'linear-gradient(180deg, #7c5a26, #3f2a0f)',
              borderRadius: 3,
            }}
          />
        </>
      )}
    </div>
  );
}

function Lantern({ left, delay }: { left: string; delay: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left,
        transform: 'translateZ(-180px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ width: 1, height: 34, background: GOLD(0.5) }} />
      <div
        style={{
          width: 30,
          height: 38,
          borderRadius: '46%',
          background: 'radial-gradient(circle at 50% 38%, #ffe3a1, #e8a04c 55%, #b04f22)',
          border: `1px solid ${GOLD(0.8)}`,
          boxShadow: '0 0 34px 10px rgba(255,190,100,.35)',
          animation: `glowPulse 3.4s ease ${delay} infinite`,
        }}
      />
      <div style={{ width: 2, height: 14, background: '#a4232b' }} />
    </div>
  );
}

/** 단상/계단 판 */
function Dais({
  bottom,
  width,
  height,
  z,
  strong = false,
}: {
  bottom: string;
  width: string;
  height: string;
  z: number;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom,
        transform: `translateX(-50%) translateZ(${z}px)`,
        width,
        height,
        background: strong
          ? 'linear-gradient(180deg, #3c2513, #1c0f06)'
          : 'linear-gradient(180deg, #2c1a0d, #170c05)',
        borderTop: `${strong ? 3 : 2}px solid rgba(216,180,106,${strong ? 0.55 : 0.35})`,
        borderBottom: strong ? '1px solid rgba(216,180,106,.25)' : undefined,
        boxShadow: strong ? '0 12px 34px rgba(0,0,0,.55)' : undefined,
      }}
    />
  );
}

/** 신하 아바타 — gnome.vrm 전신 렌더 (기존 CSS 실루엣 대체, sway·glow 연출 유지)
 *  motionRef: 엎드리기 등 모션 트리거
 *  faceParamsRef: 해당 유저의 얼굴 소스 (내 신하=로컬 웹캠, 남의 신하=원격 스트림)
 *  TODO(멀티플레이): 유저별 커스텀 VRM을 쓰게 되면 modelSrc를 플레이어 정보에서 받아온다. */
function ServantFigure({ glow, delay, motionRef, faceParamsRef }: {
  glow: boolean;
  delay: string;
  motionRef?: AvatarMotionRef;
  faceParamsRef?: FaceParamsRef;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: 96,
        height: 148,
        animation: `sway 5.2s ease-in-out ${delay} infinite`,
        filter: glow
          ? 'drop-shadow(0 0 12px rgba(240,205,120,.45))'
          : 'drop-shadow(0 8px 14px rgba(0,0,0,.45))',
      }}
    >
      <VRMAvatar
        modelSrc="/servant.vrm"
        frame="full"
        poseArmsDown={false} // 이미 팔이 포즈된 스캔 흉상 → T-pose 팔 내리기 보정 끔(뚱뚱 방지)
        motionRef={motionRef}
        faceParamsRef={faceParamsRef}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  );
}

function ChatBubble({ msg: m }: { msg: ChatMsg }) {
  if (m.kind === 'system') {
    return (
      <div style={{ textAlign: 'center', color: 'rgba(238,217,164,.68)', fontSize: 12, letterSpacing: 1, padding: '2px 0' }}>
        — {m.text} —
      </div>
    );
  }
  const self = m.kind === 'self';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: self ? 'flex-end' : 'flex-start', gap: 3 }}>
      <div style={{ color: 'rgba(238,217,164,.6)', fontSize: 11.5 }}>
        {m.who}
        {m.crown && <span style={{ color: 'rgba(238,217,164,.4)' }}> ♕</span>}
      </div>
      <div
        style={{
          maxWidth: '85%',
          background: self ? 'linear-gradient(180deg,#8d1e27,#671116)' : 'rgba(34,15,11,.9)',
          border: `1px solid ${self ? GOLD(0.5) : GOLD(0.3)}`,
          color: self ? '#f7ecd2' : '#efe3c8',
          padding: '9px 13px',
          borderRadius: self ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
          fontSize: 13.5,
          lineHeight: 1.55,
        }}
      >
        {m.text}
      </div>
    </div>
  );
}
