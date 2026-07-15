package com.example.demo.user.dto;

import com.example.demo.user.entity.RankType;
import com.example.demo.user.entity.Stat;

// 천하(랭킹) 한 줄 — 어점(user_point) 순 정렬
public record RankingDto(
    String userId,
    String userNickname,
    RankType userRank,
    int userPoint,
    int userWin,
    int userLose,
    int userPlayed
) {
    public static RankingDto of(Stat s) {
        return new RankingDto(
            s.getUserId(),
            s.getUser().getUserNickname(),
            s.getUserRank(),
            s.getUserPoint(),
            s.getUserWin(),
            s.getUserLose(),
            s.getUserPlayed()
        );
    }
}
