package com.example.demo.friend.dto;

// 친구/요청 목록 응답 한 줄: 상대방 정보
public record FriendDto(
    String userId,
    String userNickname
) {}
