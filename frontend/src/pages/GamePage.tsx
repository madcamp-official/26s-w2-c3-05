import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { ChatMsg, Room, Scores } from '../types/game';
import { ROUND_HANJA, ROUND_SECONDS, TOTAL_ROUNDS } from '../constants/game';
import { getPlayers } from '../App';
import { useGameChannel, type GameEventMsg } from '../features/game/hooks/useGameChannel';
import { useLaughSender } from '../features/game/hooks/useLaughSender';
import { GOLD, SpeakingBars, primaryBtn } from '../components/ui';
import { VRMAvatar, type AvatarMotion, type AvatarMotionRef } from '../features/face/components/VRMAvatar';
import { WebcamView } from '../features/face/components/WebcamView';
import { initialFaceParams, type FaceParams, type FaceParamsRef } from '../features/face/types';

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

/** 신하(관객) 배치: 화면 하단에서 옥좌를 향해 도열 */
const POS = [
  { left: '12%', bottom: '0%', z: 120, sc: 0.95 },
  { left: '35%', bottom: '5%', z: 50, sc: 0.84 },
  { left: '65%', bottom: '5%', z: 50, sc: 0.84 },
  { left: '88%', bottom: '0%', z: 120, sc: 0.95 },
];

export default function GamePage({ nick, room, firstEvent, onFinish }: {
  nick: string;
  room: Room;
  firstEvent: GameEventMsg;   // 대기방에서 받은 1라운드 시작 정보
  onFinish: (scores: Scores) => void;
}) {
  const [g, setG] = useState<GameState>(() => ({
    round: 1,
    secLeft: ROUND_SECONDS,
    princess: '',               // 서버 ROUND_START가 채운다
    scores: { [nick]: 0 },
    speaking: {},
    micOn: true,
    interstitial: false,
    awardsThisRound: 0,
    chat: [{ kind: 'system', text: '제1연(第一宴)이 개막하였사옵니다' }],
  }));
  const [draft, setDraft] = useState('');

  const gRef = useRef(g);
  gRef.current = g;
  const timers = useRef<number[]>([]);
  const worldRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  // 얼굴 트래킹: 로컬 사용자의 웹캠 → faceParamsRef → VRM 아바타(표정·머리회전)
  const faceParamsRef = useRef<FaceParams>(initialFaceParams);

  // 엎드리기 모션 트리거: 버튼 → myBowRef → 내 신하 아바타 렌더 루프
  // TODO(멀티플레이): 서버 중계로 다른 유저의 엎드리기도 각자의 motionRef에 매핑한다.
  const myBowRef = useRef<AvatarMotion>({ action: null });

  // 절할 때 뜨는 대사 말풍선 노출 상태 (내 신하 기준)
  const [bowSpeaking, setBowSpeaking] = useState(false);
  const bowSpeechTimer = useRef<number | undefined>(undefined);
  // 엎드리기: 아바타 모션 + '소인 죽을죄를…' 말풍선을 함께 띄운다
  const triggerBow = () => {
    myBowRef.current.action = 'bow';
    setBowSpeaking(true);
    window.clearTimeout(bowSpeechTimer.current);
    bowSpeechTimer.current = window.setTimeout(() => setBowSpeaking(false), 2000);
  };
  useEffect(() => () => window.clearTimeout(bowSpeechTimer.current), []);

  // 공주로 간택된 플레이어의 얼굴 소스를 반환한다.
  // 현재는 로컬 사용자(nick)만 웹캠 소스를 가지므로, 내가 공주일 때만 라이브 아바타가 뜬다.
  // TODO(멀티플레이): 하인 역할의 실제 유저들이 참여하면, 원격 유저별 FaceParamsRef를
  //   여기에 매핑해 "그 라운드에 공주로 간택된 유저"의 얼굴로 동기화되게 확장한다.
  const faceSourceFor = (player: string): FaceParamsRef | null =>
    player === nick ? faceParamsRef : null;

  // 서버 이벤트는 userId 기준, UI는 닉네임 기준 → 경계에서 변환한다
  const playersRef = useRef<Record<string, string>>({}); // userId → nickname
  const [allNames, setAllNames] = useState<string[]>([nick]);
  const allNamesRef = useRef(allNames);
  allNamesRef.current = allNames;

  useEffect(() => {
    getPlayers(room.room_id)
      .then((list) => {
        playersRef.current = Object.fromEntries(list.map((p) => [p.user_id, p.nickname]));
        setAllNames(list.map((p) => p.nickname));
      })
      .catch(() => {});
  }, [room.room_id]);

  const idToNick = (id?: string) => (id && playersRef.current[id]) || id || '';
  const scoresToNick = (s?: Record<string, number>): Scores =>
    Object.fromEntries(Object.entries(s ?? {}).map(([id, v]) => [idToNick(id), v]));

  const pushChat = (msg: ChatMsg) =>
    setG((prev) => ({ ...prev, chat: [...prev.chat, msg].slice(-80) }));

  const award = (target: string) => {
    // 라운드당 어점 한도 초과 시 무시 (공주·봇 공통)
    if (gRef.current.awardsThisRound >= AWARDS_PER_ROUND) return;
    setG((prev) => ({
      ...prev,
      scores: { ...prev.scores, [target]: (prev.scores[target] ?? 0) + 1 },
      awardsThisRound: prev.awardsThisRound + 1,
    }));
    pushChat({ kind: 'system', text: `공주께서 ${target} 님에게 어점(御點)을 하사하셨사옵니다 ✦` });
  };

  // 서버 게임 이벤트 → 로컬 상태 반영 (라운드 전환·점수·종료는 전부 서버가 결정)
  const applyEvent = (ev: GameEventMsg) => {
    if (ev.type === 'ROUND_START') {
      setG((prev) => ({
        ...prev,
        round: ev.round ?? prev.round,
        princess: idToNick(ev.princessId),
        secLeft: ROUND_SECONDS,
        interstitial: false,
        awardsThisRound: 0,
      }));
      pushChat({
        kind: 'system',
        text: `제${ev.round}연 개막 — ${idToNick(ev.princessId)} 님이 공주로 간택되셨사옵니다 ♕`,
      });
      if (ev.topicHead) pushChat({ kind: 'system', text: `이번 연회의 주제: 「${ev.topicHead}」` });
    } else if (ev.type === 'LAUGH') {
      setG((prev) => ({ ...prev, scores: scoresToNick(ev.scores) }));
      pushChat({ kind: 'system', text: '공주께서 웃음을 터뜨리셨사옵니다! 하인들에게 어점이 내려졌사옵니다 ✦' });
    } else if (ev.type === 'ROUND_END') {
      setG((prev) => ({ ...prev, interstitial: true, secLeft: 0, scores: scoresToNick(ev.scores) }));
    } else if (ev.type === 'GAME_END') {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish(scoresToNick(ev.scores));
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
    pushChat({ kind: 'self', who: nick, text: t });
    setDraft('');
  };

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
  const princessFace = faceSourceFor(g.princess); // 공주의 라이브 얼굴 소스(없으면 정적 이미지)
  const low = g.secLeft <= 30;
  const mmss = `${Math.floor(Math.max(0, g.secLeft) / 60)}:${String(Math.max(0, g.secLeft) % 60).padStart(2, '0')}`;
  const servants = allNames
    .filter((n) => n !== g.princess)
    .map((n, i) => ({
      name: n,
      isMe: n === nick,
      score: g.scores[n] ?? 0,
      speaking: !!g.speaking[n] && !(n === nick && !g.micOn),
      muted: n === nick && !g.micOn,
      pos: POS[i % POS.length],
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {/* 절할 때 뜨는 대사 말풍선 (현재는 내 신하만 절 가능 → p.isMe)
                    TODO(멀티플레이): 원격 신하 절 이벤트도 각자 말풍선으로 표시 */}
                {p.isMe && bowSpeaking && (
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 11px',
                    borderRadius: 9,
                    background: 'rgba(18,8,6,.85)',
                    border: `1px solid ${p.isMe ? GOLD(0.8) : GOLD(0.35)}`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#f0e2bf', fontSize: 13, fontWeight: 600 }}>
                      {p.name}{' '}
                      {p.isMe && <span style={{ color: 'rgba(238,217,164,.55)', fontSize: 11 }}>(나)</span>}
                    </span>
                    {p.speaking && <SpeakingBars />}
                    {p.muted && <span style={{ color: '#e8858c', fontSize: 10 }}>✕</span>}
                    <span style={{ color: '#eed9a4', fontSize: 12 }}>✦ {p.score}</span>
                  </div>
                  {iAmPrincess && !p.isMe && (
                    <button
                      onClick={() => award(p.name)}
                      disabled={awardsLeft <= 0}
                      title={awardsLeft <= 0 ? '이번 라운드 어점을 모두 하사하셨사옵니다' : undefined}
                      style={{
                        ...primaryBtn,
                        padding: '5px 11px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MicButton micOn={g.micOn} onClick={() => setG((prev) => ({ ...prev, micOn: !prev.micOn }))} />
                      <BowButton onClick={triggerBow} />
                    </div>
                  )}
                </div>
                <ServantFigure glow={p.isMe} delay={p.delay} motionRef={p.isMe ? myBowRef : undefined} />
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
            onClick={() => {
              finishedRef.current = true;
              onFinish(gRef.current.scores);
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
 *  motionRef: 엎드리기 등 모션 트리거 (내 신하에만 연결)
 *  TODO(멀티플레이): 유저별 커스텀 VRM을 쓰게 되면 modelSrc를 플레이어 정보에서 받아온다. */
function ServantFigure({ glow, delay, motionRef }: { glow: boolean; delay: string; motionRef?: AvatarMotionRef }) {
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
