package com.example.demo.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// 전적 (user_info와 1:1, PK = FK)
@Entity
@Table(name = "stat")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@lombok.AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Stat {

    @Id
    @Column(name = "user_id", length = 16)
    private String userId;

    // PK를 그대로 FK로 사용
    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserInfo user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM) // PostgreSQL 네이티브 enum(ranktype_t) 바인딩
    @Column(name = "user_rank", nullable = false, columnDefinition = "ranktype_t")
    @Builder.Default
    private RankType userRank = RankType.NONE;

    @Column(name = "user_point", nullable = false)
    @Builder.Default
    private int userPoint = 0;

    @Column(name = "user_win", nullable = false)
    @Builder.Default
    private int userWin = 0;

    @Column(name = "user_lose", nullable = false)
    @Builder.Default
    private int userLose = 0;

    @Column(name = "user_played", nullable = false)
    @Builder.Default
    private int userPlayed = 0;
}
