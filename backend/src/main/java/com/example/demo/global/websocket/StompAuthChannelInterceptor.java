package com.example.demo.global.websocket;

import com.example.demo.global.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // 최초 연결(CONNECT) 프레임에서만 토큰 검사
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new IllegalArgumentException("WebSocket 연결에 토큰이 필요합니다.");
            }
            String userId = jwtProvider.getUserId(header.substring(7)); // 불량 토큰이면 예외 → 연결 거부

            // 이 세션의 주인 등록 → 이후 컨트롤러에서 Principal로 꺼내 씀
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    userId, null, AuthorityUtils.NO_AUTHORITIES));
        }
        return message;
    }

    // 의도: HTTP의 JwtAuthenticationFilter와 같은 역할의 WebSocket 버전입니다.
    // 브라우저 WebSocket은 handshake에 Authorization 헤더를 못 실어서,
    // 대신 STOMP CONNECT 프레임의 헤더로 토큰을 받아 검증합니다.
    // 한 번 통과하면 그 소켓 세션 전체에 유저가 박혀서(setUser)
    // 매 메시지마다 재검증이 필요 없어요.

}