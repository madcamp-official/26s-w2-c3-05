package com.example.demo.user.dto;

// 유저 검색 결과 한 줄 (벗 찾기)
public record UserSummaryDto(
    String userId,
    String userNickname
) {}
