import { useEffect, useRef } from 'react';
import type { StompSubscription } from '@stomp/stompjs';
import { getStomp } from '../../../lib/stompClient';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // 무료 공개 TURN — 서로 다른 네트워크(엄격한 NAT)에서도 연결되도록 중계 경로 확보
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

/**
 * 방 음성 채팅 — WebRTC 메시(유저 간 직접 연결) + STOMP 시그널링.
 *
 * - 음성 데이터는 P2P로 흘러 서버 부하가 없다 (서버는 offer/answer/ice 중계만)
 * - 연결 규칙: 두 유저 중 userId가 사전순으로 "작은" 쪽이 offer를 보낸다 (glare 방지)
 * - peerIds가 바뀌면(입장/퇴장) 연결을 자동 생성/정리
 * - micEnabled=false면 내 오디오 트랙만 끈다 (연결은 유지 → 재협상 불필요)
 */
export function useVoiceChat(roomId: number, myId: string, peerIds: string[], micEnabled: boolean) {
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const audios = useRef<Record<string, HTMLAudioElement>>({});
  // remoteDescription 설정 전에 도착한 ICE 후보 대기열 (버리면 연결이 실패할 수 있음)
  const pendingIce = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localStream = useRef<MediaStream | null>(null);
  const streamReady = useRef(false);

  const micRef = useRef(micEnabled);
  micRef.current = micEnabled;
  const peersRef = useRef(peerIds);
  peersRef.current = peerIds;

  const send = (to: string, type: string, payload: unknown) => {
    const client = getStomp();
    if (client?.connected) {
      client.publish({
        destination: `/app/rooms/${roomId}/rtc`,
        body: JSON.stringify({ to, type, payload: JSON.stringify(payload ?? {}) }),
      });
    }
  };

  const closePeer = (peer: string) => {
    pcs.current[peer]?.close();
    delete pcs.current[peer];
    const a = audios.current[peer];
    if (a) {
      a.srcObject = null;
      a.remove();
      delete audios.current[peer];
    }
  };

  const getPc = (peer: string): RTCPeerConnection => {
    let pc = pcs.current[peer];
    if (pc) return pc;
    pc = new RTCPeerConnection(RTC_CONFIG);
    pcs.current[peer] = pc;

    // 내 마이크 트랙 태우기 (거부됐으면 듣기 전용으로 동작)
    localStream.current?.getTracks().forEach((t) => pc!.addTrack(t, localStream.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) send(peer, 'ice', e.candidate.toJSON());
    };
    // 현장 디버깅용: 연결 상태를 콘솔에 남긴다 (connected가 안 뜨면 NAT/TURN 문제)
    pc.onconnectionstatechange = () =>
      console.log(`[voice] ${peer}: ${pc!.connectionState}`);
    // 상대 음성 도착 → 숨은 <audio>로 재생
    pc.ontrack = (e) => {
      let a = audios.current[peer];
      if (!a) {
        a = new Audio();
        a.autoplay = true;
        audios.current[peer] = a;
      }
      a.srcObject = e.streams[0];
      a.play().catch(() => {}); // 자동재생 제한 시 다음 상호작용에서 재생됨
    };
    return pc;
  };

  const offerTo = async (peer: string) => {
    const pc = getPc(peer);
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    send(peer, 'offer', offer);
  };

  // ① 마이크 획득 (마운트 1회) → 완료 후 연결 시작
  useEffect(() => {
    let alive = true;
    const startCalls = () => {
      streamReady.current = true;
      peersRef.current.forEach((peer) => {
        // 핵심: 이미 연결이 있어도 "다시" 협상한다.
        // 마이크 권한이 상대보다 늦게 떨어지면 트랙 없는 연결이 먼저 성립하는데,
        // 그 위에 addTrack만 하고 재협상을 안 하면 내 목소리가 영영 전송되지 않는다.
        if (myId < peer) offerTo(peer).catch(() => {});      // caller: (재)offer
        else send(peer, 'need-offer', {});                    // answerer: 재협상 요청
      });
    };
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        if (!alive) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream.current = s;
        s.getAudioTracks().forEach((t) => (t.enabled = micRef.current));
        // 이미 생성된 연결에도 트랙 추가 (offer보다 마이크가 늦게 준비된 경우)
        Object.values(pcs.current).forEach((pc) => s.getTracks().forEach((t) => pc.addTrack(t, s)));
        startCalls();
      })
      .catch(() => startCalls()); // 마이크 거부 → 듣기 전용

    return () => {
      alive = false;
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      Object.keys(pcs.current).forEach(closePeer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myId]);

  // ② 시그널 수신 (offer/answer/ice/need-offer)
  useEffect(() => {
    let sub: StompSubscription | undefined;
    let retry: number | undefined;
    const trySub = () => {
      const client = getStomp();
      if (!client?.connected) {
        retry = window.setTimeout(trySub, 500);
        return;
      }
      sub = client.subscribe(`/topic/rooms/${roomId}/rtc`, async (m) => {
        const d = JSON.parse(m.body) as { from: string; to: string; type: string; payload: string };
        if (d.to !== myId || d.from === myId) return;
        try {
          if (d.type === 'need-offer') {
            if (myId < d.from) await offerTo(d.from); // caller만 재-offer (glare 방지)
            return;
          }
          const pc = getPc(d.from);
          const flushIce = async () => {
            const queued = pendingIce.current[d.from] ?? [];
            pendingIce.current[d.from] = [];
            for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
          };
          if (d.type === 'offer') {
            await pc.setRemoteDescription(JSON.parse(d.payload));
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send(d.from, 'answer', answer);
          } else if (d.type === 'answer') {
            await pc.setRemoteDescription(JSON.parse(d.payload));
            await flushIce();
          } else if (d.type === 'ice') {
            const cand = JSON.parse(d.payload) as RTCIceCandidateInit;
            if (pc.remoteDescription) await pc.addIceCandidate(cand);
            else (pendingIce.current[d.from] ??= []).push(cand); // 아직이면 대기열로
          }
        } catch {
          // 시그널 순서 꼬임 등은 이후 need-offer/재협상으로 회복되는 경우가 많아 무시
        }
      });
    };
    trySub();
    return () => {
      sub?.unsubscribe();
      window.clearTimeout(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myId]);

  // ③ 명단 변화: 새 피어 연결, 떠난 피어 정리
  useEffect(() => {
    if (!streamReady.current) return;
    peerIds.forEach((peer) => {
      if (myId < peer && !pcs.current[peer]) offerTo(peer).catch(() => {});
    });
    Object.keys(pcs.current).forEach((peer) => {
      if (!peerIds.includes(peer)) closePeer(peer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerIds.join(','), myId]);

  // ④ 마이크 on/off — 트랙 enable만 토글 (즉시 반영, 연결 유지)
  useEffect(() => {
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
  }, [micEnabled]);
}
