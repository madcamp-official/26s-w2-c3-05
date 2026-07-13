package com.example.demo.user.dto;

import com.example.demo.user.entity.RankType;
import com.example.demo.user.entity.Stat;
import com.example.demo.user.entity.UserInfo;

// 마이페이지(전적/프로필 조회 + 닉네임 변경)
// 마이페이지/프로필 응답
public record MyPageResponse(
        String userId,
        String userNickname,
        RankType userRank,
        int userPoint,
        int userWin,
        int userLose,
        int userPlayed,
        int winRate          // 승률(%) 계산값
) {
    public static MyPageResponse of(UserInfo user, Stat stat) {
        int played = stat.getUserPlayed();
        int rate = played == 0 ? 0 : Math.round(stat.getUserWin() * 100f / played);
        return new MyPageResponse(
                user.getUserId(),
                user.getUserNickname(),
                stat.getUserRank(),
                stat.getUserPoint(),
                stat.getUserWin(),
                stat.getUserLose(),
                played,
                rate
        );
    }
}
// 의도: user_info(닉네임)와 stat(전적)을 합쳐 한 응답으로.
// 승률은 DB에 저장 안 하고 조회 시 계산(win/played) — 파생값은 저장 안 하는 게 원칙.