package com.example.demo.friend.dto;

import jakarta.validation.constraints.NotBlank;

// 친구 요청 보내기 바디: 받을 사람 아이디
public record FriendSendRequest(
    @NotBlank String toId
) {}
