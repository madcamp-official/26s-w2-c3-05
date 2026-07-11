package com.example.demo.global.config;

import com.example.demo.global.websocket.StompAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker // STOMP 메시징 활성화
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 클라이언트가 최초 접속하는 주소: ws://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*"); // 개발용. 배포 시 프론트 도메인으로 좁히기
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");              // 서버→클라 방송 채널 접두사
        registry.setApplicationDestinationPrefixes("/app"); // 클라→서버 전송 접두사
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // 들어오는 STOMP 프레임마다 인증 인터셉터 통과
        registration.interceptors(stompAuthChannelInterceptor);
    }

    // 의도: /ws로 소켓을 열고, 이후 모든 메시지는 /app(수신)과 /topic(방송)으로 나눠
    // 흐르게 하는 교통정리. SimpleBroker는 스프링 내장 메모리 브로커라 별도 설치가 필요 없습니다.
}