package com.example.demo.room.dto;

import java.util.Map;

// 클라가 보내는 표정 페이로드 + 서버가 붙이는 보낸이 정보
public record FaceBroadcast(
        String userId,       // 서버가 Principal로 채움 (클라가 보낸 값 안 믿음)
        FacePayload face
) {
    // 프론트 FaceParams와 1:1 대응
    public record FacePayload(
            Map<String, Double> expressions,             // { aa: 0.7, blinkLeft: 0.1, ... }
            HeadRotation headRotation,
            long timestamp
    ) {}

    public record HeadRotation(double x, double y, double z, double w) {}
}
// 의도: 프론트 FaceParams 타입을 그대로 JSON으로 받는 그릇.
// userId는 클라이언트가 보내는 게 아니라 서버가 소켓 세션의 Principal에서 꺼내 붙입니다
// -> 남 이름으로 위장 방송하는 걸 원천 차단.