package com.example.demo.room.dto;

import jakarta.validation.constraints.*;

// 방 생성 바디. roomPw는 없으면 공개방
public record RoomCreateRequest(
        @NotBlank @Size(max = 30) String roomName,
        @NotNull @Min(2) @Max(8) Integer playerLimit,
        @NotNull @Min(1) @Max(10) Integer roundLimit,
        @NotNull @Min(10) @Max(300) Integer timeLimit,
        String roomPw
) {}
