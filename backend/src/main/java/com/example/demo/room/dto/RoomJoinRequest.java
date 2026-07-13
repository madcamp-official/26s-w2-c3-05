package com.example.demo.room.dto;

// 방 입장 바디. 공개방이면 roomPw 생략 가능
public record RoomJoinRequest(
    String roomPw
) {}
