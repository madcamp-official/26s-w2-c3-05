package com.example.demo.room.dto;

// 게임 채팅 한 줄: 클라는 text만 보내고, 보낸이는 서버가 Principal로 채운다 (위장 방지)
public record ChatBroadcast(
        String userId,
        String text
) {
    // 클라이언트가 보내는 페이로드
    public record ChatText(String text) {}
}
