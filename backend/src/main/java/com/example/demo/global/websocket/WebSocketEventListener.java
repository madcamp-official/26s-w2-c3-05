package com.example.demo.global.websocket;

import com.example.demo.room.dto.RoomEvent;
import com.example.demo.room.entity.PlayerInfo;
import com.example.demo.room.game.GameManager;
import com.example.demo.room.repository.PlayerInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

// 소켓이 "끊긴" 순간(탭 닫기·새로고침·네트워크 단절)을 감지해서
// 같은 방 사람들에게 LEAVE를 방송하고, 게임 중이면 이탈 처리까지 위임한다.
// (명시적 leave 버튼을 못 누르고 사라지는 케이스를 커버)
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessagingTemplate messaging;
    private final PlayerInfoRepository playerInfoRepository;
    private final GameManager gameManager;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user == null) return;
        String userId = user.getName();

        for (PlayerInfo p : playerInfoRepository.findAllById_UserId(userId)) {
            Integer roomId = p.getId().getRoomId();
            messaging.convertAndSend("/topic/rooms/" + roomId, RoomEvent.leave(userId));
            gameManager.handlePlayerLeave(roomId, userId);
        }
    }
}
