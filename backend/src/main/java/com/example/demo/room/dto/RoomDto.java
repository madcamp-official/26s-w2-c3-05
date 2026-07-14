package com.example.demo.room.dto;

import com.example.demo.room.entity.RoomInfo;

// 방 목록/상세 응답 한 줄
public record RoomDto(
    Integer roomId,
    String roomName,
    String creatorId,
    String creatorNickname,   // 프론트 '전주(殿主)' 표시용
    Integer playerLimit,
    Integer roundLimit,
    Integer timeLimit,
    boolean hasPw,          // 비밀번호 자체는 절대 안 내려줌
    long currentPlayers
) {
    public static RoomDto of(RoomInfo room, long currentPlayers) {
        return new RoomDto(
                room.getRoomId(),
                room.getRoomName(),
                room.getCreator().getUserId(),
                room.getCreator().getUserNickname(),  // LAZY지만 @Transactional 안이라 안전
                room.getPlayerLimit(),
                room.getRoundLimit(),
                room.getTimeLimit(),
                room.getRoomPw() != null,
                currentPlayers
        );
    }
}
