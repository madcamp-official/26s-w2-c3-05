package com.example.demo.room.controller;

import com.example.demo.room.dto.FaceBroadcast;
import com.example.demo.room.dto.RoomEvent;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller // @RestController 아님! (HTTP가 아니라 STOMP 메시지 처리)
public class RoomSocketController {

    // 클라가 /app/rooms/3/enter 로 보내면 → /topic/rooms/3 구독자 전원에게 방송
    @MessageMapping("/rooms/{roomId}/enter")
    @SendTo("/topic/rooms/{roomId}")
    public RoomEvent enter(@DestinationVariable Integer roomId, Principal principal) {
        return RoomEvent.enter(principal.getName()); // principal = ②에서 setUser한 그 유저
    }

    @MessageMapping("/rooms/{roomId}/leave")
    @SendTo("/topic/rooms/{roomId}")
    public RoomEvent leave(@DestinationVariable Integer roomId, Principal principal) {
        return RoomEvent.leave(principal.getName());
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
}