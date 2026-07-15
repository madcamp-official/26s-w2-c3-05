package com.example.demo.room.dto;

// 방 채널로 방송되는 이벤트 한 건
public record RoomEvent(
        String type,    // "ENTER" | "LEAVE"  (6b~6c에서 종류 추가 예정)
        String userId
) {
    public static RoomEvent enter(String userId) { return new RoomEvent("ENTER", userId); }
    public static RoomEvent leave(String userId) { return new RoomEvent("LEAVE", userId); }
    public static RoomEvent hostChanged(String userId) { return new RoomEvent("HOST_CHANGED", userId); }
}
