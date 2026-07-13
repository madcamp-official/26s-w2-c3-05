package com.example.demo.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NicknameUpdateRequest (
        @NotBlank @Size(max = 12) String userNickname
) { }
