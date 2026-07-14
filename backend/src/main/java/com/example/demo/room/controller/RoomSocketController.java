package com.example.demo.room.controller;

import com.example.demo.room.dto.ChatBroadcast;
import com.example.demo.room.dto.FaceBroadcast;
import com.example.demo.room.dto.MotionBroadcast;
import com.example.demo.room.dto.RoomEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@RequiredArgsConstructor
@Controller // @RestController 아님! (HTTP가 아니라 STOMP 메시지 처리)
public class RoomSocketController {

    private final com.example.demo.room.game.GameManager gameManager;

    // 클라가 /app/rooms/3/enter 로 보내면 → /topic/rooms/3 구독자 전원에게 방송
    @MessageMapping("/rooms/{roomId}/enter")
    @SendTo("/topic/rooms/{roomId}")
    public RoomEvent enter(@DestinationVariable Integer roomId, Principal principal) {
        return RoomEvent.enter(principal.getName()); // principal = ②에서 setUser한 그 유저
    }

    @MessageMapping("/rooms/{roomId}/leave")
    @SendTo("/topic/rooms/{roomId}")
    public RoomEvent leave(@DestinationVariable Integer roomId, Principal principal) {
        gameManager.handlePlayerLeave(roomId, principal.getName()); // 게임 중이면 이탈 처리
        return RoomEvent.leave(principal.getName());
    }

    // 아바타 모션(조아리기 등) 중계: /app/rooms/3/motion {action} → /topic/rooms/3/motion
    @MessageMapping("/rooms/{roomId}/motion")
    @SendTo("/topic/rooms/{roomId}/motion")
    public MotionBroadcast motion(@DestinationVariable Integer roomId,
                                  MotionBroadcast.MotionPayload payload,
                                  Principal principal) {
        return new MotionBroadcast(principal.getName(), payload.action());
    }

    // 의도: REST로 방에 join한 뒤, 클라이언트가 소켓으로
    // "나 들어왔어"를 알리면 같은 방 구독자 모두에게 뿌려주는 것.
    // 반환값이 곧 방송 페이로드입니다(JSON 자동 직렬화).
    // 6b에선 여기에 FaceParams 중계가 추가됩니다.

    // 표정 스트림 중계: /app/rooms/3/face → /topic/rooms/3/face
    // DB 안 거치는 순수 릴레이 (초당 수십 회 와도 부담 없음)
    @MessageMapping("/rooms/{roomId}/face")
    @SendTo("/topic/rooms/{roomId}/face")
    public FaceBroadcast face(@DestinationVariable Integer roomId,
                              FaceBroadcast.FacePayload payload,
                              Principal principal) {
        return new FaceBroadcast(principal.getName(), payload);
    }

    // 게임 채팅 중계: /app/rooms/3/chat {text} → /topic/rooms/3/chat {userId, text}
    // face와 같은 순수 릴레이 — 보낸이는 서버가 세션에서 확정 (남 이름 위장 불가)
    @MessageMapping("/rooms/{roomId}/chat")
    @SendTo("/topic/rooms/{roomId}/chat")
    public ChatBroadcast chat(@DestinationVariable Integer roomId,
                              ChatBroadcast.ChatText payload,
                              Principal principal) {
        return new ChatBroadcast(principal.getName(), payload.text());
    }

    // 방장이 게임 시작
    @MessageMapping("/rooms/{roomId}/start")
    public void start(@DestinationVariable Integer roomId, Principal principal) {
        gameManager.startGame(roomId, principal.getName());
    }

    // 공주가 웃었다고 알림
    @MessageMapping("/rooms/{roomId}/laugh")
    public void laugh(@DestinationVariable Integer roomId, Principal principal) {
        gameManager.handleLaugh(roomId, principal.getName());
    }

    // 어점 하사 페이로드
    public record AwardRequest(String targetId) {}

    // 공주의 어점 하사: 검증·점수 반영·방송은 GameManager가 담당
    @MessageMapping("/rooms/{roomId}/award")
    public void award(@DestinationVariable Integer roomId,
                      AwardRequest payload,
                      Principal principal) {
        gameManager.handleAward(roomId, principal.getName(), payload.targetId());
    }
}