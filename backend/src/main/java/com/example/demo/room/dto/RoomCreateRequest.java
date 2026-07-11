package com.example.demo.room.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// 방 생성 바디. roomPw는 없으면 공개방
public record RoomCreateRequest(
    @NotNull @Min(2) @Max(8) Integer playerLimit,
    @NotNull @Min(1) @Max(10) Integer roundLimit,
    @NotNull @Min(10) @Max(300) Integer timeLimit,   // 초 단위
    String roomPw
) {}
