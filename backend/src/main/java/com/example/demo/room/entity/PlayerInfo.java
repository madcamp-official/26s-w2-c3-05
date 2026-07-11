package com.example.demo.room.entity;

import com.example.demo.user.entity.UserInfo;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// 접속자정보 (방 참여 기록 — 실시간 상태는 서버 메모리에서 관리)
@Entity
@Table(name = "player_info")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@lombok.AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PlayerInfo {

    @EmbeddedId
    private PlayerInfoId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserInfo user;

    @MapsId("roomId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private RoomInfo room;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM) // roletype_t
    @Column(name = "player_role", columnDefinition = "roletype_t")
    @Builder.Default
    private RoleType playerRole = RoleType.NONE;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM) // wintype_t
    @Column(name = "player_result", columnDefinition = "wintype_t")
    @Builder.Default
    private WinType playerResult = WinType.NONE;

    @Column(name = "player_rank")
    private Integer playerRank;
}
