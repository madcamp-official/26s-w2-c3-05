package com.example.demo.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Size(max = 16) String userId,
        @NotBlank @Size(min = 4, max = 20) String userPw,   // 원문 길이 검증(저장은 해시)
        @Size(max = 12) String userNickname
) {}
