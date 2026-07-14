package com.example.demo.room.dto;

// 아바타 모션(조아리기 등) 중계: 보낸이는 서버가 Principal로 확정
public record MotionBroadcast(
        String userId,
        String action   // "bow" 등
) {
    // 클라이언트가 보내는 페이로드
    public record MotionPayload(String action) {}
}
